import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import SEO from '../../../components/SEO';
import PaymentDisclaimer from '../../../components/PaymentDisclaimer';
import BedReservationTimer from '../../../components/BedReservationTimer';
import axios from '../../../lib/axios';
import { io } from 'socket.io-client';

// Use dedicated socket URL if set, otherwise strip /api from API URL
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace('/api', '');

export default function HospitalChat() {
  const router = useRouter();
  const { queryId } = router.query;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [queryInfo, setQueryInfo] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [closingQuery, setClosingQuery] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAmbulanceModal, setShowAmbulanceModal] = useState(false);
  const [showBedBookingModal, setShowBedBookingModal] = useState(false);
  const [showPaymentDisclaimer, setShowPaymentDisclaimer] = useState(false);
  const [pendingPaymentBooking, setPendingPaymentBooking] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState(null);
  const [bedBookingForm, setBedBookingForm] = useState({
    bedType: 'general',
    numberOfBeds: 1,
    paymentAmount: 49
  });
  const [ambulanceForm, setAmbulanceForm] = useState({
    patientName: '',
    patientAge: '',
    patientGender: 'male',
    pickupLocation: '',
    pickupLatitude: null,
    pickupLongitude: null,
    emergencyContact: '',
    medicalCondition: '',
    ambulanceType: 'basic',
    estimatedArrival: '',
    ambulanceNumber: '',
    driverName: '',
    driverContact: '',
    paymentAmount: 49
  });
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [selectedBookingForOTP, setSelectedBookingForOTP] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Get user role from localStorage
    if (typeof window !== 'undefined') {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');
      
      setUserRole(user.role);
      
      // Initialize socket connection
      if (token && !socketRef.current) {
        console.log('🔌 Initializing socket connection to:', SOCKET_URL);
        socketRef.current = io(SOCKET_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5
        });

        socketRef.current.on('connect', () => {
          console.log('✅ Socket connected:', socketRef.current.id);
          console.log('Socket object:', socketRef.current);
          console.log('Socket connected status:', socketRef.current.connected);
          setSocketConnected(true);
          
          // Test if events work at all
          console.log('🧪 Testing socket emit...');
          socketRef.current.emit('test-event', { test: 'data' });
          
          // Join room immediately if queryId is available
          if (queryId) {
            console.log('🚀 Joining room immediately on connect:', queryId);
            console.log('Emitting join-query-chat event...');
            socketRef.current.emit('join-query-chat', queryId);
            console.log('✅ Join event emitted');
            
            // Try again after a delay to be sure
            setTimeout(() => {
              console.log('🔄 Re-emitting join event...');
              socketRef.current.emit('join-query-chat', queryId);
            }, 1000);
          }
        });

        socketRef.current.on('disconnect', (reason) => {
          console.log('❌ Socket disconnected. Reason:', reason);
          setSocketConnected(false);
        });

        socketRef.current.on('connect_error', (error) => {
          console.error('❌ Socket connection error:', error);
          console.error('Error message:', error.message);
          console.error('Error type:', error.type);
          setSocketConnected(false);
        });
        
        // Listen for join confirmation
        socketRef.current.on('joined-room', (data) => {
          console.log('✅ Received join confirmation:', data);
        });
        
        console.log('Socket initialization complete. Waiting for connection...');
      } else if (!token) {
        console.error('❌ No token found! Cannot connect socket.');
      }
    }

    return () => {
      if (socketRef.current) {
        console.log('Disconnecting socket...');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [queryId]); // Add queryId as dependency

  useEffect(() => {
    if (queryId) {
      fetchMessages();
      fetchQueryInfo();
      fetchBookings();
    }
  }, [queryId]);

  // Join room and setup listeners when socket connects and queryId is available
  useEffect(() => {
    if (socketConnected && queryId && socketRef.current) {
      console.log('✅ Socket connected and queryId available');
      console.log('Emitting join-query-chat for:', queryId);
      socketRef.current.emit('join-query-chat', queryId);
      
      // Verify after a delay
      setTimeout(() => {
        console.log('Verifying room join...');
        console.log('Socket ID:', socketRef.current.id);
        console.log('Socket connected:', socketRef.current.connected);
      }, 1000);

      // Setup message listener
      const handleNewMessage = (messageData) => {
        console.log('📨 New message received via Socket.IO:', messageData);
        if (messageData.queryId === queryId || messageData.queryId?.toString() === queryId?.toString()) {
          setMessages(prev => {
            // Simple duplicate check by _id only (backend now prevents sender from receiving their own message)
            const isDuplicate = prev.some(msg => 
              msg._id === messageData._id || msg._id === messageData._id?.toString()
            );
            
            if (isDuplicate) {
              console.log('⚠️ Duplicate message detected, skipping');
              return prev;
            }
            
            console.log('✅ Adding new message from Socket.IO');
            return [...prev, messageData];
          });
          // Scroll will be handled by useEffect watching messages
        }
      };

      // Setup typing listener
      const handleTyping = (data) => {
        if (data.queryId === queryId || data.queryId?.toString() === queryId?.toString()) {
          setIsTyping(data.isTyping);
        }
      };

      // Setup query closed listener
      const handleQueryClosed = (data) => {
        if (data.queryId === queryId || data.queryId?.toString() === queryId?.toString()) {
          setQueryInfo(prev => ({ ...prev, status: 'completed' }));
          alert(`Query has been closed by ${data.hospitalName}`);
        }
      };

      // Setup payment confirmed listener
      const handlePaymentConfirmed = (data) => {
        console.log('💰 Payment confirmed event received:', data);
        console.log('Current queryId:', queryId);
        console.log('Event queryId:', data.queryId);
        
        if (data.queryId === queryId || data.queryId?.toString() === queryId?.toString()) {
          console.log('✅ QueryId matches - refreshing bookings');
          fetchBookings();
          const currentUserRole = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}').role : null;
          if (currentUserRole !== 'hospital') {
            alert('Payment confirmed! Booking is now active.');
          } else {
            // Hospital side - show subtle notification
            console.log('✅ Payment received for booking:', data.bookingType);
            alert('Payment received! Booking confirmed.');
          }
        } else {
          console.log('⚠️ QueryId does not match - ignoring event');
        }
      };

      // Setup booking initiated listener
      const handleBookingInitiated = (data) => {
        if (data.queryId === queryId || data.queryId?.toString() === queryId?.toString()) {
          fetchBookings();
          const currentUserRole = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}').role : null;
          if (currentUserRole !== 'hospital') {
            alert(`${data.hospitalName || 'Hospital'} has created a booking for you. Please complete payment.`);
          }
        }
      };

      // Setup ambulance booking listener
      const handleAmbulanceBookingCreated = (data) => {
        if (data.queryId === queryId || data.queryId?.toString() === queryId?.toString()) {
          fetchBookings();
          const currentUserRole = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}').role : null;
          if (currentUserRole !== 'hospital') {
            alert('Hospital has arranged an ambulance for you. Please check booking details.');
          }
        }
      };

      // Setup patient arrival listener
      const handlePatientArrivalUpdated = (data) => {
        if (data.bookingId) {
          fetchBookings();
        }
      };

      socketRef.current.on('new-message', handleNewMessage);
      socketRef.current.on('user-typing', handleTyping);
      socketRef.current.on('query-closed', handleQueryClosed);
      socketRef.current.on('payment-confirmed', handlePaymentConfirmed);
      socketRef.current.on('booking-initiated', handleBookingInitiated);
      socketRef.current.on('ambulance-booking-created', handleAmbulanceBookingCreated);
      socketRef.current.on('patient-arrival-updated', handlePatientArrivalUpdated);
      
      console.log('✅ Event listeners attached');

      return () => {
        if (socketRef.current) {
          console.log('🧹 Cleaning up listeners and leaving room');
          socketRef.current.emit('leave-query-chat', queryId);
          socketRef.current.off('new-message', handleNewMessage);
          socketRef.current.off('user-typing', handleTyping);
          socketRef.current.off('query-closed', handleQueryClosed);
          socketRef.current.off('payment-confirmed', handlePaymentConfirmed);
          socketRef.current.off('booking-initiated', handleBookingInitiated);
          socketRef.current.off('ambulance-booking-created', handleAmbulanceBookingCreated);
          socketRef.current.off('patient-arrival-updated', handlePatientArrivalUpdated);
        }
      };
    } else {
      console.log('⏳ Waiting for socket and queryId...');
      console.log('Socket connected:', socketConnected);
      console.log('QueryId:', queryId);
    }
  }, [socketConnected, queryId]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest'
        });
      });
    }
  };

  const fetchQueryInfo = async () => {
    try {
      const response = await axios.get(`/hospital-queries/${queryId}`);
      setQueryInfo(response.data);
    } catch (error) {
      console.error('Error fetching query info:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`/hospital-chats/${queryId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const tempId = 'temp-' + Date.now();
    const tempMessage = {
      _id: tempId,
      message: newMessage,
      senderType: userRole === 'hospital' ? 'hospital' : 'user',
      senderId: { _id: user._id || user.id, name: user.name },
      queryId,
      createdAt: new Date().toISOString(),
      sending: true
    };

    // 1. Show message instantly in sender's UI
    setMessages(prev => [...prev, tempMessage]);
    const messageToSend = newMessage;
    setNewMessage('');
    setSending(true);

    // 2. Relay to recipient instantly via socket (no backend hop)
    if (socketRef.current?.connected) {
      socketRef.current.emit('send-chat-message', {
        queryId,
        messageData: { ...tempMessage, sending: false }
      });
      socketRef.current.emit('typing', { queryId, isTyping: false });
    }

    // 3. Persist to DB in background
    try {
      const response = await axios.post(`/hospital-chats/${queryId}`, {
        message: messageToSend
      });
      // Replace temp with real saved message (has real _id)
      setMessages(prev => prev.map(msg =>
        msg._id === tempId ? response.data : msg
      ));
    } catch (error) {
      console.error('❌ Error saving message:', error);
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
      setNewMessage(messageToSend);
      alert('Failed to send message: ' + (error.response?.data?.message || error.message));
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (socketRef.current && socketRef.current.connected) {
      if (e.target.value.length > 0) {
        socketRef.current.emit('typing', { queryId, isTyping: true });
        
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
          socketRef.current.emit('typing', { queryId, isTyping: false });
        }, 1000);
      } else {
        socketRef.current.emit('typing', { queryId, isTyping: false });
      }
    }
  };

  const handleCloseQuery = async () => {
    if (!confirm('Are you sure you want to close this query? This action cannot be undone and will prevent further messages.')) {
      return;
    }

    setClosingQuery(true);
    try {
      await axios.post(`/hospitals/queries/${queryId}/close`);
      setQueryInfo(prev => ({ ...prev, status: 'completed' }));
      alert('Query closed successfully');
    } catch (error) {
      console.error('Error closing query:', error);
      alert('Failed to close query');
    } finally {
      setClosingQuery(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`/hospital-bookings/query/${queryId}`);
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleCreateBedBooking = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/hospital-bookings/bed/initiate', {
        queryId,
        ...bedBookingForm
      });
      alert('Bed booking created successfully! Patient will be notified to complete payment.');
      setShowBedBookingModal(false);
      fetchBookings();
      // Reset form
      setBedBookingForm({
        bedType: 'general',
        numberOfBeds: 1,
        paymentAmount: 49
      });
    } catch (error) {
      console.error('Error creating bed booking:', error);
      alert('Failed to create bed booking: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleInitiatePayment = async (booking) => {
    // Show disclaimer first
    setPendingPaymentBooking(booking);
    setShowPaymentDisclaimer(true);
  };

  const proceedWithPayment = async () => {
    const booking = pendingPaymentBooking;
    setShowPaymentDisclaimer(false);
    setPaymentLoading(true);
    setSelectedBookingForPayment(booking);
    
    try {
      const endpoint = booking.bookingType === 'bed' 
        ? `/hospital-bookings/bed/${booking._id}/create-order`
        : `/hospital-bookings/ambulance/${booking._id}/create-order`;
        
      const response = await axios.post(endpoint);

      const { razorpayOrder, razorpayKeyId } = response.data;

      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        const options = {
          key: razorpayKeyId,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: booking.bookingType === 'bed' ? 'Hospital Bed Booking' : 'Ambulance Booking',
          description: `${booking.bookingType} booking payment`,
          order_id: razorpayOrder.id,
          handler: async function (response) {
            try {
              await axios.post('/hospital-bookings/verify-payment', {
                bookingId: booking._id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature
              });
              alert('Payment successful! Booking confirmed.');
              setShowPaymentModal(false);
              setSelectedBookingForPayment(null);
              setPendingPaymentBooking(null);
              fetchBookings();
            } catch (error) {
              console.error('Payment verification failed:', error);
              alert('Payment verification failed');
            }
          },
          prefill: {
            name: JSON.parse(localStorage.getItem('user') || '{}').name || '',
            email: JSON.parse(localStorage.getItem('user') || '{}').email || '',
            contact: JSON.parse(localStorage.getItem('user') || '{}').phoneNumber || ''
          },
          theme: {
            color: booking.bookingType === 'bed' ? '#3B82F6' : '#F97316'
          },
          modal: {
            ondismiss: function() {
              setPaymentLoading(false);
              setSelectedBookingForPayment(null);
              setPendingPaymentBooking(null);
            }
          }
        };

        const razorpayInstance = new window.Razorpay(options);
        razorpayInstance.open();
        setPaymentLoading(false);
      };

      script.onerror = () => {
        alert('Failed to load Razorpay. Please try again.');
        setPaymentLoading(false);
        setSelectedBookingForPayment(null);
        setPendingPaymentBooking(null);
      };
    } catch (error) {
      console.error('Error initiating payment:', error);
      alert('Failed to initiate payment: ' + (error.response?.data?.message || error.message));
      setPaymentLoading(false);
      setSelectedBookingForPayment(null);
      setPendingPaymentBooking(null);
    }
  };

  const handleAmbulanceBooking = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/hospital-bookings/ambulance/create', {
        queryId,
        ...ambulanceForm
      });
      alert('Ambulance booking created successfully! Patient will be notified.');
      setShowAmbulanceModal(false);
      fetchBookings();
      // Reset form
      setAmbulanceForm({
        patientName: '',
        patientAge: '',
        patientGender: 'male',
        pickupLocation: '',
        pickupLatitude: null,
        pickupLongitude: null,
        emergencyContact: '',
        medicalCondition: '',
        ambulanceType: 'basic',
        estimatedArrival: '',
        ambulanceNumber: '',
        driverName: '',
        driverContact: '',
        paymentAmount: 49
      });
    } catch (error) {
      console.error('Error creating ambulance booking:', error);
      alert('Failed to create ambulance booking: ' + (error.response?.data?.message || error.message));
    }
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

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  const isHospital = userRole === 'hospital';
  const chatTitle = isHospital ? 'Chat with Patient' : 'Chat with Hospital';
  const isQueryClosed = queryInfo?.status === 'completed' || queryInfo?.status === 'cancelled';

  return (
    <Layout>
      <SEO title={chatTitle} />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h1 className="text-xl font-bold flex items-center">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {chatTitle}
                  </h1>
                  {queryInfo && (
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-sm text-blue-100">
                        {queryInfo.queryType.replace('_', ' ').toUpperCase()}
                        {queryInfo.bedType && ` • ${queryInfo.bedType}`}
                      </p>
                      {isQueryClosed && (
                        <span className="text-xs bg-red-500 px-2 py-1 rounded-full font-semibold">
                          CLOSED
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  {socketConnected ? (
                    <span className="flex items-center text-xs bg-green-500 px-3 py-1.5 rounded-full font-medium shadow-md">
                      <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
                      Connected
                    </span>
                  ) : (
                    <span className="flex items-center text-xs bg-red-500 px-3 py-1.5 rounded-full font-medium shadow-md">
                      <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
                      Disconnected
                    </span>
                  )}
                  {isHospital && !isQueryClosed && (
                    <button
                      onClick={handleCloseQuery}
                      disabled={closingQuery}
                      className="text-sm bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-full transition-colors disabled:bg-gray-400 font-medium shadow-md"
                    >
                      {closingQuery ? 'Closing...' : 'Close Query'}
                    </button>
                  )}
                  <button
                    onClick={() => router.back()}
                    className="text-sm text-blue-100 hover:text-white transition-colors flex items-center font-medium"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                  </button>
                </div>
              </div>
            </div>

            {/* Booking Actions - Show only for accepted queries */}
            {queryInfo?.status === 'accepted' && (
              <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-blue-50 border-b-2 border-gray-200">
                <div className="flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">Query Accepted - Booking Options Available</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isHospital ? (
                      <>
                        <button
                          onClick={() => setShowBedBookingModal(true)}
                          disabled={bookings.some(b => b.bookingType === 'bed')}
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-600 disabled:from-gray-400 disabled:to-gray-400 transition-all shadow-md flex items-center space-x-2 text-sm font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          <span>Create Bed Booking</span>
                        </button>
                        <button
                          onClick={() => setShowAmbulanceModal(true)}
                          className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-md flex items-center space-x-2 text-sm font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>Book Ambulance</span>
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Bookings Display */}
                {bookings.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {bookings.map((booking) => (
                      <div key={booking._id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              booking.bookingType === 'bed' ? 'bg-blue-100' : 'bg-orange-100'
                            }`}>
                              {booking.bookingType === 'bed' ? (
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 capitalize">{booking.bookingType} Booking</p>
                              <p className="text-xs text-gray-500">Amount: ₹{booking.paymentAmount}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                              booking.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' :
                              booking.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              booking.paymentStatus === 'initiated' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {booking.paymentStatus}
                            </span>
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                              booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              booking.status === 'pending_payment' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {booking.status.replace('_', ' ')}
                            </span>
                            {!isHospital && booking.paymentStatus === 'pending' && (
                              <button
                                onClick={() => handleInitiatePayment(booking)}
                                disabled={paymentLoading}
                                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-400 transition-all shadow-md text-xs font-medium"
                              >
                                {paymentLoading && selectedBookingForPayment?._id === booking._id ? 'Processing...' : 'Pay Now'}
                              </button>
                            )}
                          </div>
                        </div>
                        {booking.bookingType === 'ambulance' && booking.ambulanceDetails && (
                          <div className="mt-3 pt-3 border-t border-gray-200 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-gray-500">Patient: <span className="text-gray-900 font-medium">{booking.ambulanceDetails.patientName}</span></p>
                                <p className="text-gray-500">Pickup: <span className="text-gray-900 font-medium">{booking.ambulanceDetails.pickupLocation}</span></p>
                              </div>
                              {booking.ambulanceDetails.ambulanceNumber && (
                                <div>
                                  <p className="text-gray-500">Ambulance: <span className="text-gray-900 font-medium">{booking.ambulanceDetails.ambulanceNumber}</span></p>
                                  <p className="text-gray-500">Driver: <span className="text-gray-900 font-medium">{booking.ambulanceDetails.driverName}</span></p>
                                  <p className="text-gray-500">Contact: <span className="text-gray-900 font-medium">{booking.ambulanceDetails.driverContact}</span></p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Bed Reservation Timer */}
                        {booking.bookingType === 'bed' && booking.reservationExpiresAt && booking.paymentStatus === 'completed' && (
                          <div>
                            <BedReservationTimer
                              reservationExpiresAt={booking.reservationExpiresAt}
                              bookingId={booking._id}
                              isHospital={isHospital}
                              patientArrivalStatus={booking.patientArrivalStatus}
                              status={booking.status}
                            />
                            
                            {/* Patient Arrival Buttons (Hospital Only) */}
                            {isHospital && booking.patientArrivalStatus === 'pending' && booking.status === 'in_progress' && (
                              <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                                {new Date(booking.reservationExpiresAt) < new Date() ? (
                                  <button
                                    onClick={() => handlePatientArrival(booking._id, 'not_arrived')}
                                    className="flex-1 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Patient Not Arrived</span>
                                  </button>
                                ) : null}
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
                              <div className={`mt-3 pt-3 border-t border-gray-200 p-2 rounded ${
                                booking.patientArrivalStatus === 'arrived' ? 'bg-green-50' : 'bg-red-50'
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Messages Container */}
            <div className="h-[550px] overflow-y-auto p-6 space-y-3 bg-gradient-to-b from-gray-50 to-white">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="bg-gray-100 rounded-full p-6 mb-4">
                    <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-gray-600">No messages yet</p>
                  <p className="text-sm text-gray-400 mt-1">Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isOwnMessage = isHospital ? msg.senderType === 'hospital' : msg.senderType === 'user';
                  const showAvatar = index === 0 || messages[index - 1].senderType !== msg.senderType;
                  
                  return (
                    <div
                      key={msg._id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-4' : 'mt-1'}`}
                    >
                      <div className={`flex items-end space-x-2 max-w-[75%] ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        {showAvatar && (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md ${
                            isOwnMessage 
                              ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                              : 'bg-gradient-to-br from-gray-400 to-gray-500'
                          }`}>
                            {isOwnMessage ? (isHospital ? 'H' : 'You') : (isHospital ? 'P' : 'H')}
                          </div>
                        )}
                        {!showAvatar && <div className="w-10"></div>}
                        
                        <div className={`group relative ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                          <div
                            className={`px-4 py-3 rounded-2xl shadow-md transition-all ${
                              isOwnMessage
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-sm'
                                : 'bg-white text-gray-900 border-2 border-gray-200 rounded-bl-sm'
                            } ${msg.sending ? 'opacity-60' : 'opacity-100'}`}
                          >
                            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.message}</p>
                          </div>
                          <div className={`flex items-center space-x-1 mt-1 px-2 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <p className={`text-xs font-medium ${isOwnMessage ? 'text-blue-600' : 'text-gray-500'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {msg.sending && (
                              <span className="text-xs text-orange-500 font-medium">Sending...</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              
              {isTyping && (
                <div className="flex justify-start mt-4">
                  <div className="flex items-end space-x-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                      {isHospital ? 'P' : 'H'}
                    </div>
                    <div className="bg-white border-2 border-gray-200 px-5 py-3 rounded-2xl rounded-bl-sm shadow-md">
                      <div className="flex space-x-1.5">
                        <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="border-t-2 border-gray-100 p-4 bg-white">
              {isQueryClosed ? (
                <div className="text-center py-4 bg-red-50 rounded-lg border-2 border-red-200">
                  <svg className="w-8 h-8 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-red-700 text-sm font-semibold">
                    This query has been closed. No further messages can be sent.
                  </p>
                </div>
              ) : (
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleTyping}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 transition-all transform hover:scale-105 active:scale-95 disabled:transform-none disabled:cursor-not-allowed flex items-center space-x-2 font-semibold shadow-lg"
                  >
                    {sending ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Sending</span>
                      </>
                    ) : (
                      <>
                        <span>Send</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Bed Booking Modal (Hospital) */}
      {showBedBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Create Bed Booking</h3>
              <button
                onClick={() => setShowBedBookingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateBedBooking} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bed Type *</label>
                <select
                  required
                  value={bedBookingForm.bedType}
                  onChange={(e) => setBedBookingForm({...bedBookingForm, bedType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General</option>
                  <option value="icu">ICU</option>
                  <option value="any">Any Available</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Beds *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={bedBookingForm.numberOfBeds}
                  onChange={(e) => setBedBookingForm({...bedBookingForm, numberOfBeds: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={bedBookingForm.paymentAmount}
                  onChange={(e) => setBedBookingForm({...bedBookingForm, paymentAmount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-yellow-800 font-semibold mb-1">
                      Important: Bed Reservation Policy
                    </p>
                    <p className="text-sm text-yellow-800">
                      By creating this booking, you are reserving a bed for the patient for <strong>90 minutes</strong> from the time of booking creation. 
                      The patient must arrive within this time window. After 90 minutes, you can mark the patient as "Not Arrived" if they haven't shown up.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowBedBookingModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg"
                >
                  Create Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ambulance Booking Modal */}
      {showAmbulanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Book Ambulance</h3>
              <button
                onClick={() => setShowAmbulanceModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAmbulanceBooking} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name *</label>
                  <input
                    type="text"
                    required
                    value={ambulanceForm.patientName}
                    onChange={(e) => setAmbulanceForm({...ambulanceForm, patientName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                  <input
                    type="number"
                    required
                    value={ambulanceForm.patientAge}
                    onChange={(e) => setAmbulanceForm({...ambulanceForm, patientAge: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                  <select
                    required
                    value={ambulanceForm.patientGender}
                    onChange={(e) => setAmbulanceForm({...ambulanceForm, patientGender: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact *</label>
                  <input
                    type="tel"
                    required
                    value={ambulanceForm.emergencyContact}
                    onChange={(e) => setAmbulanceForm({...ambulanceForm, emergencyContact: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location *</label>
                  <input
                    type="text"
                    required
                    value={ambulanceForm.pickupLocation}
                    onChange={(e) => setAmbulanceForm({...ambulanceForm, pickupLocation: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medical Condition</label>
                  <textarea
                    value={ambulanceForm.medicalCondition}
                    onChange={(e) => setAmbulanceForm({...ambulanceForm, medicalCondition: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ambulance Type *</label>
                  <select
                    required
                    value={ambulanceForm.ambulanceType}
                    onChange={(e) => setAmbulanceForm({...ambulanceForm, ambulanceType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="basic">Basic</option>
                    <option value="advanced">Advanced</option>
                    <option value="icu_ambulance">ICU Ambulance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Arrival</label>
                  <input
                    type="datetime-local"
                    value={ambulanceForm.estimatedArrival}
                    onChange={(e) => setAmbulanceForm({...ambulanceForm, estimatedArrival: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ambulance Number *</label>
                  <input
                    type="text"
                    required
                    value={ambulanceForm.ambulanceNumber}
                    onChange={(e) => setAmbulanceForm({...ambulanceForm, ambulanceNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name *</label>
                  <input
                    type="text"
                    required
                    value={ambulanceForm.driverName}
                    onChange={(e) => setAmbulanceForm({...ambulanceForm, driverName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver Contact *</label>
                  <input
                    type="tel"
                    required
                    value={ambulanceForm.driverContact}
                    onChange={(e) => setAmbulanceForm({...ambulanceForm, driverContact: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={ambulanceForm.paymentAmount}
                    onChange={(e) => setAmbulanceForm({...ambulanceForm, paymentAmount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAmbulanceModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all font-medium shadow-lg"
                >
                  Create Ambulance Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Disclaimer Modal */}
      {showPaymentDisclaimer && pendingPaymentBooking && (
        <PaymentDisclaimer
          onAccept={proceedWithPayment}
          onCancel={() => {
            setShowPaymentDisclaimer(false);
            setPendingPaymentBooking(null);
          }}
          amount={pendingPaymentBooking.paymentAmount}
          serviceName={`${pendingPaymentBooking.bookingType === 'bed' ? 'Hospital Bed Booking' : 'Ambulance Booking'}`}
        />
      )}

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
