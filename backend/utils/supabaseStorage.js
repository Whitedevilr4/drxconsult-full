const { supabase } = require('../config/supabase');
const path = require('path');
const fs = require('fs');

/**
 * Upload PDF file to Supabase Storage
 */
const uploadPdfToSupabase = async (file, bucketName = 'pdfs', folder = '') => {
  try {
    if (!supabase) {
      throw new Error('Supabase not configured. Please add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your environment variables.');
    }

    if (!file) {
      throw new Error('No file provided');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(file.originalname);
    const fileName = `${timestamp}_${randomString}${fileExtension}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    // Read file buffer
    let fileBuffer;
    if (file.buffer) {
      fileBuffer = file.buffer;
    } else if (file.path) {
      fileBuffer = fs.readFileSync(file.path);
    } else {
      throw new Error('Invalid file format');
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType: file.mimetype || 'application/pdf',
        duplex: 'half'
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL (for signed URLs, we'll generate them when needed)
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return {
      success: true,
      data: {
        path: filePath,
        fullPath: data.path,
        publicUrl: urlData.publicUrl,
        bucket: bucketName,
        fileName: fileName,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      }
    };

  } catch (error) {
    console.error('PDF upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate signed URL for private PDF access
 */
const generateSignedUrl = async (filePath, bucketName = 'pdfs', expiresIn = 3600) => {
  try {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }

    return {
      success: true,
      signedUrl: data.signedUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000)
    };

  } catch (error) {
    console.error('Signed URL generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete PDF from Supabase Storage
 */
const deletePdfFromSupabase = async (filePath, bucketName = 'pdfs') => {
  try {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }

    return {
      success: true,
      data: data
    };

  } catch (error) {
    console.error('PDF deletion error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * List files in a bucket
 */
const listFiles = async (bucketName = 'pdfs', folder = '', limit = 100) => {
  try {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(folder, {
        limit: limit,
        offset: 0
      });

    if (error) {
      throw new Error(`List files failed: ${error.message}`);
    }

    return {
      success: true,
      files: data
    };

  } catch (error) {
    console.error('List files error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get file info
 */
const getFileInfo = async (filePath, bucketName = 'pdfs') => {
  try {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase.storage
      .from(bucketName)
      .list('', {
        search: path.basename(filePath)
      });

    if (error) {
      throw new Error(`Get file info failed: ${error.message}`);
    }

    const fileInfo = data.find(file => file.name === path.basename(filePath));

    return {
      success: true,
      fileInfo: fileInfo
    };

  } catch (error) {
    console.error('Get file info error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Download file from Supabase Storage
 */
const downloadPdfFromSupabase = async (filePath, bucketName = 'pdfs') => {
  try {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(filePath);

    if (error) {
      throw new Error(`Download failed: ${error.message}`);
    }

    return {
      success: true,
      data: data,
      buffer: Buffer.from(await data.arrayBuffer())
    };

  } catch (error) {
    console.error('PDF download error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  uploadPdfToSupabase,
  generateSignedUrl,
  deletePdfFromSupabase,
  listFiles,
  getFileInfo,
  downloadPdfFromSupabase
};
