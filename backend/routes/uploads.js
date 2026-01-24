const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { auth } = require('../middleware/auth');

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Accept PDF files and images
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

router.post('/', auth, upload.single('file'), async (req, res) => {
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

    // Determine resource type and upload options based on file mimetype
    const isPdf = req.file.mimetype === 'application/pdf';
    
    let uploadOptions;
    if (isPdf) {
      // For PDFs, use 'auto' resource type with public access
      uploadOptions = { 
        resource_type: 'auto',
        folder: 'patient-counselling/prescriptions',
        public_id: `prescription_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        // Ensure public access
        access_mode: 'public',
        type: 'upload',
        // Add these for better PDF handling
        use_filename: true,
        unique_filename: false,
        overwrite: true,
        // Force proper content type
        context: {
          content_type: 'application/pdf'
        }
      };
    } else {
      // For images, use 'image' resource type with transformations
      uploadOptions = {
        resource_type: 'image',
        folder: 'patient-counselling/prescriptions',
        public_id: `prescription_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        transformation: [
          { width: 1200, height: 1600, crop: 'limit', quality: 'auto' },
          { fetch_format: 'auto' }
        ],
        access_mode: 'public',
        type: 'upload'
      };
    }

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

    // Return clean URLs without problematic flags
    res.json({ 
      url: result.secure_url,
      publicId: result.public_id,
      filename: req.file.originalname,
      size: req.file.size,
      resourceType: result.resource_type || (isPdf ? 'auto' : 'image'),
      format: result.format,
      originalUrl: result.secure_url,
      // Provide clean URLs for different use cases
      viewUrl: result.secure_url,
      downloadUrl: result.secure_url
    });
  } catch (err) {
    console.error('Upload error:', err);
    
    // Provide more specific error messages
    let errorMessage = 'Upload failed. Please try again.';
    if (err.message.includes('Invalid image file')) {
      errorMessage = 'Invalid file format. Please upload a PDF or image file.';
    } else if (err.message.includes('File size too large')) {
      errorMessage = 'File size too large. Maximum size is 10MB.';
    } else if (err.message.includes('Invalid API key')) {
      errorMessage = 'Upload service configuration error. Please contact support.';
    }
    
    res.status(500).json({ 
      message: errorMessage, 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Health check endpoint for Cloudinary configuration
router.get('/health', auth, (req, res) => {
  const isConfigured = 
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;
    
  res.json({
    cloudinaryConfigured: isConfigured,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'Not configured',
    status: isConfigured ? 'ready' : 'demo_mode'
  });
});

// Error handling middleware for multer
router.use((err, req, res, next) => {
  console.error('Multer error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
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