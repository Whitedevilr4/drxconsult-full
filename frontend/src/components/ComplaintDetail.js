import { useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

export default function ComplaintDetail({ complaint, onClose, onUpdate, isAdmin = false }) {
  const [adminResponse, setAdminResponse] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [newStatus, setNewStatus] = useState(complaint.status);
  const [resolutionMessage, setResolutionMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const handleAdminResponse = async () => {
    if (!adminResponse.trim()) {
      toast.error('Please enter a response message');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/complaints/admin/${complaint._id}/respond`,
        { message: adminResponse },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Response sent successfully');
      setAdminResponse('');
      onUpdate();
    } catch (error) {
      console.error('Error sending response:', error);
      toast.error(error.response?.data?.message || 'Failed to send response');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payload = { status: newStatus };
      
      if (newStatus === 'resolved' && resolutionMessage.trim()) {
        payload.message = resolutionMessage;
      }

      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/complaints/admin/${complaint._id}/status`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Status updated successfully');
      onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!internalNote.trim()) {
      toast.error('Please enter a note');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/complaints/admin/${complaint._id}/note`,
        { note: internalNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Note added successfully');
      setInternalNote('');
      onUpdate();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error(error.response?.data?.message || 'Failed to add note');
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/complaints/${complaint._id}/rating`,
        { rating },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Rating submitted successfully');
      onUpdate();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error(error.response?.data?.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{complaint.title}</h2>
            <p className="text-sm text-gray-500">Complaint #{complaint._id.slice(-6)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status and Priority */}
          <div className="flex flex-wrap gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(complaint.status)}`}>
              {complaint.status.replace('_', ' ').toUpperCase()}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(complaint.priority)}`}>
              {complaint.priority.toUpperCase()} PRIORITY
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              {getCategoryLabel(complaint.category)}
            </span>
          </div>

          {/* Complaint Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{complaint.description}</p>
          </div>

          {/* Related Information */}
          {(complaint.relatedBooking || complaint.relatedPharmacist) && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Related Information</h3>
              {complaint.relatedBooking && (
                <p className="text-blue-800">
                  📅 Booking: {new Date(complaint.relatedBooking.slotDate).toLocaleDateString()} at {complaint.relatedBooking.slotTime}
                </p>
              )}
              {complaint.relatedPharmacist && (
                <p className="text-blue-800">
                  👨‍⚕️ Pharmacist: {complaint.relatedPharmacist.designation}
                </p>
              )}
            </div>
          )}

          {/* Admin Response */}
          {complaint.adminResponse && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Admin Response</h3>
              <p className="text-blue-800 mb-2">{complaint.adminResponse.message}</p>
              <p className="text-sm text-blue-600">
                Responded by {complaint.adminResponse.respondedBy?.name} on{' '}
                {new Date(complaint.adminResponse.respondedAt).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Resolution */}
          {complaint.resolution && complaint.resolution.message && (
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">Resolution</h3>
              <p className="text-green-800 mb-2">{complaint.resolution.message}</p>
              <p className="text-sm text-green-600">
                Resolved by {complaint.resolution.resolvedBy?.name} on{' '}
                {new Date(complaint.resolution.resolvedAt).toLocaleDateString()}
              </p>
              {complaint.resolution.satisfactionRating && (
                <div className="mt-2">
                  <p className="text-sm text-green-700">
                    Customer Rating: {'⭐'.repeat(complaint.resolution.satisfactionRating)} ({complaint.resolution.satisfactionRating}/5)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Internal Notes (Admin Only) */}
          {isAdmin && complaint.internalNotes && complaint.internalNotes.length > 0 && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">Internal Notes</h3>
              <div className="space-y-2">
                {complaint.internalNotes.map((note, index) => (
                  <div key={index} className="border-l-2 border-yellow-300 pl-3">
                    <p className="text-yellow-800">{note.note}</p>
                    <p className="text-xs text-yellow-600">
                      By {note.addedBy?.name} on {new Date(note.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rating Section (for resolved complaints) */}
          {complaint.status === 'resolved' && !complaint.resolution?.satisfactionRating && !isAdmin && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-3">Rate Your Experience</h3>
              <div className="flex items-center space-x-2 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-2xl transition-colors ${
                      star <= rating ? 'text-yellow-500' : 'text-gray-300'
                    } hover:text-yellow-400`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              <button
                onClick={submitRating}
                disabled={loading || rating === 0}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          )}

          {/* Admin Actions */}
          {isAdmin && (
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900">Admin Actions</h3>
              
              {/* Status Update */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Update Status</h4>
                <div className="flex items-center space-x-3">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <button
                    onClick={handleStatusUpdate}
                    disabled={loading || newStatus === complaint.status}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Update Status
                  </button>
                </div>
                
                {newStatus === 'resolved' && (
                  <div className="mt-3">
                    <textarea
                      value={resolutionMessage}
                      onChange={(e) => setResolutionMessage(e.target.value)}
                      placeholder="Resolution message..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                )}
              </div>

              {/* Admin Response */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Send Response</h4>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Type your response to the customer..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  rows={4}
                />
                <button
                  onClick={handleAdminResponse}
                  disabled={loading || !adminResponse.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Response'}
                </button>
              </div>

              {/* Internal Note */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Add Internal Note</h4>
                <textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Internal note (not visible to customer)..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  rows={3}
                />
                <button
                  onClick={handleAddNote}
                  disabled={loading || !internalNote.trim()}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Note'}
                </button>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="text-sm text-gray-500 border-t pt-4">
            <p>Created: {new Date(complaint.createdAt).toLocaleString()}</p>
            <p>Last Updated: {new Date(complaint.updatedAt).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}