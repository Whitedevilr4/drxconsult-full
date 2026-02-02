import { useState } from 'react';
import axios from '@/lib/axios';
import { toast } from 'react-toastify';

const HealthReportDownload = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadReport = async () => {
    try {
      setIsGenerating(true);
      
      const response = await axios.get('/health-report/download', {
        responseType: 'arraybuffer', // Use arraybuffer instead of blob for better control
        headers: {
          'Accept': 'application/pdf'
        }
      });

      // Validate response
      if (!response.data || response.data.byteLength === 0) {
        throw new Error('Empty PDF received');
      }
      
      console.log('PDF received, size:', response.data.byteLength);
      
      // Validate PDF header
      const uint8Array = new Uint8Array(response.data);
      const pdfHeader = uint8Array.slice(0, 4);
      const isValidPDF = pdfHeader[0] === 0x25 && pdfHeader[1] === 0x50 && pdfHeader[2] === 0x44 && pdfHeader[3] === 0x46; // %PDF
      
      if (!isValidPDF) {
        console.error('Invalid PDF header in response');
        throw new Error('Received file is not a valid PDF');
      }
      
      // Create blob with proper MIME type
      const pdfBlob = new Blob([response.data], { 
        type: 'application/pdf'
      });
      
      // Verify blob was created successfully
      if (pdfBlob.size === 0) {
        throw new Error('Failed to create PDF blob');
      }
      
      console.log('PDF blob created, size:', pdfBlob.size);
      
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `health-report-${currentDate}.pdf`);
      
      // Append to document body
      document.body.appendChild(link);
      
      // Start download
      link.click();
      
      // Clean up and remove the link
      document.body.removeChild(link);
      
      // Clean up URL after a delay to ensure download starts
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 2000);
      
      toast.success('Health report downloaded successfully! Check your downloads folder.');
      
    } catch (error) {
      console.error('Error downloading health report:', error);
      if (error.response?.status === 404) {
        toast.error('No health data found to generate report.');
      } else if (error.response?.status === 500) {
        toast.error('Server error generating report. Please try again later.');
      } else if (error.message?.includes('PDF')) {
        toast.error('PDF file is corrupted. Please try again or contact support.');
      } else {
        toast.error('Failed to download health report. Please check your internet connection and try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewReport = async () => {
    try {
      setIsGenerating(true);
      
      const response = await axios.get('/health-report/download', {
        responseType: 'arraybuffer', // Use arraybuffer for better control
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      // Check if response is valid
      if (!response.data || response.data.byteLength === 0) {
        throw new Error('Empty PDF received');
      }
      
      console.log('PDF received for preview, size:', response.data.byteLength);
      
      // Verify it's actually a PDF
      const uint8Array = new Uint8Array(response.data);
      const pdfSignature = uint8Array.slice(0, 4);
      const isPDF = pdfSignature[0] === 0x25 && pdfSignature[1] === 0x50 && pdfSignature[2] === 0x44 && pdfSignature[3] === 0x46; // %PDF
      
      if (!isPDF) {
        // If it's not a PDF, it might be HTML fallback
        const text = new TextDecoder().decode(uint8Array);
        if (text.includes('<!DOCTYPE html>')) {
          // Open HTML in new window
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.document.write(text);
            newWindow.document.close();
            newWindow.document.title = 'Health Report (HTML Format)';
          } else {
            toast.warning('Popup blocked. Please allow popups for this site.');
          }
          return;
        } else {
          throw new Error('Invalid file format received');
        }
      }
      
      // Create blob URL for PDF with proper type
      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      
      // Verify blob creation
      if (pdfBlob.size === 0) {
        throw new Error('Failed to create PDF blob for preview');
      }
      
      const pdfUrl = window.URL.createObjectURL(pdfBlob);
      
      console.log('PDF blob created for preview, size:', pdfBlob.size);
      
      // Try to open PDF in new window/tab
      const newWindow = window.open('', '_blank');
      
      if (!newWindow) {
        // If popup blocked, fallback to download
        toast.warning('Popup blocked by browser. Downloading PDF instead.');
        const link = document.createElement('a');
        link.href = pdfUrl;
        const currentDate = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `health-report-preview-${currentDate}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(pdfUrl);
      } else {
        // Set up the new window with PDF viewer
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Health Report Preview - DrXConsult.in</title>
            <meta charset="UTF-8">
            <style>
              body { 
                margin: 0; 
                padding: 0; 
                background: #2c2c2c; 
                font-family: Arial, sans-serif;
                overflow: hidden;
              }
              .header {
                background: #1f1f1f;
                color: white;
                padding: 10px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #444;
              }
              .title {
                font-size: 16px;
                font-weight: 500;
              }
              .close-btn {
                background: #ff4444;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
              }
              .close-btn:hover {
                background: #ff6666;
              }
              .pdf-container {
                height: calc(100vh - 50px);
                width: 100%;
                position: relative;
              }
              iframe { 
                width: 100%; 
                height: 100%; 
                border: none; 
                background: white;
              }
              .loading { 
                position: absolute; 
                top: 50%; 
                left: 50%; 
                transform: translate(-50%, -50%);
                color: #ccc;
                font-size: 16px;
                display: flex;
                align-items: center;
                gap: 10px;
              }
              .spinner {
                width: 20px;
                height: 20px;
                border: 2px solid #444;
                border-top: 2px solid #fff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              .error {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: #ff6666;
                text-align: center;
                padding: 20px;
              }
              .error button {
                background: #4CAF50;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 10px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">Health Report Preview</div>
              <button class="close-btn" onclick="window.close()">Close</button>
            </div>
            <div class="pdf-container">
              <div class="loading" id="loading">
                <div class="spinner"></div>
                Loading PDF...
              </div>
              <div class="error" id="error" style="display: none;">
                <h3>Failed to load PDF</h3>
                <p>The PDF could not be displayed in your browser.</p>
                <button onclick="downloadPDF()">Download PDF Instead</button>
              </div>
              <iframe id="pdfFrame" src="${pdfUrl}" style="display: none;"></iframe>
            </div>
            <script>
              const iframe = document.getElementById('pdfFrame');
              const loading = document.getElementById('loading');
              const error = document.getElementById('error');
              
              let loadTimeout = setTimeout(() => {
                loading.style.display = 'none';
                error.style.display = 'block';
              }, 10000); // 10 second timeout
              
              iframe.onload = function() {
                clearTimeout(loadTimeout);
                loading.style.display = 'none';
                iframe.style.display = 'block';
              };
              
              iframe.onerror = function() {
                clearTimeout(loadTimeout);
                loading.style.display = 'none';
                error.style.display = 'block';
              };
              
              function downloadPDF() {
                const link = document.createElement('a');
                link.href = '${pdfUrl}';
                link.download = 'health-report-${new Date().toISOString().split('T')[0]}.pdf';
                link.click();
              }
              
              // Clean up URL when window closes
              window.addEventListener('beforeunload', function() {
                URL.revokeObjectURL('${pdfUrl}');
              });
            </script>
          </body>
          </html>
        `);
        newWindow.document.close();
        
        // Clean up URL after a longer delay for the new window
        setTimeout(() => {
          window.URL.revokeObjectURL(pdfUrl);
        }, 30000); // 30 seconds
      }
      
    } catch (error) {
      console.error('Error previewing health report:', error);
      if (error.response?.status === 404) {
        toast.error('No health data found to generate report.');
      } else if (error.response?.status === 500) {
        toast.error('Server error generating report. Please try again later.');
      } else {
        toast.error('Failed to preview health report. Please try downloading instead.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewInBrowser = async () => {
    try {
      setIsGenerating(true);
      
      const response = await axios.get('/health-report/download', {
        responseType: 'arraybuffer', // Use arraybuffer for better control
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      // Check if response is valid
      if (!response.data || response.data.byteLength === 0) {
        throw new Error('Empty response received');
      }
      
      console.log('PDF received for view, size:', response.data.byteLength);
      
      // Check content type to determine if it's PDF or HTML
      const contentType = response.headers['content-type'] || '';
      const isHTML = contentType.includes('text/html');
      
      if (isHTML) {
        // Handle HTML fallback
        const text = new TextDecoder().decode(response.data);
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(text);
          newWindow.document.close();
          newWindow.document.title = 'Health Report (HTML Format)';
        } else {
          toast.warning('Popup blocked. Please allow popups for this site.');
        }
        return;
      }
      
      // Validate PDF header
      const uint8Array = new Uint8Array(response.data);
      const pdfSignature = uint8Array.slice(0, 4);
      const hasPDFSignature = pdfSignature[0] === 0x25 && pdfSignature[1] === 0x50 && pdfSignature[2] === 0x44 && pdfSignature[3] === 0x46; // %PDF
      
      if (!hasPDFSignature) {
        // It's likely HTML content
        const text = new TextDecoder().decode(uint8Array);
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(text);
          newWindow.document.close();
          newWindow.document.title = 'Health Report';
        } else {
          toast.warning('Popup blocked. Please allow popups for this site.');
        }
        return;
      }
      
      // Handle PDF content
      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      
      // Verify blob creation
      if (pdfBlob.size === 0) {
        throw new Error('Failed to create PDF blob');
      }
      
      console.log('PDF blob created for view, size:', pdfBlob.size);
      
      const pdfUrl = window.URL.createObjectURL(pdfBlob);
      
      // Create modal overlay
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
      `;
      
      // Create iframe container
      const container = document.createElement('div');
      container.style.cssText = `
        width: 100%;
        height: 100%;
        max-width: 1200px;
        max-height: 90vh;
        background: white;
        border-radius: 8px;
        position: relative;
        display: flex;
        flex-direction: column;
      `;
      
      // Create header with close button
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
        border-radius: 8px 8px 0 0;
      `;
      
      const title = document.createElement('h3');
      title.textContent = 'Health Report Preview';
      title.style.cssText = `
        margin: 0;
        color: #1f2937;
        font-size: 18px;
        font-weight: 600;
      `;
      
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '✕';
      closeButton.style.cssText = `
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #6b7280;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      `;
      
      closeButton.onmouseover = () => {
        closeButton.style.background = '#f3f4f6';
        closeButton.style.color = '#374151';
      };
      
      closeButton.onmouseout = () => {
        closeButton.style.background = 'none';
        closeButton.style.color = '#6b7280';
      };
      
      // Create iframe for PDF
      const iframe = document.createElement('iframe');
      iframe.src = pdfUrl;
      iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        flex: 1;
        border-radius: 0 0 8px 8px;
      `;
      
      // Create loading indicator
      const loading = document.createElement('div');
      loading.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #6b7280;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 10px;
      `;
      loading.innerHTML = `
        <div style="
          width: 20px;
          height: 20px;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
        Loading PDF...
      `;
      
      // Create error message
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #ef4444;
        text-align: center;
        padding: 20px;
        display: none;
      `;
      errorDiv.innerHTML = `
        <h3 style="margin-top: 0;">PDF Loading Failed</h3>
        <p>The PDF could not be displayed in your browser.</p>
        <button onclick="downloadPDF()" style="
          background: #10b981;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          margin-top: 10px;
        ">Download PDF Instead</button>
      `;
      
      // Add CSS animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
      
      // Handle iframe load events
      let loadTimeout = setTimeout(() => {
        loading.style.display = 'none';
        errorDiv.style.display = 'block';
      }, 15000); // 15 second timeout
      
      iframe.onload = () => {
        clearTimeout(loadTimeout);
        loading.style.display = 'none';
      };
      
      iframe.onerror = () => {
        clearTimeout(loadTimeout);
        loading.style.display = 'none';
        errorDiv.style.display = 'block';
      };
      
      // Global download function
      window.downloadPDF = () => {
        const link = document.createElement('a');
        link.href = pdfUrl;
        const currentDate = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `health-report-${currentDate}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        closeModal();
      };
      
      // Close modal function
      const closeModal = () => {
        document.body.removeChild(modal);
        document.head.removeChild(style);
        window.URL.revokeObjectURL(pdfUrl);
        delete window.downloadPDF;
      };
      
      closeButton.onclick = closeModal;
      
      // Close on background click
      modal.onclick = (e) => {
        if (e.target === modal) {
          closeModal();
        }
      };
      
      // Close on Escape key
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          closeModal();
          document.removeEventListener('keydown', handleKeyDown);
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      
      // Assemble modal
      header.appendChild(title);
      header.appendChild(closeButton);
      container.appendChild(header);
      container.appendChild(iframe);
      container.appendChild(loading);
      container.appendChild(errorDiv);
      modal.appendChild(container);
      document.body.appendChild(modal);
      
    } catch (error) {
      console.error('Error viewing health report:', error);
      if (error.response?.status === 404) {
        toast.error('No health data found to generate report.');
      } else {
        toast.error('Failed to view health report. Please try downloading instead.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-blue-800 mb-2 flex items-center">
            📄 Health Report
          </h3>
          <p className="text-blue-700 text-sm mb-4">
            Download a comprehensive PDF report of all your health tracking data. 
            Perfect for sharing with healthcare providers or keeping personal records.
          </p>
          <div className="text-xs text-blue-600 bg-blue-100 rounded-lg p-3">
            <strong>Report includes:</strong> Vaccination records, blood pressure readings, diabetes tracking, 
            sleep patterns, mood analysis, medication adherence, and more.
          </div>
        </div>
        
        <div className="ml-6 flex flex-col space-y-3">
          <button
            onClick={handleViewInBrowser}
            disabled={isGenerating}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Loading...</span>
              </>
            ) : (
              <>
                <span>🖥️</span>
                <span>View in Browser</span>
              </>
            )}
          </button>
          
          <button
            onClick={handlePreviewReport}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <span>👁️</span>
                <span>Preview Report</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleDownloadReport}
            disabled={isGenerating}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <span>📥</span>
                <span>Download Report</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-blue-200">
        <div className="flex items-center text-xs text-blue-600">
          <span className="mr-2">ℹ️</span>
          <span>
            Report generated by <strong>DrXConsult.in</strong> • 
            All data is self-reported by patient • 
            For medical advice, consult healthcare professionals
          </span>
        </div>
      </div>
    </div>
  );
};

export default HealthReportDownload;