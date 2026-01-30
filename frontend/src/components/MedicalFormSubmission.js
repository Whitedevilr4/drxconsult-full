import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const MedicalFormSubmission = ({ onFormSubmitted }) => {
  const [formData, setFormData] = useState({
    patientName: '',
    age: '',
    sex: '',
    prescriptionDetails: '',
    additionalNotes: ''
  });
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload only PDF, JPG, or PNG files');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should be less than 5MB');
        return;
      }
      
      setPrescriptionFile(file);
    }
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'prescription');

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/uploads-v2`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      return response.data.url;
    } catch (error) {
      console.error('File upload error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload prescription file';
      throw new Error(errorMessage);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!prescriptionFile) {
      toast.error('Please upload a prescription file');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Upload prescription file first
      const prescriptionUrl = await uploadFile(prescriptionFile);

      // Submit medical form
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/medical-forms`, {
        ...formData,
        age: parseInt(formData.age),
        prescriptionUrl
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      toast.success('Medical form submitted successfully! It will be reviewed by our admin team.');
      
      // Reset form
      setFormData({
        patientName: '',
        age: '',
        sex: '',
        prescriptionDetails: '',
        additionalNotes: ''
      });
      setPrescriptionFile(null);
      setUploadProgress(0);
      
      // Notify parent component
      if (onFormSubmitted) {
        onFormSubmitted(response.data.medicalForm);
      }

    } catch (error) {
      console.error('Error submitting medical form:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit medical form';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-6">Submit Medical Form</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Patient Name *
            </label>
            <input
              type="text"
              name="patientName"
              value={formData.patientName}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter patient name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Age *
            </label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              required
              min="1"
              max="120"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter age"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sex *
          </label>
          <select
            name="sex"
            value={formData.sex}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select sex</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prescription Details *
          </label>
          <textarea
            name="prescriptionDetails"
            value={formData.prescriptionDetails}
            onChange={handleInputChange}
            required
            rows="4"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe your prescription, symptoms, or medical concerns..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Prescription *
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Upload PDF, JPG, or PNG files (max 5MB)
          </p>
          {prescriptionFile && (
            <p className="text-sm text-green-600 mt-1">
              Selected: {prescriptionFile.name}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes
          </label>
          <textarea
            name="additionalNotes"
            value={formData.additionalNotes}
            onChange={handleInputChange}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Any additional information or special requests..."
          />
        </div>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
            <p className="text-sm text-gray-600 mt-1">Uploading: {uploadProgress}%</p>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Important Information
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Your form will be reviewed by our admin team</li>
                  <li>A professional will be assigned to analyze your prescription</li>
                  <li>Results will be available for download after payment of ₹29</li>
                  <li>You'll receive notifications about the progress</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Medical Form'}
        </button>
      </form>
    </div>
  );
};

export default MedicalFormSubmission;