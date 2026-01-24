const express = require('express');
const https = require('https');
const http = require('http');
const { auth } = require('../middleware/auth');

const router = express.Router();

// PDF Proxy route - serves PDFs through our backend to bypass CORS/access issues
router.get('/view/:encodedUrl', auth, (req, res) => {
  try {
    const pdfUrl = decodeURIComponent(req.params.encodedUrl);

    // Validate URL
    if (!pdfUrl.startsWith('https://res.cloudinary.com/')) {
      return res.status(400).json({ error: 'Invalid PDF URL' });
    }
    
    // Choose http or https based on URL
    const client = pdfUrl.startsWith('https://') ? https : http;
    
    const request = client.get(pdfUrl, (proxyRes) => {

      // Set proper headers for PDF viewing
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      // If Cloudinary returns an error, handle it
      if (proxyRes.statusCode !== 200) {
        console.error('Cloudinary error:', proxyRes.statusCode);
        return res.status(proxyRes.statusCode).json({ 
          error: 'Failed to fetch PDF from Cloudinary',
          status: proxyRes.statusCode 
        });
      }
      
      // Pipe the PDF content through our server
      proxyRes.pipe(res);
    });
    
    request.on('error', (error) => {
      console.error('Proxy request error:', error);
      res.status(500).json({ error: 'Failed to fetch PDF', details: error.message });
    });
    
    request.setTimeout(30000, () => {
      console.error('Proxy request timeout');
      res.status(504).json({ error: 'PDF request timeout' });
    });
    
  } catch (error) {
    console.error('PDF proxy error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// PDF download route
router.get('/download/:encodedUrl', auth, (req, res) => {
  try {
    const pdfUrl = decodeURIComponent(req.params.encodedUrl);
    const filename = req.query.filename || 'document.pdf';

    // Validate URL
    if (!pdfUrl.startsWith('https://res.cloudinary.com/')) {
      return res.status(400).json({ error: 'Invalid PDF URL' });
    }
    
    const client = pdfUrl.startsWith('https://') ? https : http;
    
    const request = client.get(pdfUrl, (proxyRes) => {
      // Set headers for download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      if (proxyRes.statusCode !== 200) {
        return res.status(proxyRes.statusCode).json({ 
          error: 'Failed to fetch PDF for download',
          status: proxyRes.statusCode 
        });
      }
      
      proxyRes.pipe(res);
    });
    
    request.on('error', (error) => {
      console.error('Download proxy error:', error);
      res.status(500).json({ error: 'Failed to download PDF', details: error.message });
    });
    
  } catch (error) {
    console.error('PDF download proxy error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;