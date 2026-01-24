import { useState } from 'react';
import { toast } from 'react-toastify';

export default function SimplePdfViewer({ url, filename = 'document' }) {
  const [viewMethod, setViewMethod] = useState('object'); // object, embed, iframe, google

  // Generate proxy URL for Cloudinary PDFs
  const getProxyUrl = () => {
    if (url.startsWith('data:')) {
      return url; // Data URLs work as-is
    }
    
    // For Supabase URLs, use them directly (they're already signed URLs)
    if (url.includes('supabase.co')) {
      return url;
    }
    
    if (url.includes('cloudinary.com')) {
      const encodedUrl = encodeURIComponent(url);
      return `${process.env.NEXT_PUBLIC_API_URL}/pdf-proxy/view/${encodedUrl}`;
    }
    
    return url;
  };

  const getDownloadUrl = () => {
    if (url.startsWith('data:')) {
      return url;
    }
    
    // For Supabase URLs, use them directly with download parameter
    if (url.includes('supabase.co')) {
      const urlObj = new URL(url);
      urlObj.searchParams.set('download', filename);
      return urlObj.toString();
    }
    
    if (url.includes('cloudinary.com')) {
      const encodedUrl = encodeURIComponent(url);
      return `${process.env.NEXT_PUBLIC_API_URL}/pdf-proxy/download/${encodedUrl}?filename=${encodeURIComponent(filename)}`;
    }
    
    return url;
  };

  const handleDownload = async () => {
    try {
      const downloadUrl = getDownloadUrl();
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed');
    }
  };

  const renderPdfViewer = () => {
    const proxyUrl = getProxyUrl();
    const commonProps = {
      width: '100%',
      height: '100%',
      style: { minHeight: '600px' }
    };

    switch (viewMethod) {
      case 'object':
        return (
          <object
            data={proxyUrl}
            type="application/pdf"
            {...commonProps}
          >
            <p>Your browser doesn't support PDF viewing. 
              <button onClick={() => setViewMethod('embed')} className="text-blue-600 underline ml-1">
                Try embed method
              </button>
            </p>
          </object>
        );
      
      case 'embed':
        return (
          <embed
            src={proxyUrl}
            type="application/pdf"
            {...commonProps}
          />
        );
      
      case 'iframe':
        return (
          <iframe
            src={proxyUrl}
            title={filename}
            {...commonProps}
          />
        );
      
      case 'google':
        return (
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(proxyUrl)}&embedded=true`}
            title={filename}
            {...commonProps}
          />
        );
      
      default:
        return <div>Unknown view method</div>;
    }
  };

  return (
    <div className="w-full h-full bg-gray-100 rounded-lg overflow-hidden">
      {/* Controls */}
      <div className="bg-white border-b p-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">View Method:</span>
          <select
            value={viewMethod}
            onChange={(e) => setViewMethod(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="object">Object Tag</option>
            <option value="embed">Embed Tag</option>
            <option value="iframe">Direct Iframe</option>
            <option value="google">Google Docs Viewer</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownload}
            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
          >
            Download
          </button>
          <button
            onClick={() => window.open(getProxyUrl(), '_blank')}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
          >
            Open in New Tab
          </button>
        </div>
      </div>
      
      {/* PDF Viewer */}
      <div className="w-full" style={{ height: 'calc(100% - 60px)' }}>
        {renderPdfViewer()}
      </div>
      
      {/* Fallback message */}
      <div className="p-4 text-center text-gray-600 text-sm">
        <p>If the PDF doesn't display, try switching the view method above or use the download/open buttons.</p>
      </div>
    </div>
  );
}