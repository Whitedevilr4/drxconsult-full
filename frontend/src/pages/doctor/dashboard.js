import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Layout from '@/components/Layout'
import TimeSlotManagement from '@/components/TimeSlotManagement'
import PdfUploader from '@/components/EnhancedUploader'
import PdfViewer from '@/components/PdfViewer'
import SimplePdfViewer from '@/components/SimplePdfViewer'
import PrescriptionGenerator from '@/components/PrescriptionGenerator'
import { toast } from 'react-toastify'
import SubscriptionPatientsTab from '@/components/SubscriptionPatientsTab'

export default function DoctorDashboard() {
  const router = useRouter()
  const [bookings, setBookings] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [uploadingTest, setUploadingTest] = useState(null)
  const [testResultUrl, setTestResultUrl] = useState('')
  const [showPdfUploader, setShowPdfUploader] = useState(null)
  const [rescheduling, setRescheduling] = useState(null)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [paymentStats, setPaymentStats] = useState({
    totalEarned: 0,
    totalPaid: 0,
    outstanding: 0,
    completedBookings: 0,
    paidBookings: 0,
    unpaidBookings: 0
  })
  const [reviews, setReviews] = useState({ reviews: [], totalReviews: 0, averageRating: 0 })
  const [lastPaymentUpdate, setLastPaymentUpdate] = useState(new Date())
  const [addingMeetLink, setAddingMeetLink] = useState(null)
  const [meetLinkInput, setMeetLinkInput] = useState('')
  const [dateFilter, setDateFilter] = useState('all') // 'today', 'last7days', 'last30days', 'all'
  const [mounted, setMounted] = useState(false)
  const [isOnline, setIsOnline] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showPrescription, setShowPrescription] = useState(false)
  const [doctorProfile, setDoctorProfile] = useState(null)
  const [isCoreTeam, setIsCoreTeam] = useState(false)
  const [subscriptionPatients, setSubscriptionPatients] = useState([])
  const [subscriptionPatientsLoading, setSubscriptionPatientsLoading] = useState(false)
  const [incentives, setIncentives] = useState([])
  const [incentivesTotal, setIncentivesTotal] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem('token')
    const userData = JSON.parse(localStorage.getItem('user') || '{}')
    
    // Check if user is logged in
    if (!token || !userData.role) {
      router.push('/login?redirect=/doctor/dashboard')
      return
    }
    
    // Check if user has doctor or admin role
    if (userData.role !== 'doctor' && userData.role !== 'admin') {
      setAccessDenied(true)
      setLoading(false)
      return
    }
    
    setUser(userData)
    fetchBookings(token) // This will also fetch payment stats
    fetchReviews(token)
    fetchIncentives(token)
  }, [activeTab, router])

  // Recalculate payment stats whenever bookings change
  useEffect(() => {
    const completedBookings = bookings.filter(b => b.status === 'completed')
    
    if (completedBookings.length > 0) {
      const totalEarned = completedBookings.reduce((sum, b) => sum + (b.doctorShare || Math.round((b.paymentAmount || 499) * 0.7)), 0)
      const paidBookingsArray = completedBookings.filter(b => b.doctorPaid)
      const totalPaid = paidBookingsArray.reduce((sum, b) => sum + (b.doctorShare || Math.round((b.paymentAmount || 499) * 0.7)), 0)
      const outstanding = totalEarned - totalPaid
      
      const newStats = {
        totalEarned,
        totalPaid,
        outstanding,
        completedBookings: completedBookings.length,
        paidBookings: paidBookingsArray.length,
        unpaidBookings: completedBookings.length - paidBookingsArray.length
      }
      
      setPaymentStats(newStats)
      setLastPaymentUpdate(new Date())
    }
  }, [bookings])

  const fetchBookings = async (token) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/doctors/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const completedBookings = res.data.filter(b => b.status === 'completed')
      
      // Fetch doctor profile to get online status
      const profileRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/doctors/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (profileRes.data && profileRes.data.status) {
        setIsOnline(profileRes.data.status === 'online')
        setDoctorProfile(profileRes.data)
        if (profileRes.data.coreTeam) {
          setIsCoreTeam(true)
          fetchSubscriptionPatients(token)
        }
      }
      
      // Calculate payment stats from bookings
      const totalEarned = completedBookings.reduce((sum, b) => {
        const share = b.doctorShare || 225
        return sum + share
      }, 0)
      
      const paidBookingsArray = completedBookings.filter(b => b.doctorPaid)
      const totalPaid = paidBookingsArray.reduce((sum, b) => sum + (b.doctorShare || Math.round((b.paymentAmount || 499) * 0.7)), 0)
      const outstanding = totalEarned - totalPaid
      const paidBookings = paidBookingsArray.length
      const unpaidBookings = completedBookings.length - paidBookings
      
      const calculatedStats = {
        totalEarned,
        totalPaid,
        outstanding,
        completedBookings: completedBookings.length,
        paidBookings,
        unpaidBookings
      }

      // Set bookings first
      setBookings(res.data)
      setLoading(false)
      
      // Set payment stats immediately
      setPaymentStats(calculatedStats)
      setLastPaymentUpdate(new Date())

      // Also try to fetch from API (will override if successful)
      fetchPaymentStats(token)
    } catch (err) {
      console.error('Error fetching bookings:', err)
      console.error('Error details:', err.response?.data || err.message)
      // Don't fall back to dummy data - show empty state instead
      setBookings([])
      setLoading(false)
      
      // Show error message to user
      if (err.response?.status === 404) {
        console.log('No doctor profile found - this is normal for new doctors')
      } else {
        toast.error('Failed to load bookings. Please try refreshing the page.')
      }
    }
  }

  const fetchPaymentStats = async (token) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/doctors/payment-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setPaymentStats(res.data)
      setLastPaymentUpdate(new Date())
    } catch (err) {
      console.error('Error fetching payment stats:', err)
      console.error('Error details:', err.response?.data || err.message)
      // Set default values if API fails
      setPaymentStats({
        totalEarned: 0,
        totalPaid: 0,
        outstanding: 0,
        completedBookings: 0,
        paidBookings: 0,
        unpaidBookings: 0
      })
    }
  }

  const fetchSubscriptionPatients = async (token) => {
    setSubscriptionPatientsLoading(true)
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/bookings/subscription-patients`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSubscriptionPatients(res.data)
    } catch (err) {
      console.error('Error fetching subscription patients:', err)
    } finally {
      setSubscriptionPatientsLoading(false)
    }
  }

  const fetchIncentives = async (token) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/incentives/my`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setIncentives(res.data)
      setIncentivesTotal(res.data.reduce((s, i) => s + i.amount, 0))
    } catch (err) {
      console.error('Error fetching incentives:', err)
    }
  }

  const fetchReviews = async (token) => {
    try {
      const doctor = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/doctors`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Get current doctor ID
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {}
      const currentDoctor = doctor.data.find(d => d.userId?.email === user.email)
      
      if (currentDoctor) {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/bookings/reviews/${currentDoctor._id}?type=doctor`)
        setReviews(res.data)
      }
    } catch (err) {
      console.error('Error fetching reviews:', err)
    }
  }

  const handleTreatmentStatus = async (bookingId, status) => {
    // If marking as treated, validate requirements
    if (status === 'treated') {
      const booking = bookings.find(b => b._id === bookingId)
      
      if (!booking) {
        toast.error('Booking not found')
        return
      }
      
      // Check if meeting link is added
      if (!booking.meetLink || booking.meetLink.trim() === '') {
        toast.error('❌ Cannot mark as treated! You must add a meeting link first.')
        return
      }
      
      // Check if test results are uploaded
      if (!booking.testResults || booking.testResults.length === 0) {
        toast.error('❌ Cannot mark as treated! You must upload test results first.')
        return
      }
      
      // Confirm before marking as treated
      if (!window.confirm('Mark this patient as treated and complete the booking?\n\nThis action will:\n✓ Close the booking\n✓ Make it available for patient review\n✓ Count towards your completed bookings')) {
        return
      }
    }
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) return
      
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/treatment-status`,
        { treatmentStatus: status },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (status === 'treated') {
        toast.success('✅ Patient marked as treated! The booking is now completed.')
        // Refresh payment stats since a booking was completed
        fetchPaymentStats(token)
      }
      
      fetchBookings(token)
    } catch (err) {
      console.error(err)
      toast.error('Failed to update treatment status: ' + (err.response?.data?.message || err.message))
    }
  }

  const handlePdfUploadSuccess = async (url, filename, bookingId) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) return
      
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/test-result`,
        { testResultUrl: url },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setShowPdfUploader(null)
      setUploadingTest(null)
      setTestResultUrl('')
      fetchBookings(token)
      toast.success('Test result uploaded successfully!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to upload test result')
    }
  }

  const handleUploadTestResult = async (bookingId) => {
    if (!testResultUrl) {
      toast.warning('Please enter test result URL')
      return
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) return
      
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/test-result`,
        { testResultUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setUploadingTest(null)
      setTestResultUrl('')
      fetchBookings(token)
      toast.success('Test result uploaded successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to upload test result')
    }
  }

  const handleAddMeetLink = async (bookingId) => {
    if (!meetLinkInput || !meetLinkInput.trim()) {
      toast.warning('Please enter a meeting link')
      return
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) return
      
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/meeting-link`,
        { meetLink: meetLinkInput },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setAddingMeetLink(null)
      setMeetLinkInput('')
      fetchBookings(token)
      toast.success('Meeting link added successfully!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to add meeting link: ' + (err.response?.data?.message || err.message))
    }
  }

  const toggleOnlineStatus = async () => {
    try {
      setUpdatingStatus(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) return
      
      const newStatus = isOnline ? 'offline' : 'online'
      
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/doctors/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setIsOnline(!isOnline)
      toast.success(`You are now ${newStatus}!`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to update status')
    } finally {
      setUpdatingStatus(false)
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

  const handleRescheduleBooking = async (bookingId) => {
    if (!newDate || !newTime) {
      toast.warning('Please select new date and time')
      return
    }
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) return
      
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/reschedule`,
        { newDate, newTime },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Booking rescheduled successfully')
      setRescheduling(null)
      setNewDate('')
      setNewTime('')
      fetchBookings(token)
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Failed to reschedule booking')
    }
  }

  const stats = {
    total: bookings.length,
    treated: bookings.filter(b => b.treatmentStatus === 'treated').length,
    untreated: bookings.filter(b => b.treatmentStatus === 'untreated').length,
    upcoming: bookings.filter(b => b.status === 'confirmed' && new Date(b.slotDate) > new Date()).length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length
  }

  // Calculate payment stats directly from bookings using useMemo
  const calculatedPaymentStats = useMemo(() => {
    const completedBookings = bookings.filter(b => b.status === 'completed')

    const totalEarned = completedBookings.reduce((sum, b) => sum + (b.doctorShare || Math.round((b.paymentAmount || 499) * 0.7)), 0)
    const paidBookingsArray = completedBookings.filter(b => b.doctorPaid)
    const totalPaid = paidBookingsArray.reduce((sum, b) => sum + (b.doctorShare || Math.round((b.paymentAmount || 499) * 0.7)), 0)
    const outstanding = totalEarned - totalPaid
    
    const result = {
      totalEarned,
      totalPaid,
      outstanding,
      completedBookings: completedBookings.length,
      paidBookings: paidBookingsArray.length,
      unpaidBookings: completedBookings.length - paidBookingsArray.length
    }

    return result
  }, [bookings])

  const filteredBookings = bookings.filter(booking => {
    // Status filter
    let statusMatch = true
    if (activeTab === 'all') statusMatch = true
    else if (activeTab === 'treated') statusMatch = booking.treatmentStatus === 'treated'
    else if (activeTab === 'untreated') statusMatch = booking.treatmentStatus === 'untreated'
    else if (activeTab === 'upcoming') statusMatch = booking.status === 'confirmed' && new Date(booking.slotDate) > new Date()
    else if (activeTab === 'completed') statusMatch = booking.status === 'completed'
    else if (activeTab === 'cancelled') statusMatch = booking.status === 'cancelled'
    
    // Date filter
    let dateMatch = true
    if (dateFilter !== 'all') {
      const bookingDate = new Date(booking.slotDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (dateFilter === 'today') {
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        dateMatch = bookingDate >= today && bookingDate < tomorrow
      } else if (dateFilter === 'last7days') {
        const sevenDaysAgo = new Date(today)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        dateMatch = bookingDate >= sevenDaysAgo
      } else if (dateFilter === 'last30days') {
        const thirtyDaysAgo = new Date(today)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        dateMatch = bookingDate >= thirtyDaysAgo
      }
    }
    
    return statusMatch && dateMatch
  })

  return (
    <>
    <Layout>
      {/* Online Toggle Button - Fixed Position */}
      {!accessDenied && (
        <div className="fixed top-20 right-4 z-50">
          <button
            onClick={toggleOnlineStatus}
            disabled={updatingStatus}
            className={`flex items-center space-x-2 px-6 py-3 rounded-full shadow-lg font-semibold transition-all duration-300 ${
              isOnline
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-400 hover:bg-gray-500 text-white'
            } ${updatingStatus ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
          >
            {isOnline ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
                <span>Online</span>
              </>
            ) : (
              <>
                <span className="h-3 w-3 rounded-full bg-white"></span>
                <span>Go Online</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Access Denied Screen */}
      {accessDenied && (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
              <p className="text-gray-600 mb-6">
                You don't have permission to access the doctor dashboard. This area is restricted to doctors and administrators only.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push('/patient/dashboard')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Patient Dashboard
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Go to Home
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('token')
                  localStorage.removeItem('user')
                  router.push('/login')
                }}
                className="w-full text-gray-600 py-2 px-4 rounded-lg hover:text-gray-800 transition-colors text-sm"
              >
                Login as Different User
              </button>
            </div>
            
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Are you a doctor?</strong> Please contact the system administrator to get doctor access.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Normal Dashboard Content */}
      {!accessDenied && (
        <div className={`bg-gray-50 min-h-screen transition-all duration-300 ${!isOnline ? 'blur-sm pointer-events-none select-none' : ''}`}>
          <div className="container mx-auto px-4 py-4 sm:py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Doctor Dashboard</h1>
            </div>

            {/* Stats Cards - Optimized */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-lg shadow-lg text-white">
                <p className="text-blue-100 text-xs font-medium">Total Patients</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-lg shadow-lg text-white">
                <p className="text-green-100 text-xs font-medium">Treated</p>
                <p className="text-3xl font-bold mt-1">{stats.treated}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-lg shadow-lg text-white">
                <p className="text-orange-100 text-xs font-medium">Untreated</p>
                <p className="text-3xl font-bold mt-1">{stats.untreated}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-lg shadow-lg text-white">
                <p className="text-purple-100 text-xs font-medium">Upcoming</p>
                <p className="text-3xl font-bold mt-1">{stats.upcoming}</p>
              </div>
            </div>

            {/* Payment Stats Card */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg shadow-lg mb-6 relative">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <span className="mr-2">💰</span> Payment Overview
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Last updated: {mounted ? lastPaymentUpdate.toLocaleTimeString() : 'Loading...'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
                    if (token) {
                      fetchBookings(token)
                    }
                  }}
                  className="text-sm bg-white px-3 py-1 rounded shadow hover:shadow-md transition-shadow flex items-center"
                  title="Click to refresh payment data"
                >
                  🔄 Refresh
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-gray-600 text-sm font-medium">Total Earned</p>
                  <p className="text-3xl font-bold text-blue-600">₹{calculatedPaymentStats.totalEarned}</p>
                  <p className="text-xs text-gray-500 mt-1">{calculatedPaymentStats.completedBookings} completed bookings</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-gray-600 text-sm font-medium">Completed Payments</p>
                  <p className="text-3xl font-bold text-green-600">₹{calculatedPaymentStats.totalPaid}</p>
                  <p className="text-xs text-gray-500 mt-1">{calculatedPaymentStats.paidBookings} payments received</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <p className="text-gray-600 text-sm font-medium">Outstanding</p>
                  <p className="text-3xl font-bold text-orange-600">₹{calculatedPaymentStats.outstanding}</p>
                  <p className="text-xs text-gray-500 mt-1">{calculatedPaymentStats.unpaidBookings} pending payments</p>
                </div>
              </div>

              {/* Payment Progress Chart */}
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-gray-700">Payment Progress</p>
                  <p className="text-sm text-gray-600">
                    {calculatedPaymentStats.totalEarned > 0 
                      ? Math.round((calculatedPaymentStats.totalPaid / calculatedPaymentStats.totalEarned) * 100)
                      : 0}% Received
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                    style={{ 
                      width: calculatedPaymentStats.totalEarned > 0 
                        ? `${(calculatedPaymentStats.totalPaid / calculatedPaymentStats.totalEarned) * 100}%`
                        : '0%'
                    }}
                  >
                    {calculatedPaymentStats.totalPaid > 0 && (
                      <span className="text-xs font-bold text-white">₹{calculatedPaymentStats.totalPaid}</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-600">
                  <span>Paid: ₹{calculatedPaymentStats.totalPaid}</span>
                  <span>Outstanding: ₹{calculatedPaymentStats.outstanding}</span>
                </div>
              </div>

              {calculatedPaymentStats.outstanding > 0 && (
                <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Outstanding payments will be processed by admin. You'll be notified once payments are completed.
                  </p>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="border-b border-gray-200">
                {/* Mobile Tab Selector */}
                <div className="md:hidden px-4 py-3">
                  <select
                    value={activeTab}
                    onChange={(e) => setActiveTab(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="all">All Bookings ({stats.total})</option>
                    <option value="untreated">Untreated ({stats.untreated})</option>
                    <option value="treated">Treated ({stats.treated})</option>
                    <option value="upcoming">📅 Upcoming ({stats.upcoming})</option>
                    <option value="completed">✓ Completed ({stats.completed})</option>
                    <option value="cancelled">❌ Cancelled ({stats.cancelled})</option>
                    <option value="slots">📅 Manage Slots</option>
                    <option value="payments">💰 Payments</option>
                    <option value="reviews">⭐ Reviews</option>
                    <option value="medical-forms">📋 Medical Forms</option>
                    {isCoreTeam && <option value="subscription">💳 Subscription Patients</option>}
                    <option value="prescription">📝 Prescription</option>
                  </select>
                </div>

                {/* Desktop Tab Navigation */}
                <nav className="hidden md:flex -mb-px overflow-x-auto scrollbar-hide">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'all'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    All Bookings ({stats.total})
                  </button>
                  <button
                    onClick={() => setActiveTab('untreated')}
                    className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'untreated'
                        ? 'border-b-2 border-orange-600 text-orange-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Untreated ({stats.untreated})
                  </button>
                  <button
                    onClick={() => setActiveTab('treated')}
                    className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'treated'
                        ? 'border-b-2 border-green-600 text-green-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Treated ({stats.treated})
                  </button>
                  <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'upcoming'
                        ? 'border-b-2 border-purple-600 text-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    📅 Upcoming ({stats.upcoming})
                  </button>
                  <button
                    onClick={() => setActiveTab('completed')}
                    className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'completed'
                        ? 'border-b-2 border-gray-600 text-gray-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    ✓ Completed ({stats.completed})
                  </button>
                  <button
                    onClick={() => setActiveTab('cancelled')}
                    className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'cancelled'
                        ? 'border-b-2 border-red-600 text-red-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    ❌ Cancelled ({stats.cancelled})
                  </button>

                  <button
                    onClick={() => setActiveTab('slots')}
                    className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'slots'
                        ? 'border-b-2 border-purple-600 text-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    📅 Manage Slots
                  </button>
                  <button
                    onClick={() => setActiveTab('payments')}
                    className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'payments'
                        ? 'border-b-2 border-green-600 text-green-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    💰 Payments
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'reviews'
                        ? 'border-b-2 border-yellow-600 text-yellow-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    ⭐ Reviews
                  </button>
                  <button
                    onClick={() => setActiveTab('medical-forms')}
                    className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'medical-forms'
                        ? 'border-b-2 border-teal-600 text-teal-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    📋 Medical Forms
                  </button>
                  <button
                    onClick={() => setActiveTab('prescription')}
                    className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'prescription'
                        ? 'border-b-2 border-indigo-600 text-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    📝 Prescription
                  </button>
                  {isCoreTeam && (
                    <button
                      onClick={() => setActiveTab('subscription')}
                      className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                        activeTab === 'subscription'
                          ? 'border-b-2 border-yellow-600 text-yellow-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      💳 Subscription
                    </button>
                  )}
                </nav>
              </div>
            </div>

            {/* Time Slot Management */}
            {activeTab === 'slots' && <TimeSlotManagement />}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Payment Details</h2>
                
                {/* Detailed Payment Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Earnings Summary */}
                  <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-500">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Earnings Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Bookings:</span>
                        <span className="font-bold text-gray-800">{calculatedPaymentStats.completedBookings}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Earned:</span>
                        <span className="font-bold text-blue-600 text-xl">₹{calculatedPaymentStats.totalEarned}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-gray-600">Per Booking Average:</span>
                        <span className="font-bold text-gray-700">
                          ₹{calculatedPaymentStats.completedBookings > 0 
                            ? Math.round(calculatedPaymentStats.totalEarned / calculatedPaymentStats.completedBookings)
                            : 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Status */}
                  <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-green-500">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Payment Status</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Paid Bookings:</span>
                        <span className="font-bold text-green-600">{calculatedPaymentStats.paidBookings}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Amount Received:</span>
                        <span className="font-bold text-green-600 text-xl">₹{calculatedPaymentStats.totalPaid}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-gray-600">Pending Bookings:</span>
                        <span className="font-bold text-orange-600">{calculatedPaymentStats.unpaidBookings}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Outstanding Amount:</span>
                        <span className="font-bold text-orange-600 text-xl">₹{calculatedPaymentStats.outstanding}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        <strong>Payment Information:</strong> You receive 70% from each consultation. 
                        Outstanding payments are processed by the admin and will be credited to your account soon.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Incentives Section */}
                <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-emerald-800">🎁 Incentives & Bonuses</h3>
                    <span className="text-2xl font-bold text-emerald-700">₹{incentivesTotal.toLocaleString()}</span>
                  </div>
                  {incentives.length === 0 ? (
                    <p className="text-sm text-emerald-600">No incentives received yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {incentives.map(inc => (
                        <div key={inc._id} className="bg-white rounded-lg px-4 py-3 flex items-center justify-between shadow-sm">
                          <div>
                            <p className="text-sm font-medium text-gray-800">"{inc.reason}"</p>
                            <p className="text-xs text-gray-400">{new Date(inc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          </div>
                          <span className="text-lg font-bold text-emerald-600">+₹{inc.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Patient Reviews & Feedback</h2>
                
                {/* Summary Card */}
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg shadow-lg mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow text-center">
                      <p className="text-gray-600 text-sm font-medium">Average Rating</p>
                      <p className="text-4xl font-bold text-yellow-600 my-2">
                        {reviews.averageRating.toFixed(1)}
                      </p>
                      <div className="flex justify-center">
                        {[1, 2, 3, 4, 5].map(star => (
                          <span key={star} className="text-2xl">
                            {star <= Math.round(reviews.averageRating) ? '⭐' : '☆'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow text-center">
                      <p className="text-gray-600 text-sm font-medium">Total Reviews</p>
                      <p className="text-4xl font-bold text-blue-600 my-2">{reviews.totalReviews}</p>
                      <p className="text-xs text-gray-500">from patients</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow text-center">
                      <p className="text-gray-600 text-sm font-medium">Satisfaction Rate</p>
                      <p className="text-4xl font-bold text-green-600 my-2">
                        {reviews.totalReviews > 0 
                          ? Math.round((reviews.averageRating / 5) * 100)
                          : 0}%
                      </p>
                      <p className="text-xs text-gray-500">patient satisfaction</p>
                    </div>
                  </div>
                </div>

                {/* Reviews List */}
                {reviews.reviews.length === 0 ? (
                  <div className="bg-white p-8 rounded-lg shadow text-center">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <p className="text-gray-600 text-lg">No reviews yet</p>
                    <p className="text-gray-500 text-sm mt-2">Complete bookings to receive patient feedback</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.reviews.map((review) => (
                      <div key={review._id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold text-gray-800">
                              {review.patientId?.name || 'Anonymous'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {mounted ? new Date(review.review.submittedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              }) : 'Loading...'}
                            </p>
                          </div>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map(star => (
                              <span key={star} className="text-xl">
                                {star <= review.review.rating ? '⭐' : '☆'}
                              </span>
                            ))}
                            <span className="ml-2 text-sm font-bold text-gray-700">
                              {review.review.rating}/5
                            </span>
                          </div>
                        </div>
                        {review.review.feedback && (
                          <div className="bg-gray-50 p-3 rounded mt-3">
                            <p className="text-sm text-gray-700 italic">"{review.review.feedback}"</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Session Date: {mounted ? new Date(review.slotDate).toLocaleDateString() : 'Loading...'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Medical Forms Tab */}
            {activeTab === 'medical-forms' && (
              <MedicalFormsTabContent />
            )}

            {/* Subscription Patients Tab */}
            {activeTab === 'subscription' && (
              <SubscriptionPatientsTab
                patients={subscriptionPatients}
                loading={subscriptionPatientsLoading}
                currentUserId={user?._id || user?.id}
                onRefresh={() => fetchSubscriptionPatients(localStorage.getItem('token'))}
              />
            )}

            {/* Prescription Tab */}
            {activeTab === 'prescription' && (
              <div className="bg-white rounded-xl shadow p-8 text-center">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Generate Prescription</h2>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Create a professional prescription PDF with your details prefilled. Just enter patient info and medicines.
                </p>
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6 text-left max-w-md mx-auto">
                  <p className="text-sm font-semibold text-indigo-700 mb-2">What gets prefilled automatically:</p>
                  <ul className="text-sm text-indigo-600 space-y-1">
                    <li>✓ Your name & registration number</li>
                    <li>✓ Qualification & specialization</li>
                    <li>✓ DRx Consult letterhead & branding</li>
                    <li>✓ Disclaimer & signature block</li>
                  </ul>
                </div>
                <button
                  onClick={() => setShowPrescription(true)}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold text-lg hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Prescription</span>
                </button>
              </div>
            )}

            {/* Date Filter - Only show for booking tabs */}
            {activeTab !== 'slots' && activeTab !== 'payments' && activeTab !== 'reviews' && activeTab !== 'medical-forms' && activeTab !== 'prescription' && activeTab !== 'subscription' && (
              <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Filter by Date:</span>
                  <button
                    onClick={() => setDateFilter('today')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      dateFilter === 'today'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setDateFilter('last7days')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      dateFilter === 'last7days'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Last 7 Days
                  </button>
                  <button
                    onClick={() => setDateFilter('last30days')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      dateFilter === 'last30days'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Last 30 Days
                  </button>
                  <button
                    onClick={() => setDateFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      dateFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All Time
                  </button>
                  {dateFilter !== 'all' && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({filteredBookings.length} consultations)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Bookings List */}
            {activeTab !== 'slots' && activeTab !== 'payments' && activeTab !== 'reviews' && activeTab !== 'medical-forms' && activeTab !== 'prescription' && activeTab !== 'subscription' && <h2 className="text-2xl font-bold mb-4">Consultations</h2>}
            {activeTab !== 'slots' && activeTab !== 'payments' && activeTab !== 'reviews' && activeTab !== 'medical-forms' && activeTab !== 'prescription' && activeTab !== 'subscription' && loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : activeTab !== 'slots' && activeTab !== 'payments' && activeTab !== 'reviews' && activeTab !== 'medical-forms' && activeTab !== 'prescription' && activeTab !== 'subscription' && filteredBookings.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <p className="text-gray-600">No bookings in this category</p>
              </div>
            ) : activeTab !== 'slots' && activeTab !== 'payments' && activeTab !== 'reviews' && activeTab !== 'medical-forms' && activeTab !== 'prescription' && activeTab !== 'subscription' && (
              <div className="space-y-4">
                {filteredBookings.map(booking => (
                  <div key={booking._id} className="bg-white p-6 rounded-lg shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <p className="font-semibold text-lg">Patient: {booking.patientId?.name}</p>
                          <span className={`ml-3 px-2 py-1 text-xs rounded-full font-medium ${
                            booking.serviceType === 'prescription_review' 
                              ? 'bg-blue-100 text-blue-700' 
                              : booking.serviceType === 'doctor_consultation'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {booking.serviceType === 'prescription_review' 
                              ? '📋 Prescription Review' 
                              : booking.serviceType === 'doctor_consultation'
                              ? '🩺 Doctor Consultation'
                              : '💊 Full Consultation'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">Email: {booking.patientId?.email}</p>
                        <p className="text-sm">Date: {mounted ? new Date(booking.slotDate).toLocaleDateString() : 'Loading...'}</p>
                        <p className="text-sm">Time: {booking.slotTime}</p>
                        
                        {/* Patient Details */}
                        {booking.patientDetails && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <h4 className="text-sm font-semibold text-gray-800 mb-2">Patient Information:</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                              <div><strong>Age:</strong> {booking.patientDetails.age} years</div>
                              <div><strong>Sex:</strong> {booking.patientDetails.sex}</div>
                            </div>
                            {booking.patientDetails.prescriptionUrl && (
                              <div className="mt-2">
                                <strong className="text-sm text-gray-800">Prescription:</strong>
                                <a
                                  href={booking.patientDetails.prescriptionUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 text-blue-600 hover:underline text-sm"
                                >
                                  📄 View Prescription
                                </a>
                              </div>
                            )}
                            {booking.patientDetails.additionalNotes && (
                              <div className="mt-2">
                                <strong className="text-sm text-gray-800">Notes:</strong>
                                <p className="text-sm text-gray-600 mt-1 italic">"{booking.patientDetails.additionalNotes}"</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {booking.status}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            booking.treatmentStatus === 'treated'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {booking.treatmentStatus === 'treated' ? '✓ Treated' : '⏳ Untreated'}
                          </span>
                          {/* Payment Status Badge */}
                          {booking.status === 'completed' && (
                            <span className={`text-xs px-2 py-1 rounded font-medium ${
                              booking.doctorPaid
                                ? 'bg-green-100 text-green-700 border border-green-300'
                                : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                            }`}>
                              {booking.doctorPaid ? '💰 Payment Received' : '⏳ Payment Pending'}
                            </span>
                          )}
                        </div>
                        {/* Payment Amount Display */}
                        {booking.status === 'completed' && (
                          <p className="text-sm text-gray-600 mt-1">
                            Your share: <span className="font-semibold text-gray-800">₹{booking.doctorShare || Math.round((booking.paymentAmount || 0) * 0.5)}</span>
                            <span className="text-xs text-gray-500 ml-1">
                              (from ₹{booking.paymentAmount || 0} consultation)
                            </span>
                            {booking.doctorPaid && booking.paidAt && (
                              <span className="text-xs text-green-600 ml-2">
                                (Paid on {mounted ? new Date(booking.paidAt).toLocaleDateString() : 'Loading...'})
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="space-x-2">
                        {booking.meetLink && booking.status === 'confirmed' && (
                          <a 
                            href={booking.meetLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                          >
                            Join Meeting
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="border-t pt-4 space-y-3">
                      {/* Completed Booking - Read Only */}
                      {booking.status === 'completed' && (
                        <div className="bg-green-50 p-3 rounded">
                          <p className="text-green-800 font-medium">✓ Treatment Completed</p>
                          <p className="text-sm text-green-600">This booking is closed. No further actions available.</p>
                        </div>
                      )}

                      {/* Add Meeting Link - Only for confirmed bookings without link */}
                      {booking.status === 'confirmed' && !booking.meetLink && (
                        <div className="bg-blue-50 p-3 rounded">
                          {addingMeetLink === booking._id ? (
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">
                                Enter Google Meet Link:
                              </label>
                              <input
                                type="url"
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
                                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                                value={meetLinkInput}
                                onChange={(e) => setMeetLinkInput(e.target.value)}
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleAddMeetLink(booking._id)}
                                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                                >
                                  Save Link
                                </button>
                                <button
                                  onClick={() => {
                                    setAddingMeetLink(null)
                                    setMeetLinkInput('')
                                  }}
                                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-blue-800 mb-2">
                                ⚠️ No meeting link added yet. Patient cannot join until you add one.
                              </p>
                              <button
                                onClick={() => setAddingMeetLink(booking._id)}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                              >
                                📹 Add Meeting Link
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Show Meeting Link if added */}
                      {booking.status === 'confirmed' && booking.meetLink && (
                        <div className="bg-green-50 p-3 rounded">
                          <p className="text-sm text-green-800 font-medium mb-2">✓ Meeting Link Added</p>
                          <a
                            href={booking.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline break-all"
                          >
                            {booking.meetLink}
                          </a>
                        </div>
                      )}

                      {/* Requirements Checklist - Only for confirmed bookings */}
                      {booking.status === 'confirmed' && (
                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                          <p className="text-sm font-semibold text-blue-900 mb-2">Requirements to Mark as Treated:</p>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center">
                              {booking.meetLink && booking.meetLink.trim() !== '' ? (
                                <span className="text-green-600 mr-2">✓</span>
                              ) : (
                                <span className="text-red-600 mr-2">✗</span>
                              )}
                              <span className={booking.meetLink && booking.meetLink.trim() !== '' ? 'text-green-700' : 'text-red-700'}>
                                Meeting link added
                              </span>
                            </div>
                            <div className="flex items-center">
                              {booking.testResults && booking.testResults.length > 0 ? (
                                <span className="text-green-600 mr-2">✓</span>
                              ) : (
                                <span className="text-red-600 mr-2">✗</span>
                              )}
                              <span className={booking.testResults && booking.testResults.length > 0 ? 'text-green-700' : 'text-red-700'}>
                                Test results uploaded
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Treatment Status Toggle - Only for confirmed bookings */}
                      {booking.status === 'confirmed' && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">Treatment Status:</span>
                          <button
                            onClick={() => handleTreatmentStatus(booking._id, 'untreated')}
                            className={`px-3 py-1 rounded text-sm ${
                              booking.treatmentStatus === 'untreated'
                                ? 'bg-orange-600 text-white'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            Untreated
                          </button>
                          <button
                            onClick={() => handleTreatmentStatus(booking._id, 'treated')}
                            disabled={!booking.meetLink || !booking.testResults || booking.testResults.length === 0}
                            className={`px-3 py-1 rounded text-sm ${
                              booking.treatmentStatus === 'treated'
                                ? 'bg-green-600 text-white'
                                : (!booking.meetLink || !booking.testResults || booking.testResults.length === 0)
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                            }`}
                            title={(!booking.meetLink || !booking.testResults || booking.testResults.length === 0) 
                              ? 'Complete all requirements first' 
                              : 'Mark as treated and complete booking'}
                          >
                            Mark as Treated & Complete
                          </button>
                        </div>
                      )}

                      {/* Upload Test Result - Only for confirmed bookings */}
                      {booking.status === 'confirmed' && showPdfUploader === booking._id ? (
                        <div className="border-t pt-3 mt-3">
                          <PdfUploader 
                            onUploadSuccess={(data) => handlePdfUploadSuccess(data.url, data.filename, booking._id)}
                            uploadType="pdf"
                            label="Upload Test Result PDF"
                          />
                          <button
                            onClick={() => setShowPdfUploader(null)}
                            className="mt-2 text-sm text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : booking.status === 'confirmed' && (
                        <button
                          onClick={() => setShowPdfUploader(booking._id)}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                        >
                          📄 Upload Test Result PDF
                        </button>
                      )}

                      {/* Upload Report - Only for confirmed bookings */}
                      {booking.status === 'confirmed' && (
                        <button 
                          onClick={() => router.push(`/doctor/upload-report/${booking._id}`)}
                          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm ml-2"
                        >
                          📋 Upload Consultation Report
                        </button>
                      )}

                      {/* Cancel and Reschedule Buttons */}
                      {booking.status === 'confirmed' && (
                        <div className="mt-3 space-x-2">
                          <button
                            onClick={() => handleCancelBooking(booking._id)}
                            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
                          >
                            ❌ Cancel Booking
                          </button>
                          <button
                            onClick={() => setRescheduling(booking._id)}
                            className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 text-sm"
                          >
                            📅 Reschedule
                          </button>
                        </div>
                      )}

                      {/* Reschedule Form */}
                      {rescheduling === booking._id && (
                        <div className="mt-3 p-4 bg-gray-50 rounded">
                          <p className="font-medium mb-2">Reschedule Booking:</p>
                          <div className="space-y-2">
                            <div>
                              <label className="block text-sm mb-1">New Date:</label>
                              <input
                                type="date"
                                className="w-full px-3 py-2 border rounded"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                              />
                            </div>
                            <div>
                              <label className="block text-sm mb-1">New Time:</label>
                              <input
                                type="time"
                                className="w-full px-3 py-2 border rounded"
                                value={newTime}
                                onChange={(e) => setNewTime(e.target.value)}
                              />
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleRescheduleBooking(booking._id)}
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                              >
                                Confirm Reschedule
                              </button>
                              <button
                                onClick={() => {
                                  setRescheduling(null)
                                  setNewDate('')
                                  setNewTime('')
                                }}
                                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Show Test Results */}
                      {booking.testResults && booking.testResults.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium mb-2">Test Results:</p>
                          <div className="space-y-2">
                            {booking.testResults.map((url, index) => (
                              <div key={index} className="border rounded-lg p-3 bg-gray-50">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                    </svg>
                                    <span className="text-sm font-medium">Test Result {index + 1}</span>
                                  </div>
                                  <div className="flex space-x-2">
                                    <PdfViewer 
                                      url={url} 
                                      filename={`test-result-${index + 1}.pdf`}
                                    />
                                  </div>
                                </div>
                                
                                {/* Alternative Simple Viewer */}
                                <details className="mt-2">
                                  <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                                    Alternative PDF Viewer (if above doesn't work)
                                  </summary>
                                  <div className="mt-2 border rounded" style={{ height: '400px' }}>
                                    <SimplePdfViewer 
                                      url={url} 
                                      filename={`test-result-${index + 1}.pdf`}
                                    />
                                  </div>
                                </details>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>

    {/* Prescription Generator Modal */}
    {showPrescription && (
      <PrescriptionGenerator
        doctor={doctorProfile}
        user={user}
        onClose={() => setShowPrescription(false)}
        onSignatureUpdate={(url) => setDoctorProfile(prev => prev ? { ...prev, signatureUrl: url } : prev)}
      />
    )}
    </>
  )
}
// Medical Forms Tab Component for Doctor (same as Pharmacist)
function MedicalFormsTabContent() {
  const [assignedForms, setAssignedForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadingResult, setUploadingResult] = useState(null)
  const [resultNotes, setResultNotes] = useState({})

  useEffect(() => {
    fetchAssignedForms()
  }, [])

  const fetchAssignedForms = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/medical-forms/assigned-to-me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAssignedForms(response.data)
    } catch (error) {
      console.error('Error fetching assigned forms:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResultUpload = async (formId, resultUrl) => {
    setUploadingResult(formId)
    try {
      const token = localStorage.getItem('token')
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/medical-forms/${formId}/result`, {
        resultPdfUrl: resultUrl,
        resultNotes: resultNotes[formId] || ''
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast.success('Result uploaded successfully!')
      fetchAssignedForms()
      setResultNotes(prev => ({ ...prev, [formId]: '' }))
    } catch (error) {
      console.error('Error uploading result:', error)
      toast.error(error.response?.data?.message || 'Failed to upload result')
    } finally {
      setUploadingResult(null)
    }
  }

  const handlePdfUploadSuccess = (data, formId) => {
    handleResultUpload(formId, data.url)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        <p className="mt-2 text-gray-600">Loading assigned medical forms...</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">📋 Assigned Medical Forms</h2>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm font-medium">Assigned to Me</p>
          <p className="text-3xl font-bold text-blue-600">
            {assignedForms.filter(f => f.status === 'assigned').length}
          </p>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm font-medium">Completed</p>
          <p className="text-3xl font-bold text-green-600">
            {assignedForms.filter(f => f.status === 'completed').length}
          </p>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm font-medium">Total Forms</p>
          <p className="text-3xl font-bold text-purple-600">{assignedForms.length}</p>
        </div>
      </div>

      {assignedForms.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No assigned forms</h3>
          <p className="mt-1 text-sm text-gray-500">No medical forms have been assigned to you yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {assignedForms.map((form) => (
            <div key={form._id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{form.patientName}</h4>
                  <p className="text-sm text-gray-600">
                    Age: {form.age} | Sex: {form.sex}
                  </p>
                  <p className="text-sm text-gray-500">
                    Submitted: {new Date(form.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    Patient: {form.patientId?.name} ({form.patientId?.email})
                  </p>
                  {form.assignedAt && (
                    <p className="text-sm text-gray-500">
                      Assigned: {new Date(form.assignedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(form.status)}`}>
                  {form.status === 'assigned' ? 'Pending Review' : 'Completed'}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Prescription Details:</strong>
                </p>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {form.prescriptionDetails}
                </p>
                {form.additionalNotes && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-700 mb-1">
                      <strong>Additional Notes:</strong>
                    </p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                      {form.additionalNotes}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2">
                  {form.prescriptionUrl && (
                    <button
                      onClick={() => window.open(form.prescriptionUrl, '_blank')}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      📄 View Prescription
                    </button>
                  )}
                  {form.resultPdfUrl && (
                    <button
                      onClick={() => window.open(form.resultPdfUrl, '_blank')}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      📋 View Result
                    </button>
                  )}
                </div>
              </div>

              {form.status === 'assigned' && (
                <div className="border-t pt-4">
                  <h5 className="text-sm font-semibold text-gray-800 mb-3">Upload Result</h5>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Result Notes (Optional)
                    </label>
                    <textarea
                      value={resultNotes[form._id] || ''}
                      onChange={(e) => setResultNotes(prev => ({ ...prev, [form._id]: e.target.value }))}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add any notes about the analysis or recommendations..."
                    />
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <PdfUploader 
                      onUploadSuccess={(data) => handlePdfUploadSuccess(data, form._id)}
                      uploadType="pdf"
                      label="Upload Result PDF"
                      disabled={uploadingResult === form._id}
                    />
                    {uploadingResult === form._id && (
                      <div className="mt-2 text-center">
                        <div className="inline-flex items-center text-sm text-gray-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                          Uploading result...
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {form.status === 'completed' && (
                <div className="border-t pt-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">
                      ✅ Result Uploaded Successfully
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      Completed on: {new Date(form.completedAt).toLocaleDateString()}
                    </p>
                    {form.resultNotes && (
                      <div className="mt-2">
                        <p className="text-sm text-green-700 font-medium">Your Notes:</p>
                        <p className="text-sm text-green-600 mt-1">{form.resultNotes}</p>
                      </div>
                    )}
                    <p className="text-sm text-green-600 mt-2">
                      Patient will pay ₹{form.paymentAmount} to download the result.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
