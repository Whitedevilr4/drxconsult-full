const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { auth } = require('../middleware/auth');
const { uploadPdfToSupabase, generateSignedUrl } = require('../utils/supabaseStorage');

const router = express.Router();

// Configure Cloudinary for images
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();

// Separate multer configurations for different file types
const imageUpload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Accept only images for prescription uploads
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for prescriptions'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for images
  }
});

const pdfUpload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Accept only PDFs
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for PDFs
  }
});

// Upload prescription images to Cloudinary
router.post('/prescription', auth, imageUpload.single('file'), async (req, res) => {
  try {

    if (!req.file) {
      
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if Cloudinary is configured
    const isCloudinaryConfigured = 
      process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET;

    if (!isCloudinaryConfigured) {

      // Demo mode - convert file to base64 data URL
      const base64 = req.file.buffer.toString('base64');
      const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
      
      return res.json({ 
        url: dataUrl,
        filename: req.file.originalname,
        size: req.file.size,
        demo: true,
        message: 'Demo mode: File stored as data URL. Configure Cloudinary for production.'
      });
    }

    // Upload image to Cloudinary with optimizations
    const uploadOptions = {
      resource_type: 'image',
      folder: 'patient-counselling/prescriptions',
      public_id: `prescription_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transformation: [
        { width: 1200, height: 1600, crop: 'limit', quality: 'auto' },
        { fetch_format: 'auto' }
      ],
      access_mode: 'public',
      type: 'upload'
    };

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            
            resolve(result);
          }
        }
      );
      uploadStream.end(req.file.buffer);
    });

    res.json({ 
      url: result.secure_url,
      publicId: result.public_id,
      filename: req.file.originalname,
      size: req.file.size,
      resourceType: 'image',
      format: result.format,
      type: 'prescription',
      storage: 'cloudinary'
    });

  } catch (err) {
    console.error('Prescription upload error:', err);
    
    let errorMessage = 'Upload failed. Please try again.';
    if (err.message.includes('Only image files')) {
      errorMessage = 'Invalid file format. Please upload an image file (JPEG, PNG, GIF, WebP).';
    } else if (err.message.includes('File size too large')) {
      errorMessage = 'File size too large. Maximum size is 5MB for images.';
    }
    
    res.status(500).json({ 
      message: errorMessage, 
      error: err.message
    });
  }
});

// Upload PDF files to Supabase Storage
router.post('/pdf', auth, pdfUpload.single('file'), async (req, res) => {
  try {

    if (!req.file) {
      
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Determine bucket and folder based on request context
    const { type = 'general' } = req.body;
    let bucketName = 'pdfs';
    let folder = '';

    switch (type) {
      case 'report':
        bucketName = 'reports';
        folder = 'medical-reports';
        break;
      case 'prescription':
        bucketName = 'pdfs';
        folder = 'prescriptions';
        break;
      case 'document':
        bucketName = 'pdfs';
        folder = 'documents';
        break;
      default:
        bucketName = 'pdfs';
        folder = 'general';
    }

    // Upload to Supabase Storage
    const uploadResult = await uploadPdfToSupabase(req.file, bucketName, folder);

    if (!uploadResult.success) {
      throw new Error(uploadResult.error);
    }

    // Generate signed URL for immediate access (1 hour expiry)
    const signedUrlResult = await generateSignedUrl(uploadResult.data.path, bucketName, 60 * 60 * 24 * 30 );

    res.json({ 
      url: signedUrlResult.success ? signedUrlResult.signedUrl : uploadResult.data.publicUrl,
      path: uploadResult.data.path,
      filename: uploadResult.data.originalName,
      size: uploadResult.data.size,
      bucket: bucketName,
      folder: folder,
      type: type,
      storage: 'supabase',
      signedUrl: signedUrlResult.success ? signedUrlResult.signedUrl : null,
      expiresAt: signedUrlResult.success ? signedUrlResult.expiresAt : null
    });

  } catch (err) {
    console.error('PDF upload error:', err);
    
    let errorMessage = 'PDF upload failed. Please try again.';
    if (err.message.includes('Only PDF files')) {
      errorMessage = 'Invalid file format. Please upload a PDF file.';
    } else if (err.message.includes('File size too large')) {
      errorMessage = 'File size too large. Maximum size is 10MB for PDFs.';
    } else if (err.message.includes('Supabase not configured')) {
      errorMessage = 'Storage service not configured. Please contact support.';
    }
    
    res.status(500).json({ 
      message: errorMessage, 
      error: err.message
    });
  }
});

// Generate new signed URL for existing PDF
router.post('/pdf/signed-url', auth, async (req, res) => {
  try {
    const { path, bucket = 'pdfs', expiresIn = 3600 } = req.body;

    if (!path) {
      return res.status(400).json({ message: 'File path is required' });
    }

    const result = await generateSignedUrl(path, bucket, expiresIn);

    if (!result.success) {
      throw new Error(result.error);
    }

    res.json({
      signedUrl: result.signedUrl,
      expiresAt: result.expiresAt,
      path: path,
      bucket: bucket
    });

  } catch (err) {
    console.error('Signed URL generation error:', err);
    res.status(500).json({ 
      message: 'Failed to generate signed URL', 
      error: err.message 
    });
  }
});

// Health check endpoint
router.get('/health', auth, (req, res) => {
  const isCloudinaryConfigured = 
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  const isSupabaseConfigured = 
    process.env.SUPABASE_URL && 
    process.env.SUPABASE_SERVICE_ROLE_KEY;
    
  res.json({
    cloudinaryConfigured: isCloudinaryConfigured,
    supabaseConfigured: isSupabaseConfigured,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'Not configured',
    supabaseUrl: process.env.SUPABASE_URL ? 'Configured' : 'Not configured',
    services: {
      prescriptions: isCloudinaryConfigured ? 'cloudinary' : 'demo',
      pdfs: isSupabaseConfigured ? 'supabase' : 'not_configured'
    }
  });
});

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Upload error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Check size limits for your file type.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Unexpected file field. Please use "file" field name.' });
    }
    return res.status(400).json({ message: 'File upload error', error: err.message });
  }
  
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  
  next();
});

module.exports = router;
