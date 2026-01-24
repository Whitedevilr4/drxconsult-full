import { useState } from 'react';
import { toast } from 'react-toastify';

export default function PdfViewer({ url, filename = 'document', fileType = null }) {
  const [downloading, setDownloading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  // Determine file type from URL or filename
  const getFileType = () => {
    if (fileType) return fileType;
    if (url.includes('data:application/pdf') || filename.toLowerCase().endsWith('.pdf') || url.includes('.pdf')) {
      return 'pdf';
    }
    if (url.includes('data:image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(filename) || /\.(jpg|jpeg|png|gif|webp)/i.test(url)) {
      return 'image';
    }
    return 'unknown';
  };

  const detectedFileType = getFileType();
  const isPdf = detectedFileType === 'pdf';
  const isImage = detectedFileType === 'image';

  // Generate different URLs for different purposes
  const getDownloadUrl = () => {
    if (url.startsWith('data:')) {
      return url; // Data URLs work as-is
    }
    
    // For Supabase URLs, use them directly with download parameter
    if (url.includes('supabase.co')) {
      const urlObj = new URL(url);
      urlObj.searchParams.set('download', filename);
      return urlObj.toString();
    }
    
    // For Cloudinary URLs, use our proxy download route
    if (url.includes('cloudinary.com')) {
      const encodedUrl = encodeURIComponent(url);
      return `${process.env.NEXT_PUBLIC_API_URL}/pdf-proxy/download/${encodedUrl}?filename=${encodeURIComponent(filename)}`;
    }
    
    return url;
  };

  const getViewUrl = () => {
    if (url.startsWith('data:')) {
      return url; // Data URLs work as-is
    }
    
    // For Supabase URLs, use them directly (they're already signed URLs)
    if (url.includes('supabase.co')) {
      return url;
    }
    
    // For Cloudinary URLs, use our proxy route to bypass access issues
    if (url.includes('cloudinary.com')) {
      const encodedUrl = encodeURIComponent(url);
      return `${process.env.NEXT_PUBLIC_API_URL}/pdf-proxy/view/${encodedUrl}`;
    }
    
    return url;
  };

  const handleDownload = async (e) => {
    e.preventDefault();
    setDownloading(true);
    
    try {
      const downloadUrl = getDownloadUrl();
      
      if (url.startsWith('data:')) {
        // For data URLs, create a download link
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('File downloaded successfully');
      } else {
        // For proxy URLs, use direct download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download started');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed. Opening file in new tab instead.');
      // Final fallback: open in new tab
      window.open(getViewUrl(), '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const handleView = (e) => {
    e.preventDefault();
    
    if (isImage) {
      // For images, show preview modal
      setShowPreview(true);
    } else if (isPdf) {
      // For PDFs, show embedded viewer
      setShowPdfViewer(true);
    } else {
      // For unknown file types, just open in new tab
      window.open(getViewUrl(), '_blank');
    }
  };

  const handleDirectOpen = (e) => {
    e.preventDefault();
    const viewUrl = getViewUrl();

    // For PDFs, try multiple viewing strategies
    if (isPdf) {
      // Strategy 1: Direct URL
      const newWindow = window.open(viewUrl, '_blank');
      if (!newWindow) {
        toast.warning('Please allow pop-ups to view the PDF');
        return;
      }
      
      // Strategy 2: If direct doesn't work, try Google Docs Viewer as fallback
      setTimeout(() => {
        try {
          if (newWindow.closed) {
            const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(viewUrl)}&embedded=true`;
            window.open(googleViewerUrl, '_blank');
          }
        } catch (error) {
          console.error('Error with fallback viewer:', error);
        }
      }, 1000);
    } else {
      window.open(viewUrl, '_blank');
    }
  };

  const getFileIcon = () => {
    if (isPdf) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        </svg>
      );
    } else if (isImage) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const getViewButtonText = () => {
    if (isPdf) return 'View PDF';
    if (isImage) return 'View Image';
    return 'View File';
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleView}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm flex items-center gap-2 transition-colors"
        >
          {getFileIcon()}
          {getViewButtonText()}
        </button>
        
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {downloading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Downloading...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download</span>
            </>
          )}
        </button>
        
        <button
          onClick={handleDirectOpen}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-sm flex items-center gap-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open Direct
        </button>
      </div>

      {/* PDF Viewer Modal */}
      {showPdfViewer && isPdf && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative w-full h-full max-w-6xl max-h-full bg-white rounded-lg overflow-hidden">
            <div className="flex justify-between items-center p-4 bg-gray-100 border-b">
              <h3 className="text-lg font-semibold text-gray-800">{filename}</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm disabled:opacity-50"
                >
                  Download
                </button>
                <button
                  onClick={() => setShowPdfViewer(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="w-full h-full" style={{ height: 'calc(100% - 60px)' }}>
              {url.startsWith('data:') ? (
                // For data URLs, use embed
                <embed
                  src={getViewUrl()}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                  className="border-0"
                  onLoad={() => {
                    console.log('PDF loaded successfully');
                  }}
                  onError={() => {
                    console.error('Failed to load PDF');
                    toast.error('Failed to load PDF. Please try downloading instead.');
                  }}
                />
              ) : (
                // For Cloudinary URLs, use multiple strategies
                <div className="w-full h-full relative">
                  {/* Strategy 1: Try PDF.js viewer first */}
                  <iframe
                    src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(getViewUrl())}`}
                    width="100%"
                    height="100%"
                    className="border-0"
                    title={filename}
                    onLoad={() => {
                      console.log('PDF.js viewer loaded');
                    }}
                    onError={(e) => {
                      console.error('PDF.js viewer failed, trying direct');
                      // Fallback to direct iframe
                      const iframe = e.target;
                      if (iframe && iframe.src.includes('pdf.js')) {
                        iframe.src = getViewUrl();
                      }
                    }}
                  />
                  
                  {/* Always show fallback options overlay */}
                  <div className="absolute top-4 right-4 z-10">
                    <div className="bg-white rounded-lg shadow-lg p-2 opacity-90">
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const iframe = document.querySelector(`iframe[title="${filename}"]`);
                            if (iframe) {
                              iframe.src = getViewUrl();
                            }
                          }}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                          title="Try direct PDF view"
                        >
                          Direct View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const googleUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(getViewUrl())}&embedded=true`;
                            const iframe = document.querySelector(`iframe[title="${filename}"]`);
                            if (iframe) {
                              iframe.src = googleUrl;
                            }
                          }}
                          className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                          title="Try Google Docs Viewer"
                        >
                          Google View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(getViewUrl(), '_blank');
                          }}
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                          title="Open in new tab"
                        >
                          New Tab
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Main fallback message - shows when hovering */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 opacity-0 hover:opacity-95 transition-opacity pointer-events-none">
                    <div className="text-center p-6 bg-white rounded-lg shadow-lg pointer-events-auto max-w-md">
                      <p className="text-gray-600 mb-4 font-medium">PDF not displaying properly?</p>
                      <p className="text-sm text-gray-500 mb-4">Try these alternative viewing methods:</p>
                      <div className="space-y-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDirectOpen(e);
                          }}
                          className="block w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                          📄 Open in New Tab
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(e);
                          }}
                          className="block w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                        >
                          💾 Download PDF
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const googleUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(getViewUrl())}&embedded=true`;
                            window.open(googleUrl, '_blank');
                          }}
                          className="block w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                        >
                          🔍 Google Docs Viewer
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-3">
                        Some PDFs may not display due to browser security settings
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {showPreview && isImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={getViewUrl()}
              alt={filename}
              className="max-w-full max-h-full object-contain rounded-lg"
              onError={() => {
                toast.error('Failed to load image');
                setShowPreview(false);
              }}
            />
            <div className="absolute bottom-4 left-4 right-4 text-center">
              <p className="text-white bg-black bg-opacity-50 rounded px-3 py-1 text-sm">
                {filename}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}