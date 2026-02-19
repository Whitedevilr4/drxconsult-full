import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Layout from '@/components/Layout'
import PdfViewer from '@/components/PdfViewer'
import SimplePdfViewer from '@/components/SimplePdfViewer'
import ComplaintList from '@/components/ComplaintList'
import ComplaintForm from '@/components/ComplaintForm'
import ComplaintDetail from '@/components/ComplaintDetail'
import SubscriptionStatus from '@/components/SubscriptionStatus'
import MedicalFormSubmission from '@/components/MedicalFormSubmission'
import MedicalFormsList from '@/components/MedicalFormsList'
import { toast } from 'react-toastify'

export default function PatientDashboard() {
  const router = useRouter()
  const [bookings, setBookings] = useState([])
  const [medicalHistory, setMedicalHistory] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviewingBooking, setReviewingBooking] = useState(null)
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  
  // Complaints state
  const [complaints, setComplaints] = useState([])
  const [showComplaintForm, setShowComplaintForm] = useState(false)
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [complaintsLoading, setComplaintsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('bookings')
  
  // Medical Forms state
  const [medicalFormsRefresh, setMedicalFormsRefresh] = useState(0)

  const dummyBookings = [
    {
      _id: '1',
      slotDate: new Date(Date.now() + 86400000).toISOString(),
      slotTime: '10:00 AM',
      status: 'confirmed',
      meetLink: 'https://meet.google.com/abc-defg-hij',
      pharmacistId: { userId: { name: 'Dr. Sarah Johnson' } }
    },
    {
      _id: '2',
      slotDate: new Date(Date.now() - 86400000).toISOString(),
      slotTime: '2:00 PM',
      status: 'completed',
      counsellingReport: '#',
      pharmacistId: { userId: { name: 'Dr. Michael Chen' } }
    }
  ]

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem('token')
    const userData = JSON.parse(localStorage.getItem('user') || '{}')
    
    if (!token && !userData.name) {
      // Demo mode - use dummy data
      setUser({ name: 'Demo Patient', email: 'demo@example.com' })
      setBookings(dummyBookings)
      setLoading(false)
      return
    }
    
    setUser(userData)
    if (token) {
      fetchBookings(token)
      fetchMedicalHistory(token)
      fetchComplaints(token)
    } else {
      setBookings(dummyBookings)
      setLoading(false)
    }
  }, [])

  const fetchBookings = async (token) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/bookings/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setBookings(res.data)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setBookings(dummyBookings)
      setLoading(false)
    }
  }

  const fetchMedicalHistory = async (token) => {
    try {
      
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/medical-history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setMedicalHistory(res.data)
    } catch (err) {
      console.error('Error fetching medical history:', err)
    }
  }

  const fetchComplaints = async (token) => {
    setComplaintsLoading(true)
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/complaints/my-complaints`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setComplaints(res.data.complaints || [])
    } catch (err) {
      console.error('Error fetching complaints:', err)
      setComplaints([])
    } finally {
      setComplaintsLoading(false)
    }
  }

  const handleComplaintSubmit = (newComplaint) => {
    setComplaints(prev => [newComplaint, ...prev])
    setShowComplaintForm(false)
    toast.success('Complaint submitted successfully!')
  }

  const handleComplaintClick = (complaint) => {
    setSelectedComplaint(complaint)
  }

  const handleComplaintUpdate = () => {
    const token = localStorage.getItem('token')
    if (token) {
      fetchComplaints(token)
    }
    setSelectedComplaint(null)
  }

  const handleMedicalFormSubmitted = (newForm) => {
    setMedicalFormsRefresh(prev => prev + 1)
    toast.success('Medical form submitted successfully!')
  }

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    router.push('/')
  }

  const handleSubmitReview = async (bookingId) => {
    if (rating === 0) {
      toast.warning('Please select a rating')
      return
    }
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) return
      
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/review`,
        { rating, feedback },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Review submitted successfully!')
      setReviewingBooking(null)
      setRating(0)
      setFeedback('')
      fetchBookings(token)
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Failed to submit review')
    }
  }

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) return
      
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Booking cancelled successfully')
      fetchBookings(token)
    } catch (err) {
      console.error(err)
      toast.error('Failed to cancel booking')
    }
  }

  const handleDemoLogin = () => {
    router.push('/login')
  }

  return (
    <Layout>
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Patient Dashboard</h1>
          
          {/* Subscription Status */}
          <div className="mb-6">
            <SubscriptionStatus />
          </div>
          
        {typeof window !== 'undefined' && !localStorage.getItem('token') && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-1">
                <p className="text-sm text-yellow-700">
                  <strong>Demo Mode:</strong> You're viewing sample data. 
                  <button onClick={handleDemoLogin} className="ml-2 underline font-semibold">
                    Login
                  </button> to access real features.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'bookings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Bookings
            </button>
            <button
              onClick={() => setActiveTab('complaints')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'complaints'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Complaints
            </button>
            <button
              onClick={() => setActiveTab('medical')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'medical'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Test Results
            </button>
            <button
              onClick={() => setActiveTab('medical-forms')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'medical-forms'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Medical Forms
            </button>
          </nav>
        </div>

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">My Bookings</h2>
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : bookings.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <p className="text-gray-600 mb-4">No bookings yet</p>
                <button 
                  onClick={() => router.push('/')}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                >
                  Book a Session
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map(booking => (
                  <div key={booking._id} className={`p-6 rounded-lg shadow ${
                    booking.status === 'completed' ? 'bg-green-50 border-2 border-green-200' : 'bg-white'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center mb-1">
                          <p className="font-semibold text-lg text-gray-800">
                            {booking.doctorId ? '👨‍⚕️' : booking.nutritionistId ? '🥗' : '💊'} {booking.doctorId?.userId?.name || booking.nutritionistId?.userId?.name || booking.pharmacistId?.userId?.name || (booking.doctorId ? 'Doctor' : booking.nutritionistId ? 'Nutritionist' : 'Pharmacist')}
                          </p>
                          <span className={`ml-3 px-2 py-1 text-xs rounded-full font-medium ${
                            booking.serviceType === 'prescription_review' 
                              ? 'bg-blue-100 text-blue-700' 
                              : booking.serviceType === 'doctor_consultation'
                              ? 'bg-red-100 text-red-700'
                              : booking.serviceType === 'nutritionist_consultation'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {booking.serviceType === 'prescription_review' 
                              ? '📋 Prescription Review' 
                              : booking.serviceType === 'doctor_consultation'
                              ? '🩺 Doctor Consultation'
                              : booking.serviceType === 'nutritionist_consultation'
                              ? '🥗 Nutrition Consultation'
                              : '💊 Full Consultation'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{booking.doctorId?.specialization || booking.nutritionistId?.specialization || booking.pharmacistId?.designation || ''}</p>
                        <p className="font-medium mt-2">Date: {new Date(booking.slotDate).toLocaleDateString()}</p>
                        <p>Time: {booking.slotTime}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Amount: <span className="font-semibold">₹{booking.paymentAmount || (booking.serviceType === 'prescription_review' ? 149 : booking.serviceType === 'doctor_consultation' ? 499 : booking.serviceType === 'nutritionist_consultation' ? 499 : 449)}</span>
                        </p>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        booking.status === 'completed' ? 'bg-green-600 text-white' :
                        booking.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                        booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {booking.status === 'completed' ? '✓ Completed' : booking.status}
                      </span>
                    </div>

                    {/* Completed Booking - Show Test Results and Review */}
                    {booking.status === 'completed' && (
                      <div className="mt-3 space-y-3">
                        <div className="p-3 bg-white rounded border border-green-200">
                          <p className="text-sm font-medium text-green-800 mb-2">Treatment Completed</p>
                          {booking.testResults && booking.testResults.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-1">Test Results:</p>
                              {booking.testResults.map((url, index) => (
                                <a
                                  key={index}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-sm text-blue-600 hover:underline mb-1"
                                >
                                  📄 Download Test Result {index + 1}
                                </a>
                              ))}
                            </div>
                          )}
                          {booking.counsellingReport && (
                            <div className="mt-2">
                              <div className="mb-2">
                                <PdfViewer 
                                  url={booking.counsellingReport} 
                                  filename="counselling-report.pdf"
                                />
                              </div>
                              
                              {/* Alternative Simple Viewer */}
                              <details className="mt-2">
                                <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                                  Alternative PDF Viewer (if above doesn't work)
                                </summary>
                                <div className="mt-2 border rounded" style={{ height: '400px' }}>
                                  <SimplePdfViewer 
                                    url={booking.counsellingReport} 
                                    filename="counselling-report.pdf"
                                  />
                                </div>
                              </details>
                            </div>
                          )}
                        </div>

                        {/* Review Section */}
                        {booking.review && booking.review.rating ? (
                          <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                            <p className="text-sm font-medium text-yellow-800 mb-2">Your Review</p>
                            <div className="flex items-center mb-2">
                              {[1, 2, 3, 4, 5].map(star => (
                                <span key={star} className="text-xl">
                                  {star <= booking.review.rating ? '⭐' : '☆'}
                                </span>
                              ))}
                              <span className="ml-2 text-sm text-gray-600">
                                ({booking.review.rating}/5)
                              </span>
                            </div>
                            {booking.review.feedback && (
                              <p className="text-sm text-gray-700 italic">"{booking.review.feedback}"</p>
                            )}
                          </div>
                        ) : reviewingBooking === booking._id ? (
                          <div className="p-4 bg-blue-50 rounded border border-blue-200">
                            <p className="text-sm font-medium text-blue-800 mb-3">Rate Your Experience</p>
                            <div className="mb-3">
                              <label className="block text-sm font-medium mb-2">Rating:</label>
                              <div className="flex space-x-2">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className="text-3xl hover:scale-110 transition-transform"
                                  >
                                    {star <= rating ? '⭐' : '☆'}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="mb-3">
                              <label className="block text-sm font-medium mb-2">Feedback (Optional):</label>
                              <textarea
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
                                rows="3"
                                placeholder="Share your experience..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                              />
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleSubmitReview(booking._id)}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                              >
                                Submit Review
                              </button>
                              <button
                                onClick={() => {
                                  setReviewingBooking(null)
                                  setRating(0)
                                  setFeedback('')
                                }}
                                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReviewingBooking(booking._id)}
                            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 text-sm"
                          >
                            ⭐ Write a Review
                          </button>
                        )}
                      </div>
                    )}

                    {/* Active Booking - Show Actions */}
                    {booking.status === 'confirmed' && (
                      <div className="mt-3">
                        {/* Meeting Link Status */}
                        {booking.meetLink ? (
                          <div className="mb-3 bg-green-50 p-3 rounded border border-green-200">
                            <p className="text-sm text-green-800 font-medium mb-2">
                              ✓ Meeting Link Available
                            </p>
                            <a 
                              href={booking.meetLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                            >
                              📹 Join Meeting
                            </a>
                          </div>
                        ) : (
                          <div className="mb-3 bg-yellow-50 p-3 rounded border border-yellow-200">
                            <p className="text-sm text-yellow-800">
                              ⏳ Waiting for {booking.doctorId ? 'doctor' : booking.nutritionistId ? 'nutritionist' : 'pharmacist'} to add meeting link. You'll be able to join once the link is provided.
                            </p>
                          </div>
                        )}
                        
                        <button
                          onClick={() => handleCancelBooking(booking._id)}
                          className="inline-block bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                        >
                          Cancel Booking
                        </button>
                      </div>
                    )}

                    {/* Cancelled Booking */}
                    {booking.status === 'cancelled' && (
                      <p className="mt-2 text-sm text-red-600">This booking was cancelled</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Test Results Section */}
            {medicalHistory?.documents && medicalHistory.documents.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">My Test Results</h2>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="space-y-3">
                    {medicalHistory.documents.map((doc, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <p className="font-medium">Test Result {index + 1}</p>
                              <p className="text-xs text-gray-500">Uploaded by admin</p>
                            </div>
                          </div>
                          <PdfViewer 
                            url={doc} 
                            filename={`test-result-${index + 1}.pdf`}
                          />
                        </div>
                        
                        {/* Alternative Simple Viewer */}
                        <details className="mt-2">
                          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                            Alternative PDF Viewer (if above doesn't work)
                          </summary>
                          <div className="mt-2 border rounded" style={{ height: '400px' }}>
                            <SimplePdfViewer 
                              url={doc} 
                              filename={`test-result-${index + 1}.pdf`}
                            />
                          </div>
                        </details>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Complaints Tab */}
        {activeTab === 'complaints' && (
          <div className="max-w-4xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">My Complaints</h2>
              {!showComplaintForm && (
                <button
                  onClick={() => setShowComplaintForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
                >
                  <span>📝</span>
                  <span>Submit Complaint</span>
                </button>
              )}
            </div>

            {showComplaintForm ? (
              <ComplaintForm
                onSubmit={handleComplaintSubmit}
                onCancel={() => setShowComplaintForm(false)}
                bookings={bookings}
              />
            ) : (
              <div>
                {complaintsLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <ComplaintList
                    complaints={complaints}
                    onComplaintClick={handleComplaintClick}
                    onRefresh={() => {
                      const token = localStorage.getItem('token')
                      if (token) fetchComplaints(token)
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Medical History Tab */}
        {activeTab === 'medical' && (
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold mb-6">My Test Results</h2>
            {medicalHistory?.documents && medicalHistory.documents.length > 0 ? (
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="space-y-4">
                  {medicalHistory.documents.map((doc, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <svg className="w-10 h-10 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="font-semibold text-lg">Test Result {index + 1}</p>
                            <p className="text-sm text-gray-500">Uploaded by admin</p>
                          </div>
                        </div>
                        <PdfViewer 
                          url={doc} 
                          filename={`test-result-${index + 1}.pdf`}
                        />
                      </div>
                      
                      {/* Alternative Simple Viewer */}
                      <details className="mt-3">
                        <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800 font-medium">
                          View PDF in Browser (Alternative Viewer)
                        </summary>
                        <div className="mt-3 border rounded" style={{ height: '500px' }}>
                          <SimplePdfViewer 
                            url={doc} 
                            filename={`test-result-${index + 1}.pdf`}
                          />
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No test results available</h3>
                <p className="text-gray-500">Your test results will appear here once uploaded by the admin.</p>
              </div>
            )}
          </div>
        )}

        {/* Medical Forms Tab */}
        {activeTab === 'medical-forms' && (
          <div className="max-w-4xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <MedicalFormSubmission onFormSubmitted={handleMedicalFormSubmitted} />
              </div>
              <div>
                <MedicalFormsList refreshTrigger={medicalFormsRefresh} />
              </div>
            </div>
          </div>
        )}

        {/* Complaint Detail Modal */}
        {selectedComplaint && (
          <ComplaintDetail
            complaint={selectedComplaint}
            onClose={() => setSelectedComplaint(null)}
            onUpdate={handleComplaintUpdate}
            isAdmin={false}
          />
        )}
        </div>
      </div>
    </Layout>
  )
}
