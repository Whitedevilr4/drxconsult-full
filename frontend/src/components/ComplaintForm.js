import { useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

export default function ComplaintForm({ onSubmit, onCancel, bookings = [], pharmacists = [] }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    relatedBooking: '',
    relatedPharmacist: ''
  });
  const [loading, setLoading] = useState(false);

  const categories = [
    { value: 'technical_issue', label: 'Technical Issue' },
    { value: 'service_quality', label: 'Service Quality' },
    { value: 'billing', label: 'Billing' },
    { value: 'pharmacist_behavior', label: 'Pharmacist Behavior' },
    { value: 'appointment_issue', label: 'Appointment Issue' },
    { value: 'platform_bug', label: 'Platform Bug' },
    { value: 'privacy_concern', label: 'Privacy Concern' },
    { value: 'other', label: 'Other' }
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim() || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Clean up the form data - remove empty strings for optional fields
      const submitData = {
        ...formData,
        relatedBooking: formData.relatedBooking || undefined,
        relatedPharmacist: formData.relatedPharmacist || undefined
      };
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/complaints/submit`,
        submitData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Complaint submitted successfully');
      onSubmit(response.data.complaint);
    } catch (error) {
      console.error('Error submitting complaint:', error);
      toast.error(error.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit a Complaint</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            maxLength={200}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Brief description of your complaint"
            required
          />
          <p className="text-xs text-gray-500 mt-1">{formData.title.length}/200 characters</p>
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select a category</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {priorities.map(priority => (
              <option key={priority.value} value={priority.value}>{priority.label}</option>
            ))}
          </select>
        </div>

        {/* Related Booking */}
        {bookings.length > 0 && (
          <div>
            <label htmlFor="relatedBooking" className="block text-sm font-medium text-gray-700 mb-2">
              Related Booking (Optional)
            </label>
            <select
              id="relatedBooking"
              name="relatedBooking"
              value={formData.relatedBooking}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a booking</option>
              {bookings.map(booking => (
                <option key={booking._id} value={booking._id}>
                  {new Date(booking.slotDate).toLocaleDateString()} at {booking.slotTime}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Related Pharmacist */}
        {pharmacists.length > 0 && (
          <div>
            <label htmlFor="relatedPharmacist" className="block text-sm font-medium text-gray-700 mb-2">
              Related Pharmacist (Optional)
            </label>
            <select
              id="relatedPharmacist"
              name="relatedPharmacist"
              value={formData.relatedPharmacist}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a pharmacist</option>
              {pharmacists.map(pharmacist => (
                <option key={pharmacist._id} value={pharmacist._id}>
                  {pharmacist.userId?.name} - {pharmacist.designation}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={6}
            maxLength={2000}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Please provide detailed information about your complaint..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">{formData.description.length}/2000 characters</p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Complaint'}
          </button>
        </div>
      </form>
    </div>
  );
}