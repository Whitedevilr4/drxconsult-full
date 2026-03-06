import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import SEO from '../../components/SEO';
import BedReservationTimer from '../../components/BedReservationTimer';
import axios from '../../lib/axios';
import { useSocket } from '../../hooks/useSocket';
import { showNotification } from '../../utils/browserNotification';

export default function HospitalDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hospital, setHospital] = useState(null);
  const [pendingQueries, setPendingQueries] = useState([]);
  const [acceptedQueries, setAcceptedQueries] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [dateFilter, setDateFilter] = useState('all'); // all, past_month, this_month, 3_months, 6_months, 1_year
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [selectedBookingForOTP, setSelectedBookingForOTP] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const { isConnected, onNewQuery, offNewQuery } = useSocket();

  useEffect(() => {
    fetchHospitalData();
    fetchQueries();
    fetchBookings();
  }, []);

  // Listen for new queries in real-time
  useEffect(() => {
    console.log('🔌 Hospital Dashboard - Socket connection status:', isConnected);
    
    if (isConnected) {
      console.log('✅ Setting up new-query listener');
      
      const handleNewQuery = async (queryData) => {
        console.log('🆕 New query received in hospital dashboard:', queryData);
        
        // Show browser notification
        showNotification('hospitalQueryNew', 
          queryData.queryType.replace('_', ' '),
          queryData.userName
        );
        
        // Fetch the full query details from backend
        try {
          const response = await axios.get(`/hospital-queries/${queryData.queryId}`);
          const fullQuery = response.data;
          
          console.log('✅ Full query data fetched:', fullQuery);
          
          // Add to pending queries state immediately
          setPendingQueries(prev => {
            // Check if query already exists
            const exists = prev.some(q => q._id === fullQuery._id);
            if (exists) {
              console.log('⚠️ Query already in list');
              return prev;
            }
            console.log('➕ Adding query to pending list');
            return [fullQuery, ...prev]; // Add to beginning of array
          });
          
          // Show visual alert
          alert(`New Query: ${queryData.queryType.replace('_', ' ')} from ${queryData.userName}`);
          
        } catch (error) {
          console.error('❌ Error fetching query details:', error);
          // Fallback: refresh all queries
          console.log('🔄 Falling back to full refresh...');
          fetchQueries();
        }
      };

      // Listen for payment confirmations
      const handlePaymentConfirmed = (data) => {
        console.log('💰 Payment confirmed event received in hospital dashboard:', data);
        
        // Show browser notification
        showNotification('bookingConfirmed', 'Patient');
        
        // Refresh bookings to show updated status
        fetchBookings();
      };

      // Listen for booking initiated events
      const handleBookingInitiated = (data) => {
        console.log('📋 Booking initiated event received in hospital dashboard:', data);
        
        // Refresh bookings to show new booking
        fetchBookings();
      };
      
      onNewQuery(handleNewQuery);
      console.log('✅ new-query listener attached');

      // Setup payment confirmation and booking listeners
      const io = window.io;
      if (io) {
        io.on('payment-confirmed', handlePaymentConfirmed);
        io.on('booking-payment-confirmed', handlePaymentConfirmed);
        io.on('booking-initiated', handleBookingInitiated);
        io.on('ambulance-booking-created', handleBookingInitiated);
        console.log('✅ payment and booking listeners attached');
      }

      return () => {
        console.log('🧹 Cleaning up listeners');
        offNewQuery();
        if (io) {
          io.off('payment-confirmed', handlePaymentConfirmed);
          io.off('booking-payment-confirmed', handlePaymentConfirmed);
          io.off('booking-initiated', handleBookingInitiated);
          io.off('ambulance-booking-created', handleBookingInitiated);
        }
      };
    } else {
      console.log('⏳ Waiting for socket connection...');
    }
  }, [isConnected]);

  const fetchHospitalData = async () => {
    try {
      const response = await axios.get('/hospitals/profile');
      setHospital(response.data);
    } catch (error) {
      console.error('Error fetching hospital data:', error);
      if (error.response?.status === 401) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchQueries = async () => {
    try {
      const [pending, accepted] = await Promise.all([
        axios.get('/hospitals/queries/pending'),
        axios.get('/hospitals/queries/accepted')
      ]);
      setPendingQueries(pending.data);
      setAcceptedQueries(accepted.data);
    } catch (error) {
      console.error('Error fetching queries:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      // Get all bookings for accepted queries
      const response = await axios.get('/hospital-bookings/hospital/all');
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleAcceptQuery = async (queryId) => {
    const availableBeds = prompt('Enter available beds:');
    if (!availableBeds) return;

    try {
      await axios.post(`/hospitals/queries/${queryId}/accept`, {
        availableBeds: parseInt(availableBeds)
      });
      alert('Query accepted successfully!');
      fetchQueries();
    } catch (error) {
      console.error('Error accepting query:', error);
      alert('Failed to accept query');
    }
  };

  const handleRejectQuery = async (queryId) => {
    const reason = prompt('Enter rejection reason (optional):');
    
    try {
      await axios.post(`/hospitals/queries/${queryId}/reject`, {
        reason: reason || 'No beds available'
      });
      alert('Query rejected successfully!');
      fetchQueries();
    } catch (error) {
      console.error('Error rejecting query:', error);
      alert('Failed to reject query');
    }
  };

  const handleUpdateBeds = async () => {
    const availableBeds = prompt('Enter available general beds:', hospital?.availableBeds || 0);
    const availableIcuBeds = prompt('Enter available ICU beds:', hospital?.availableIcuBeds || 0);

    if (availableBeds === null || availableIcuBeds === null) return;

    try {
      await axios.put('/hospitals/beds', {
        availableBeds: parseInt(availableBeds),
        availableIcuBeds: parseInt(availableIcuBeds)
      });
      alert('Bed availability updated successfully!');
      fetchHospitalData();
    } catch (error) {
      console.error('Error updating beds:', error);
      alert('Failed to update bed availability');
    }
  };

  const testSocketConnection = () => {
    console.log('🧪 Testing socket connection...');
    console.log('Socket connected:', isConnected);
    console.log('Socket object:', window.io);
    
    if (window.io) {
      console.log('Socket ID:', window.io.id);
      console.log('Socket connected status:', window.io.connected);
      
      // Test emit
      window.io.emit('test-event', { test: 'from hospital dashboard' });
      console.log('✅ Test event emitted');
      
      alert(`Socket ${isConnected ? 'Connected' : 'Disconnected'}\nSocket ID: ${window.io?.id || 'N/A'}`);
    } else {
      alert('Socket not initialized');
    }
  };

  const openChat = (queryId) => {
    router.push(`/hospital/chat/${queryId}`);
  };

  const handlePatientArrival = async (bookingId, arrivalStatus) => {
    if (arrivalStatus === 'arrived') {
      // Show OTP modal for arrived status
      const booking = bookings.find(b => b._id === bookingId);
      setSelectedBookingForOTP(booking);
      setShowOTPModal(true);
      setOtpInput('');
      setOtpError('');
      setOtpAttempts(booking?.otpVerificationAttempts || 0);
      return;
    }
    
    // For not_arrived, proceed without OTP
    const confirmMessage = 'Are you sure the patient did not arrive? This will cancel the booking.';
    
    if (!confirm(confirmMessage)) return;

    try {
      await axios.put(`/hospital-bookings/bed/${bookingId}/patient-arrival`, {
        arrivalStatus
      });
      alert('Patient marked as not arrived');
      fetchBookings();
    } catch (error) {
      console.error('Error updating patient arrival:', error);
      alert('Failed to update patient arrival status');
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpInput || otpInput.length !== 6) {
      setOtpError('Please enter a 6-digit OTP');
      return;
    }

    setVerifyingOTP(true);
    setOtpError('');

    try {
      const response = await axios.post(
        `/hospital-bookings/bed/${selectedBookingForOTP._id}/verify-arrival-otp`,
        { otp: otpInput }
      );

      if (response.data.success) {
        alert('Patient arrival verified successfully!');
        setShowOTPModal(false);
        setSelectedBookingForOTP(null);
        setOtpInput('');
        fetchBookings();
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      const errorData = error.response?.data;
      
      if (errorData?.failedAttempts) {
        setOtpError('OTP verification failed after 3 attempts. Patient marked as arrived with faulty entry. Please contact DRX Consult.');
        setTimeout(() => {
          setShowOTPModal(false);
          setSelectedBookingForOTP(null);
          fetchBookings();
        }, 3000);
      } else if (errorData?.attemptsRemaining !== undefined) {
        setOtpError(`Incorrect OTP. ${errorData.attemptsRemaining} attempts remaining.`);
        setOtpAttempts(errorData.currentAttempts);
      } else {
        setOtpError(errorData?.message || 'Failed to verify OTP');
      }
    } finally {
      setVerifyingOTP(false);
    }
  };

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
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="Hospital Dashboard" />
      
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Hospital Dashboard</h1>
                <p className="mt-2 text-gray-600">Welcome, {hospital?.hospitalName}</p>
              </div>
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <span className="flex items-center text-sm bg-green-100 text-green-800 px-3 py-1.5 rounded-full font-medium">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    Real-time Connected
                  </span>
                ) : (
                  <span className="flex items-center text-sm bg-red-100 text-red-800 px-3 py-1.5 rounded-full font-medium">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    Disconnected
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Hospital Info Card */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold mb-2">{hospital?.hospitalName}</h2>
                <p className="text-gray-600">{hospital?.address}, {hospital?.city}</p>
                <p className="text-gray-600">📞 {hospital?.contactNumber}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={testSocketConnection}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm"
                >
                  Test Connection
                </button>
                <button
                  onClick={handleUpdateBeds}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Update Bed Availability
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Available Beds</p>
                <p className="text-2xl font-bold text-green-600">
                  {hospital?.availableBeds}/{hospital?.totalBeds}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">ICU Beds</p>
                <p className="text-2xl font-bold text-red-600">
                  {hospital?.availableIcuBeds}/{hospital?.icuBeds}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Pending Queries</p>
                <p className="text-2xl font-bold text-blue-600">{pendingQueries.length}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Accepted Queries</p>
                <p className="text-2xl font-bold text-purple-600">{acceptedQueries.length}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white shadow rounded-lg">
            <div className="border-b border-gray-200">
              <div className="flex items-center justify-between px-6 py-3">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-6 py-3 text-sm font-medium ${
                      activeTab === 'pending'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Pending Queries ({filterQueriesByDate(pendingQueries).length})
                  </button>
                  <button
                    onClick={() => setActiveTab('accepted')}
                    className={`px-6 py-3 text-sm font-medium ${
                      activeTab === 'accepted'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Accepted Queries ({filterQueriesByDate(acceptedQueries).length})
                  </button>
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className={`px-6 py-3 text-sm font-medium ${
                      activeTab === 'bookings'
                        ? 'border-b-2 border-green-500 text-green-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Bookings ({bookings.length})
                  </button>
                </nav>
                
                {/* Date Filter Dropdown */}
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            <div className="p-6">
              {activeTab === 'pending' && (
                <div className="space-y-4">
                  {filterQueriesByDate(pendingQueries).length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No pending queries</p>
                  ) : (
                    filterQueriesByDate(pendingQueries).map((query) => (
                      <div key={query._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">
                              {query.queryType.replace('_', ' ').toUpperCase()}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Patient: {query.userId?.name}
                            </p>
                            {query.bedType && (
                              <p className="text-sm text-gray-600">
                                Bed Type: {query.bedType.toUpperCase()}
                              </p>
                            )}
                            {query.specialization && (
                              <p className="text-sm text-gray-600">
                                Specialization: {query.specialization}
                              </p>
                            )}
                            {query.description && (
                              <p className="text-sm text-gray-700 mt-2">{query.description}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(query.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleAcceptQuery(query._id)}
                              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectQuery(query._id)}
                              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'accepted' && (
                <div className="space-y-4">
                  {filterQueriesByDate(acceptedQueries).length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No accepted queries</p>
                  ) : (
                    filterQueriesByDate(acceptedQueries).map((query) => (
                      <div key={query._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">
                              {query.queryType.replace('_', ' ').toUpperCase()}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Patient: {query.userId?.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              Contact: {query.userId?.phone || query.userId?.email}
                            </p>
                            {query.description && (
                              <p className="text-sm text-gray-700 mt-2">{query.description}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              Accepted: {new Date(query.acceptedAt).toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() => openChat(query._id)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                          >
                            Open Chat
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'bookings' && (
                <div className="space-y-4">
                  {bookings.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No bookings yet</p>
                  ) : (
                    bookings.map((booking) => (
                      <div key={booking._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
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
                              <h3 className="font-semibold text-lg capitalize">{booking.bookingType} Booking</h3>
                              <p className="text-sm text-gray-600 mt-1">
                                Patient: {booking.userId?.name}
                              </p>
                              <p className="text-sm text-gray-600">
                                Contact: {booking.userId?.phoneNumber || booking.userId?.email}
                              </p>
                              <p className="text-sm font-medium text-gray-900 mt-2">
                                Amount: ₹{booking.paymentAmount}
                              </p>
                              {booking.bookingType === 'ambulance' && booking.ambulanceDetails && (
                                <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                  <p className="text-sm font-medium text-orange-900 mb-2">Ambulance Details:</p>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <p className="text-gray-600">Patient: <span className="text-gray-900 font-medium">{booking.ambulanceDetails.patientName}</span></p>
                                      <p className="text-gray-600">Age: <span className="text-gray-900 font-medium">{booking.ambulanceDetails.patientAge}</span></p>
                                      <p className="text-gray-600">Contact: <span className="text-gray-900 font-medium">{booking.ambulanceDetails.emergencyContact}</span></p>
                                    </div>
                                    <div>
                                      <p className="text-gray-600">Ambulance: <span className="text-gray-900 font-medium">{booking.ambulanceDetails.ambulanceNumber}</span></p>
                                      <p className="text-gray-600">Driver: <span className="text-gray-900 font-medium">{booking.ambulanceDetails.driverName}</span></p>
                                      <p className="text-gray-600">Driver Contact: <span className="text-gray-900 font-medium">{booking.ambulanceDetails.driverContact}</span></p>
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-600 mt-2">Pickup: <span className="text-gray-900 font-medium">{booking.ambulanceDetails.pickupLocation}</span></p>
                                </div>
                              )}
                              {booking.bookingType === 'bed' && (
                                <div className="mt-2">
                                  <p className="text-sm text-gray-600">Bed Type: <span className="text-gray-900 font-medium capitalize">{booking.bedType}</span></p>
                                  <p className="text-sm text-gray-600">Number of Beds: <span className="text-gray-900 font-medium">{booking.numberOfBeds}</span></p>
                                  
                                  {/* Bed Reservation Timer */}
                                  {booking.reservationExpiresAt && booking.paymentStatus === 'completed' && (
                                    <BedReservationTimer
                                      reservationExpiresAt={booking.reservationExpiresAt}
                                      bookingId={booking._id}
                                      isHospital={true}
                                      patientArrivalStatus={booking.patientArrivalStatus}
                                      status={booking.status}
                                    />
                                  )}
                                  
                                  {/* Patient Arrival Buttons */}
                                  {booking.patientArrivalStatus === 'pending' && booking.status === 'in_progress' && booking.paymentStatus === 'completed' && (
                                    <div className="mt-3 flex gap-2">
                                      {new Date(booking.reservationExpiresAt) < new Date() && (
                                        <button
                                          onClick={() => handlePatientArrival(booking._id, 'not_arrived')}
                                          className="flex-1 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                          <span>Patient Not Arrived</span>
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handlePatientArrival(booking._id, 'arrived')}
                                        className="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Patient Arrived</span>
                                      </button>
                                    </div>
                                  )}
                                  
                                  {/* Arrival Status Display */}
                                  {booking.patientArrivalStatus !== 'pending' && (
                                    <div className={`mt-3 p-2 rounded ${
                                      booking.patientArrivalStatus === 'arrived' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                                    }`}>
                                      <p className={`text-sm font-semibold ${
                                        booking.patientArrivalStatus === 'arrived' ? 'text-green-800' : 'text-red-800'
                                      }`}>
                                        {booking.patientArrivalStatus === 'arrived' ? '✓ Patient Arrived' : '✗ Patient Did Not Arrive'}
                                      </p>
                                      <p className="text-xs text-gray-600 mt-1">
                                        Marked at: {new Date(booking.patientArrivalMarkedAt).toLocaleString()}
                                      </p>
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
                              booking.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              Status: {booking.status.replace('_', ' ')}
                            </span>
                            {booking.queryId && (
                              <button
                                onClick={() => openChat(booking.queryId._id || booking.queryId)}
                                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                              >
                                View Chat
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOTPModal && selectedBookingForOTP && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Verify Patient Arrival</h3>
              <button
                onClick={() => {
                  setShowOTPModal(false);
                  setSelectedBookingForOTP(null);
                  setOtpInput('');
                  setOtpError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-blue-800 font-medium">
                      Patient: {selectedBookingForOTP.userId?.name}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Ask the patient for their 6-digit arrival OTP displayed on their dashboard.
                    </p>
                  </div>
                </div>
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter 6-Digit OTP
              </label>
              <input
                type="text"
                maxLength="6"
                value={otpInput}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setOtpInput(value);
                  setOtpError('');
                }}
                placeholder="000000"
                className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={verifyingOTP}
              />

              {otpAttempts > 0 && (
                <div className="mt-2 flex items-center text-sm text-yellow-600">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{otpAttempts} incorrect attempt{otpAttempts > 1 ? 's' : ''} made</span>
                </div>
              )}

              {otpError && (
                <div className="mt-3 bg-red-50 border-l-4 border-red-500 p-3 rounded">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-800">{otpError}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowOTPModal(false);
                  setSelectedBookingForOTP(null);
                  setOtpInput('');
                  setOtpError('');
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={verifyingOTP}
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyOTP}
                disabled={verifyingOTP || otpInput.length !== 6}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-400 transition-all font-medium shadow-lg flex items-center justify-center space-x-2"
              >
                {verifyingOTP ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Verify OTP</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                After 3 incorrect attempts, the system will mark arrival with "Faulty Entry - Contact DRX Consult"
              </p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
