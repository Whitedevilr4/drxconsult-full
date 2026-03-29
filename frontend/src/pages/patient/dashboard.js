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
import MySubscriptionTab from '@/components/MySubscriptionTab'
import MedicalFormSubmission from '@/components/MedicalFormSubmission'
import MedicalFormsList from '@/components/MedicalFormsList'
import AmbulanceTracker from '@/components/AmbulanceTracker'
import BedReservationTimer from '@/components/BedReservationTimer'
import { useSocket } from '@/hooks/useSocket'
import { toast } from 'react-toastify'
import { showNotification } from '@/utils/browserNotification'
import medicineReminderService from '@/utils/medicineReminderService'

export default function PatientDashboard() {
  const router = useRouter()
  const [bookings, setBookings] = useState([])
  const [medicalHistory, setMedicalHistory] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
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
  
  // Hospital Queries state
  const [hospitalQueries, setHospitalQueries] = useState([])
  const [hospitalQueriesLoading, setHospitalQueriesLoading] = useState(false)
  const [hospitalBookings, setHospitalBookings] = useState([])
  const [hospitalQueriesSubTab, setHospitalQueriesSubTab] = useState('pending')
  const [dateFilter, setDateFilter] = useState('all') // all, past_month, this_month, 3_months, 6_months, 1_year
  const [trackingBooking, setTrackingBooking] = useState(null) // For ambulance tracking modal
  
  const socket = useSocket()

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

    // Role guard — professionals must not access patient dashboard
    if (token && userData.role && userData.role !== 'patient') {
      setAccessDenied(true)
      setLoading(false)
      return
    }
    
    setUser(userData)
    if (token) {
      fetchBookings(token)
      fetchMedicalHistory(token)
      fetchComplaints(token)
      fetchHospitalQueries(token)
      fetchHospitalBookings(token)
      fetchMedicineTracker(token)
    } else {
      setBookings(dummyBookings)
      setLoading(false)
    }
  }, [])

  const fetchMedicineTracker = async (token) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/medicine-tracker`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.data) {
        console.log('📋 Loading medicine tracker for reminders');
        medicineReminderService.loadMedicineTracker(res.data);
      }
    } catch (err) {
      console.error('Error fetching medicine tracker:', err)
    }
  }

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

  const fetchHospitalQueries = async (token) => {
    setHospitalQueriesLoading(true)
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/hospital-queries/my-queries`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setHospitalQueries(res.data || [])
    } catch (err) {
      console.error('Error fetching hospital queries:', err)
      setHospitalQueries([])
    } finally {
      setHospitalQueriesLoading(false)
    }
  }

  const fetchHospitalBookings = async (token) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/hospital-bookings/patient/all`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setHospitalBookings(res.data || [])
    } catch (err) {
      console.error('Error fetching hospital bookings:', err)
      setHospitalBookings([])
    }
  }

  // Listen for real-time query updates
  useEffect(() => {
    if (socket.isConnected) {
      console.log('✅ Patient Dashboard - Setting up query listeners');
      
      const handleQueryAccepted = (data) => {
        console.log('🎉 Query accepted event received:', data);
        
        // Update the query with full hospital details
        setHospitalQueries(prev => prev.map(query => {
          if (query._id === data.queryId || query._id.toString() === data.queryId.toString()) {
            console.log('✅ Updating query with hospital details');
            return {
              ...query,
              status: 'accepted',
              acceptedAt: data.acceptedAt,
              acceptedByHospitalId: {
                _id: data.hospitalId,
                hospitalName: data.hospitalName,
                contactNumber: data.hospitalContact
              }
            };
          }
          return query;
        }));
        
        // Show browser notification
        showNotification('hospitalQueryAccepted', data.hospitalName);
        
        // Show alert
        alert(`Good news! ${data.hospitalName} has accepted your query. You can now chat with them.`);
      };

      const handleQueryRejected = (data) => {
        console.log('❌ Query rejected event received:', data);
        
        setHospitalQueries(prev => prev.map(query => 
          query._id === data.queryId || query._id.toString() === data.queryId.toString()
            ? { ...query, status: 'rejected' }
            : query
        ));
        
        // Show browser notification
        showNotification('hospitalQueryRejected', data.hospitalName || 'Hospital', data.reason);
        
        // Show alert
        alert(`Query rejected by hospital. Reason: ${data.reason || 'Not specified'}`);
      };

      const handleQueryClosed = (data) => {
        console.log('🔒 Query closed event received:', data);
        
        setHospitalQueries(prev => prev.map(query => 
          query._id === data.queryId || query._id.toString() === data.queryId.toString()
            ? { ...query, status: 'completed' }
            : query
        ));
        
        // Show browser notification
        showNotification('hospitalQueryClosed', data.hospitalName || 'Hospital');
      };

      // Listen for booking confirmations
      const handleBookingConfirmed = (data) => {
        console.log('📅 Booking confirmed event received:', data);
        showNotification('bookingConfirmed', data.professionalName);
        
        // Refresh bookings
        const token = localStorage.getItem('token');
        if (token) {
          fetchBookings(token);
        }
      };

      // Listen for hospital booking initiated events
      const handleBookingInitiated = (data) => {
        console.log('📋 Hospital booking initiated event received:', data);
        
        // Show browser notification
        showNotification('hospitalBookingInitiated', data.hospitalName || 'Hospital', data.bookingType);
        
        // Refresh hospital bookings
        const token = localStorage.getItem('token');
        if (token) {
          fetchHospitalBookings(token);
        }
      };

      // Listen for payment confirmed events
      const handlePaymentConfirmed = (data) => {
        console.log('💰 Payment confirmed event received in patient dashboard:', data);
        
        // Refresh hospital bookings
        const token = localStorage.getItem('token');
        if (token) {
          fetchHospitalBookings(token);
        }
      };
      
      socket.onQueryAccepted(handleQueryAccepted);
      socket.onQueryRejected(handleQueryRejected);
      socket.onBookingConfirmed(handleBookingConfirmed);
      
      const io = window.io;
      if (io) {
        io.on('query-closed', handleQueryClosed);
        io.on('booking-initiated', handleBookingInitiated);
        io.on('ambulance-booking-created', handleBookingInitiated);
        io.on('payment-confirmed', handlePaymentConfirmed);
      }

      console.log('✅ Query listeners attached');

      return () => {
        console.log('🧹 Cleaning up query listeners');
        socket.offQueryAccepted();
        socket.offQueryRejected();
        if (io) {
          io.off('query-closed', handleQueryClosed);
          io.off('booking-initiated', handleBookingInitiated);
          io.off('ambulance-booking-created', handleBookingInitiated);
          io.off('payment-confirmed', handlePaymentConfirmed);
        }
      };
    } else {
      console.log('⏳ Waiting for socket connection...');
    }
  }, [socket.isConnected]);

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

  // Filter queries by date
  const filterQueriesByDate = (queries) => {
    if (!queries || !Array.isArray(queries)) return [];
    if (dateFilter === 'all') return queries;

    const now = new Date();
    let filterDate = new Date();

    switch (dateFilter) {
      case 'past_month':
        // Last 30 days from today
        filterDate = new Date(now);
        filterDate.setDate(filterDate.getDate() - 30);
        break;
      case 'this_month':
        // First day of current month
        filterDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
      case '3_months':
        // 3 months ago from today
        filterDate = new Date(now);
        filterDate.setMonth(filterDate.getMonth() - 3);
        break;
      case '6_months':
        // 6 months ago from today
        filterDate = new Date(now);
        filterDate.setMonth(filterDate.getMonth() - 6);
        break;
      case '1_year':
        // 1 year ago from today
        filterDate = new Date(now);
        filterDate.setFullYear(filterDate.getFullYear() - 1);
        break;
      default:
        return queries;
    }

    const filtered = queries.filter(query => {
      if (!query.createdAt) return false;
      const queryDate = new Date(query.createdAt);
      return queryDate >= filterDate;
    });

    console.log(`🔍 Filter: ${dateFilter}`);
    console.log(`   Today: ${now.toISOString()}`);
    console.log(`   Threshold: ${filterDate.toISOString()}`);
    console.log(`   Total queries: ${queries.length}, Filtered: ${filtered.length}`);
    
    // Show first 5 query dates for debugging
    console.log('   Query dates:');
    queries.slice(0, 5).forEach((q, i) => {
      const qDate = new Date(q.createdAt);
      const isIncluded = qDate >= filterDate;
      console.log(`     ${i + 1}. ${qDate.toISOString()} - ${isIncluded ? '✓ Included' : '✗ Excluded'}`);
    });
    
    return filtered;
  }

  return (
    <Layout>
      {/* Access Denied — professionals trying to access patient dashboard */}
      {accessDenied && (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              This dashboard is for patients only. Please go to your professional dashboard.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  const userData = JSON.parse(localStorage.getItem('user') || '{}')
                  const role = userData.role
                  if (role === 'pharmacist') router.push('/pharmacist/dashboard')
                  else if (role === 'doctor') router.push('/doctor/dashboard')
                  else if (role === 'nutritionist') router.push('/nutritionist/dashboard')
                  else if (role === 'admin') router.push('/admin/dashboard')
                  else if (role === 'hospital') router.push('/hospital/dashboard')
                  else router.push('/')
                }}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to My Dashboard
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      )}

      {!accessDenied && (
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-4 md:py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">Patient Dashboard</h1>
          
          {/* Subscription Status */}
          <div className="mb-4 md:mb-6">
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
        <div className="mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Patient Dashboard</h1>
            {socket.isConnected ? (
              <span className="flex items-center text-xs sm:text-sm bg-green-100 text-green-800 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Real-time Connected
              </span>
            ) : (
              <span className="flex items-center text-xs sm:text-sm bg-red-100 text-red-800 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                Disconnected
              </span>
            )}
          </div>
          
          {/* Mobile Dropdown Navigation */}
          <div className="md:hidden mb-4">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="bookings">My Bookings</option>
              <option value="complaints">My Complaints</option>
              <option value="medical">Test Results</option>
              <option value="medical-forms">Medical Forms</option>
              <option value="hospital-queries">Hospital Queries</option>
              <option value="my-subscription">My Subscription</option>
            </select>
          </div>

          {/* Desktop Tab Navigation */}
          <nav className="hidden md:flex space-x-8">
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
            <button
              onClick={() => setActiveTab('hospital-queries')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'hospital-queries'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Hospital Queries
            </button>
            <button
              onClick={() => setActiveTab('my-subscription')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-1 ${
                activeTab === 'my-subscription'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💳 My Subscription
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
                              href={booking.meetLink?.startsWith('http') ? booking.meetLink : `https://${booking.meetLink}`} 
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

        {/* Hospital Queries Tab */}
        {activeTab === 'hospital-queries' && (
          <div className="max-w-6xl">
            <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Hospital Queries & Bookings</h2>
            
            {/* Sub-tabs for Hospital Queries */}
            <div className="bg-white shadow rounded-lg">
              <div className="border-b border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between px-4 md:px-6 py-3 gap-3">
                  
                  {/* Mobile Dropdown for Sub-tabs */}
                  <div className="md:hidden">
                    <select
                      value={hospitalQueriesSubTab}
                      onChange={(e) => setHospitalQueriesSubTab(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">Pending Queries ({filterQueriesByDate(hospitalQueries.filter(q => q.status === 'pending')).length})</option>
                      <option value="accepted">Accepted Queries ({filterQueriesByDate(hospitalQueries.filter(q => q.status === 'accepted' || q.status === 'completed')).length})</option>
                      <option value="bookings">Bookings ({hospitalBookings.length})</option>
                    </select>
                  </div>

                  {/* Desktop Tab Navigation */}
                  <nav className="hidden md:flex -mb-px">
                    <button
                      onClick={() => setHospitalQueriesSubTab('pending')}
                      className={`px-4 lg:px-6 py-3 text-sm font-medium ${
                        hospitalQueriesSubTab === 'pending'
                          ? 'border-b-2 border-yellow-500 text-yellow-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Pending Queries ({filterQueriesByDate(hospitalQueries.filter(q => q.status === 'pending')).length})
                    </button>
                    <button
                      onClick={() => setHospitalQueriesSubTab('accepted')}
                      className={`px-4 lg:px-6 py-3 text-sm font-medium ${
                        hospitalQueriesSubTab === 'accepted'
                          ? 'border-b-2 border-green-500 text-green-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Accepted Queries ({filterQueriesByDate(hospitalQueries.filter(q => q.status === 'accepted' || q.status === 'completed')).length})
                    </button>
                    <button
                      onClick={() => setHospitalQueriesSubTab('bookings')}
                      className={`px-4 lg:px-6 py-3 text-sm font-medium ${
                        hospitalQueriesSubTab === 'bookings'
                          ? 'border-b-2 border-blue-500 text-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Bookings ({hospitalBookings.length})
                    </button>
                  </nav>
                  
                  {/* Date Filter Dropdown */}
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 rounded-md text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Time</option>
                      <option value="past_month">Past Month</option>
                      <option value="this_month">This Month</option>
                      <option value="3_months">Last 3 Months</option>
                      <option value="6_months">Last 6 Months</option>
                      <option value="1_year">Last Year</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-6">
                {/* Pending Queries Sub-tab */}
                {hospitalQueriesSubTab === 'pending' && (
                  <div className="space-y-4">
                    {hospitalQueriesLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
                      </div>
                    ) : filterQueriesByDate(hospitalQueries.filter(q => q.status === 'pending')).length > 0 ? (
                      filterQueriesByDate(hospitalQueries.filter(q => q.status === 'pending')).map((query) => (
                        <div key={query._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {query.queryType.replace('_', ' ').toUpperCase()}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {new Date(query.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                              PENDING
                            </span>
                          </div>
                          
                          <div className="space-y-2 text-sm text-gray-600">
                            {query.bedType && (
                              <p><span className="font-medium">Bed Type:</span> {query.bedType}</p>
                            )}
                            {query.specialization && (
                              <p><span className="font-medium">Specialization:</span> {query.specialization}</p>
                            )}
                            {query.description && (
                              <p><span className="font-medium">Description:</span> {query.description}</p>
                            )}
                            {query.userLocation && (
                              <p><span className="font-medium">Location:</span> {query.userLocation}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-400 mb-4">
                          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No pending queries</h3>
                        <p className="text-gray-500 mb-4">You don't have any pending hospital queries.</p>
                        <button
                          onClick={() => router.push('/locate-hospital')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Find Hospital
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Accepted Queries Sub-tab */}
                {hospitalQueriesSubTab === 'accepted' && (
                  <div className="space-y-4">
                    {hospitalQueriesLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                      </div>
                    ) : filterQueriesByDate(hospitalQueries.filter(q => q.status === 'accepted' || q.status === 'completed')).length > 0 ? (
                      filterQueriesByDate(hospitalQueries.filter(q => q.status === 'accepted' || q.status === 'completed')).map((query) => (
                        <div key={query._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {query.queryType.replace('_', ' ').toUpperCase()}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {new Date(query.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              query.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              query.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {query.status === 'completed' ? 'CLOSED' : 'ACCEPTED'}
                            </span>
                          </div>
                          
                          <div className="space-y-2 text-sm text-gray-600 mb-4">
                            {query.bedType && (
                              <p><span className="font-medium">Bed Type:</span> {query.bedType}</p>
                            )}
                            {query.specialization && (
                              <p><span className="font-medium">Specialization:</span> {query.specialization}</p>
                            )}
                            {query.description && (
                              <p><span className="font-medium">Description:</span> {query.description}</p>
                            )}
                            {query.userLocation && (
                              <p><span className="font-medium">Location:</span> {query.userLocation}</p>
                            )}
                          </div>

                          {query.acceptedByHospitalId && (
                            <div className={`p-4 rounded-lg border ${
                              query.status === 'completed' 
                                ? 'bg-gray-50 border-gray-200' 
                                : 'bg-green-50 border-green-200'
                            }`}>
                              <p className={`text-sm font-medium mb-2 ${
                                query.status === 'completed' ? 'text-gray-900' : 'text-green-900'
                              }`}>
                                Accepted by: {query.acceptedByHospitalId.hospitalName || 'Hospital'}
                              </p>
                              {query.acceptedByHospitalId.contactNumber && (
                                <p className={`text-sm ${
                                  query.status === 'completed' ? 'text-gray-700' : 'text-green-800'
                                }`}>
                                  Contact: {query.acceptedByHospitalId.contactNumber}
                                </p>
                              )}
                              {query.acceptedByHospitalId.address && (
                                <p className={`text-sm ${
                                  query.status === 'completed' ? 'text-gray-700' : 'text-green-800'
                                }`}>
                                  Address: {query.acceptedByHospitalId.address}
                                </p>
                              )}
                              {query.status === 'completed' ? (
                                <div className="mt-3 flex items-center space-x-2">
                                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                  </svg>
                                  <span className="text-sm text-gray-600 font-medium">This query has been closed</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => router.push(`/hospital/chat/${query._id}`)}
                                  className="mt-3 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                                >
                                  Open Chat
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-400 mb-4">
                          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No accepted queries</h3>
                        <p className="text-gray-500">Your accepted queries will appear here.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Bookings Sub-tab */}
                {hospitalQueriesSubTab === 'bookings' && (
                  <div className="space-y-4">
                    {hospitalBookings.length > 0 ? (
                      hospitalBookings.map((booking) => (
                        <div key={booking._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4 flex-1">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                                booking.bookingType === 'bed' ? 'bg-blue-100' : 'bg-orange-100'
                              }`}>
                                {booking.bookingType === 'bed' ? (
                                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                  </svg>
                                ) : (
                                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold capitalize">{booking.bookingType} Booking</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  Hospital: {booking.hospitalId?.hospitalName}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Contact: {booking.hospitalId?.contactNumber}
                                </p>
                                <p className="text-sm font-medium text-gray-900 mt-2">
                                  Amount: ₹{booking.paymentAmount}
                                </p>
                                {booking.bookingType === 'ambulance' && booking.ambulanceDetails && (
                                  <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                    <p className="text-sm font-medium text-orange-900 mb-2">Ambulance Details:</p>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div>
                                        <p className="text-gray-600">Ambulance: <span className="text-gray-900 font-medium">{booking.ambulanceDetails.ambulanceNumber}</span></p>
                                        <p className="text-gray-600">Driver: <span className="text-gray-900 font-medium">{booking.ambulanceDetails.driverName}</span></p>
                                        <p className="text-gray-600">Contact: <span className="text-gray-900 font-medium">{booking.ambulanceDetails.driverContact}</span></p>
                                      </div>
                                      <div>
                                        <p className="text-gray-600">Type: <span className="text-gray-900 font-medium capitalize">{booking.ambulanceDetails.ambulanceType.replace('_', ' ')}</span></p>
                                        <p className="text-gray-600">Pickup: <span className="text-gray-900 font-medium">{booking.ambulanceDetails.pickupLocation}</span></p>
                                      </div>
                                    </div>
                                    {booking.paymentStatus === 'completed' && booking.status === 'confirmed' && (
                                      <button
                                        onClick={() => setTrackingBooking(booking)}
                                        className="mt-3 w-full bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-md flex items-center justify-center space-x-2 text-sm font-medium"
                                      >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span>Track Ambulance</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                                {booking.bookingType === 'bed' && (
                                  <div className="mt-2">
                                    <p className="text-sm text-gray-600">Bed Type: <span className="text-gray-900 font-medium capitalize">{booking.bedType}</span></p>
                                    <p className="text-sm text-gray-600">Number of Beds: <span className="text-gray-900 font-medium">{booking.numberOfBeds}</span></p>
                                    
                                    {/* Display OTP for patient */}
                                    {booking.arrivalOTP && booking.paymentStatus === 'completed' && booking.patientArrivalStatus === 'pending' && !booking.otpVerificationFailed && (
                                      <div className="mt-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center space-x-2">
                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            <p className="text-sm font-semibold text-green-800">Your Arrival OTP</p>
                                          </div>
                                        </div>
                                        <div className="bg-white rounded-lg p-3 border-2 border-green-400">
                                          <p className="text-3xl font-bold text-center text-green-600 tracking-widest">
                                            {booking.arrivalOTP}
                                          </p>
                                        </div>
                                        <p className="text-xs text-green-700 mt-2 text-center">
                                          Show this OTP to hospital staff upon arrival
                                        </p>
                                        {booking.otpVerificationAttempts > 0 && (
                                          <div className="mt-2 flex items-center justify-center text-xs text-yellow-600">
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            <span>{booking.otpVerificationAttempts} incorrect attempt{booking.otpVerificationAttempts > 1 ? 's' : ''} made</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Bed Reservation Timer */}
                                    {booking.reservationExpiresAt && booking.paymentStatus === 'completed' && (
                                      <BedReservationTimer
                                        reservationExpiresAt={booking.reservationExpiresAt}
                                        bookingId={booking._id}
                                        isHospital={false}
                                        patientArrivalStatus={booking.patientArrivalStatus}
                                        status={booking.status}
                                      />
                                    )}
                                    
                                    {/* Arrival Status Display */}
                                    {booking.patientArrivalStatus !== 'pending' && (
                                      <div className={`mt-3 p-2 rounded ${
                                        booking.patientArrivalStatus === 'arrived' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                                      }`}>
                                        <p className={`text-sm font-semibold ${
                                          booking.patientArrivalStatus === 'arrived' ? 'text-green-800' : 'text-red-800'
                                        }`}>
                                          {booking.patientArrivalStatus === 'arrived' ? '✓ You Have Arrived' : '✗ Marked as Not Arrived'}
                                        </p>
                                        {booking.otpVerificationFailed && (
                                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-300 rounded">
                                            <p className="text-xs text-yellow-800 font-medium">
                                              ⚠️ Faulty OTP Entry - Please Contact DRX Consult
                                            </p>
                                            <p className="text-xs text-yellow-700 mt-1">
                                              Your arrival was marked but OTP verification failed after 3 attempts.
                                            </p>
                                          </div>
                                        )}
                                        {booking.patientArrivalStatus === 'not_arrived' && !booking.otpVerificationFailed && (
                                          <p className="text-xs text-red-600 mt-1">
                                            Your booking was cancelled as you did not arrive within the reservation time.
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <p className="text-xs text-gray-500 mt-2">
                                  Created: {new Date(booking.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                booking.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' :
                                booking.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                booking.paymentStatus === 'initiated' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                Payment: {booking.paymentStatus}
                              </span>
                              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                booking.status === 'pending_payment' ? 'bg-yellow-100 text-yellow-800' :
                                booking.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {booking.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-400 mb-4">
                          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
                        <p className="text-gray-500">Your hospital bookings will appear here once confirmed.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* My Subscription Tab */}
        {activeTab === 'my-subscription' && (
          <MySubscriptionTab />
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

        {/* Ambulance Tracker Modal */}
        {trackingBooking && (
          <AmbulanceTracker
            booking={trackingBooking}
            onClose={() => setTrackingBooking(null)}
          />
        )}
        </div>
      </div>
      )}
    </Layout>
  )
}
