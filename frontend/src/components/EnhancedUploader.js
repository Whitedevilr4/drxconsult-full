import { useState } from 'react'
import axios from 'axios'

export default function EnhancedUploader({ 
  onUploadSuccess, 
  uploadType = 'prescription', // 'prescription', 'pdf', 'report'
  label = "Upload File", 
  description = "Select file to upload"
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Configuration based on upload type
  const getUploadConfig = (type) => {
    switch (type) {
      case 'prescription':
        return {
          accept: '.jpg,.jpeg,.png,.gif,.webp,image/*',
          allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
          maxSize: 5 * 1024 * 1024, // 5MB
          endpoint: '/uploads-v2/prescription',
          description: 'Upload prescription image (JPG, PNG, GIF, WebP - max 5MB)',
          storage: 'cloudinary'
        }
      case 'pdf':
      case 'report':
      case 'document':
        return {
          accept: '.pdf,application/pdf',
          allowedTypes: ['application/pdf'],
          maxSize: 10 * 1024 * 1024, // 10MB
          endpoint: '/uploads-v2/pdf',
          description: 'Upload PDF document (max 10MB)',
          storage: 'supabase'
        }
      default:
        return {
          accept: '.pdf,.jpg,.jpeg,.png,image/*,application/pdf',
          allowedTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
          maxSize: 10 * 1024 * 1024, // 10MB
          endpoint: '/uploads',
          description: 'PDF or image files (max 10MB)',
          storage: 'mixed'
        }
    }
  }

  const config = getUploadConfig(uploadType)

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!config.allowedTypes.includes(file.type)) {
        const typeNames = config.allowedTypes.map(type => {
          if (type === 'application/pdf') return 'PDF'
          if (type.startsWith('image/')) return type.split('/')[1].toUpperCase()
          return type
        }).join(', ')
        setError(`Please select a ${typeNames} file`)
        setSelectedFile(null)
        return
      }
      
      // Validate file size
      if (file.size > config.maxSize) {
        const sizeMB = Math.round(config.maxSize / (1024 * 1024))
        setError(`File size must be less than ${sizeMB}MB`)
        setSelectedFile(null)
        return
      }
      
      setError('')
      setSelectedFile(file)
      setUploadProgress(0)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first')
      return
    }

    setUploading(true)
    setError('')
    setUploadProgress(0)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) {
        setError('Please login to upload files')
        setUploading(false)
        return
      }

      const formData = new FormData()
      formData.append('file', selectedFile)
      
      // Add type for PDF uploads
      if (config.storage === 'supabase') {
        formData.append('type', uploadType)
      }

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}${config.endpoint}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setUploadProgress(progress)
          }
        }
      )

      // Call success callback with enhanced data
      onUploadSuccess({
        url: res.data.url,
        filename: res.data.filename,
        originalName: selectedFile.name,
        size: selectedFile.size,
        type: uploadType,
        storage: res.data.storage || config.storage,
        path: res.data.path,
        bucket: res.data.bucket,
        signedUrl: res.data.signedUrl,
        expiresAt: res.data.expiresAt,
        ...res.data
      })
      
      // Reset form
      setSelectedFile(null)
      setUploadProgress(0)
      
      // Reset file input
      const fileInput = document.getElementById(`file-upload-${uploadType}`)
      if (fileInput) fileInput.value = ''
      
    } catch (err) {
      console.error('Upload error:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Upload failed. Please try again.'
      setError(errorMessage)
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const getFileIcon = (file) => {
    if (file.type === 'application/pdf') {
      return (
        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        </svg>
      )
    } else if (file.type.startsWith('image/')) {
      return (
        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      )
    }
    return (
      <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    )
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStorageBadge = () => {
    if (config.storage === 'cloudinary') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          Cloudinary
        </span>
      )
    } else if (config.storage === 'supabase') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
          </svg>
          Supabase
        </span>
      )
    }
    return null
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
          {getStorageBadge()}
        </div>
        <input
          id={`file-upload-${uploadType}`}
          type="file"
          accept={config.accept}
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            cursor-pointer border border-gray-300 rounded-md
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          {description || config.description}
        </p>
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center space-x-3">
            {getFileIcon(selectedFile)}
            <div>
              <span className="text-sm font-medium text-gray-900">{selectedFile.name}</span>
              <p className="text-xs text-gray-500">
                {formatFileSize(selectedFile.size)} • {selectedFile.type}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedFile(null)
              setUploadProgress(0)
              const fileInput = document.getElementById(`file-upload-${uploadType}`)
              if (fileInput) fileInput.value = ''
            }}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
            disabled={uploading}
          >
            Remove
          </button>
        </div>
      )}

      {uploading && uploadProgress > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${uploadProgress}%` }}
          ></div>
          <p className="text-xs text-gray-600 mt-1 text-center">{uploadProgress}% uploaded</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          <div className="flex items-start">
            <svg className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!selectedFile || uploading}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {uploading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading... {uploadProgress}%
          </span>
        ) : (
          `Upload ${selectedFile ? selectedFile.name : 'File'}`
        )}
      </button>
    </div>
  )
}