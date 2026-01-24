import { useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

export default function ComplaintList({ complaints, onComplaintClick, onRefresh }) {
  const [submittingRating, setSubmittingRating] = useState(null);

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'technical_issue': 'Technical Issue',
      'service_quality': 'Service Quality',
      'billing': 'Billing',
      'pharmacist_behavior': 'Pharmacist Behavior',
      'appointment_issue': 'Appointment Issue',
      'platform_bug': 'Platform Bug',
      'privacy_concern': 'Privacy Concern',
      'other': 'Other'
    };
    return labels[category] || category;
  };

  const submitRating = async (complaintId, rating) => {
    setSubmittingRating(complaintId);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/complaints/${complaintId}/rating`,
        { rating },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Rating submitted successfully');
      onRefresh();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error(error.response?.data?.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(null);
    }
  };

  if (complaints.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No complaints found</h3>
        <p className="text-gray-500">You haven't submitted any complaints yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {complaints.map((complaint) => (
        <div
          key={complaint._id}
          className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onComplaintClick(complaint)}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {complaint.title}
                </h3>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                    {complaint.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(complaint.priority)}`}>
                    {complaint.priority.toUpperCase()}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {getCategoryLabel(complaint.category)}
                  </span>
                </div>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>#{complaint._id.slice(-6)}</p>
                <p>{new Date(complaint.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Description Preview */}
            <p className="text-gray-600 mb-4 line-clamp-2">
              {complaint.description}
            </p>

            {/* Related Information */}
            {(complaint.relatedBooking || complaint.relatedPharmacist) && (
              <div className="mb-4 text-sm text-gray-500">
                {complaint.relatedBooking && (
                  <p>📅 Related to booking on {new Date(complaint.relatedBooking.slotDate).toLocaleDateString()}</p>
                )}
                {complaint.relatedPharmacist && (
                  <p>👨‍⚕️ Related to {complaint.relatedPharmacist.designation}</p>
                )}
              </div>
            )}

            {/* Admin Response Indicator */}
            {complaint.adminResponse && (
              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Admin Response:</span> {complaint.adminResponse.message.substring(0, 100)}
                  {complaint.adminResponse.message.length > 100 && '...'}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Responded by {complaint.adminResponse.respondedBy?.name} on{' '}
                  {new Date(complaint.adminResponse.respondedAt).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Resolution */}
            {complaint.resolution && complaint.resolution.message && (
              <div className="mb-4 p-3 bg-green-50 rounded-md">
                <p className="text-sm text-green-800">
                  <span className="font-medium">Resolution:</span> {complaint.resolution.message.substring(0, 100)}
                  {complaint.resolution.message.length > 100 && '...'}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Resolved by {complaint.resolution.resolvedBy?.name} on{' '}
                  {new Date(complaint.resolution.resolvedAt).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Rating Section */}
            {complaint.status === 'resolved' && !complaint.resolution?.satisfactionRating && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-md">
                <p className="text-sm text-yellow-800 mb-2">Please rate your experience:</p>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={(e) => {
                        e.stopPropagation();
                        submitRating(complaint._id, rating);
                      }}
                      disabled={submittingRating === complaint._id}
                      className="text-2xl hover:scale-110 transition-transform disabled:opacity-50"
                    >
                      ⭐
                    </button>
                  ))}
                </div>
                {submittingRating === complaint._id && (
                  <p className="text-xs text-yellow-600 mt-1">Submitting rating...</p>
                )}
              </div>
            )}

            {/* Existing Rating */}
            {complaint.resolution?.satisfactionRating && (
              <div className="mt-4 p-3 bg-green-50 rounded-md">
                <p className="text-sm text-green-800">
                  Your rating: {'⭐'.repeat(complaint.resolution.satisfactionRating)} 
                  ({complaint.resolution.satisfactionRating}/5)
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Last updated: {new Date(complaint.updatedAt).toLocaleDateString()}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onComplaintClick(complaint);
                }}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View Details →
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}