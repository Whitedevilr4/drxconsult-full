import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Layout from '@/components/Layout'
import PdfUploader from '@/components/EnhancedUploader'
import PaymentDisclaimer from '@/components/PaymentDisclaimer'
import { toast } from 'react-toastify'

export default function BookProfessional() {
  const router = useRouter()
  const { id, type } = router.query // Add type parameter to distinguish between pharmacist and doctor
  
  // Determine professional type from URL immediately
  const getTypeFromUrl = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const typeParam = urlParams.get('type')
      if (typeParam === 'doctor') return 'doctor'
      if (typeParam === 'nutritionist') return 'nutritionist'
      return 'pharmacist'
    }
    return 'pharmacist'
  }
  
  const [professional, setProfessional] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [professionalType, setProfessionalType] = useState(getTypeFromUrl()) // Initialize from URL directly
  
  // Service selection and patient details
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [selectedService, setSelectedService] = useState(null)
  const [patientDetails, setPatientDetails] = useState({
    age: '',
    sex: '',
    prescriptionUrl: '',
    additionalNotes: ''
  })
  const [showPatientForm, setShowPatientForm] = useState(false)
  const [showPrescriptionUploader, setShowPrescriptionUploader] = useState(false)
  const [showPaymentDisclaimer, setShowPaymentDisclaimer] = useState(false)
  
  // New state for improved UI
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('morning') // 'morning', 'afternoon', or 'evening'

  // Pharmacist services (two options)
  const pharmacistServices = [
    {
      id: 'prescription_review',
      title: 'Know Your Prescription',
      price: 149,
      description: 'Get expert guidance on your current prescription',
      features: [
        'Review of your current medications',
        'Explanation of drug interactions',
        'Dosage and timing guidance',
        'Side effects information',
        '15-20 minute consultation'
      ],
      icon: '📋'
    },
    {
      id: 'full_consultation',
      title: 'Full Consultation',
      price: 449,
      description: 'Comprehensive health consultation with medication review',
      features: [
        'Complete health assessment',
        'Prescription review and optimization',
        'Personalized medication counseling',
        'Health monitoring advice',
        'Follow-up recommendations',
        '30-45 minute consultation'
      ],
      icon: '👨‍⚕️'
    }
  ]

  // Doctor service (single option)
  const doctorServices = [
    {
      id: 'doctor_consultation',
      title: 'Doctor Consultation',
      price: 499,
      description: 'Quick 15-minute tele-consultation with a qualified doctor',
      features: [
        'Medical assessment',
        'Diagnosis and treatment advice',
        'Prescription if required',
        'Health recommendations',
        '15-minute tele-consultation'
      ],
      icon: '🩺'
    }
  ]

  // Select services based on professional type - CRITICAL: Check type from query first
  const services = professionalType === 'doctor' ? doctorServices : professionalType === 'nutritionist' ? [] : pharmacistServices

  useEffect(() => {
    // Update professional type when query params change
    if (type) {
      const profType = type === 'doctor' ? 'doctor' : type === 'nutritionist' ? 'nutritionist' : 'pharmacist'
      setProfessionalType(profType)
    }
  }, [type])

  useEffect(() => {
    if (id && professionalType) {
      fetchProfessional(professionalType)
    }
  }, [id, professionalType])

  const fetchProfessional = async (profType) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      if (!apiUrl) {
        toast.error('API URL is not configured. Please check your environment settings.')
        setPageLoading(false)
        return
      }
      
      // Fetch professional details based on type
      const endpoint = profType === 'doctor' ? 'doctors' : profType === 'nutritionist' ? 'nutritionists' : 'pharmacists'
      const professionalRes = await axios.get(`${apiUrl}/${endpoint}/${id}`)
      
      // Check if professional is admin-disabled
      if (professionalRes.data && professionalRes.data.adminDisabled) {
        toast.error('This professional is currently not accepting bookings.')
        router.push(`/${endpoint}`)
        return
      }
      
      // Fetch available slots with booking status - include type parameter
      const slotsRes = await axios.get(`${apiUrl}/bookings/available-slots/${id}?type=${profType}`)
      
      if (professionalRes.data) {
        // Use slots from the dedicated endpoint (real data only)
        professionalRes.data.availableSlots = slotsRes.data || []
        setProfessional(professionalRes.data)
      }
      setPageLoading(false)
    } catch (err) {
      console.error(`Error fetching ${profType}:`, err)
      toast.error(`Failed to load ${profType} details. Please make sure the backend server is running.`)
      setPageLoading(false)
    }
  }

  const handleSlotSelection = (slot) => {
    if (slot.isBooked) {
      toast.error('This slot is already booked. Please select another slot.')
      return
    }
    
    setSelectedSlot(slot)
    
    // Check URL directly for professional type
    const urlType = new URLSearchParams(window.location.search).get('type')
    const isDoctor = urlType === 'doctor' || professionalType === 'doctor' || type === 'doctor'
    const isNutritionist = urlType === 'nutritionist' || professionalType === 'nutritionist' || type === 'nutritionist'
    
    // For doctors and nutritionists, show service modal with details
    if (isDoctor || isNutritionist) {
      setShowServiceModal(true)
    } else {
      // For pharmacists, show service selection modal
      setShowServiceModal(true)
    }
  }

  const handleServiceSelection = (service) => {
    setSelectedService(service)
    setShowServiceModal(false)
    setShowPatientForm(true)
  }

  const handlePatientDetailsSubmit = (e) => {
    e.preventDefault()
    
    if (!patientDetails.age || !patientDetails.sex) {
      toast.error('Please fill in age and sex')
      return
    }
    
    if (!patientDetails.prescriptionUrl) {
      toast.error('Please upload your prescription')
      return
    }
    
    // Show disclaimer before proceeding to payment
    setShowPaymentDisclaimer(true)
  }

  const proceedWithBooking = async () => {
    setShowPaymentDisclaimer(false)
    await handleBooking()
  }

  const handlePrescriptionUpload = (data) => {
    setPatientDetails(prev => ({ ...prev, prescriptionUrl: data.url }))
    setShowPrescriptionUploader(false)
    toast.success('Prescription uploaded successfully!')
  }

  // Helper functions for new UI
  const getUniqueDates = () => {
    if (!professional?.availableSlots) return []
    
    const dates = professional.availableSlots
      .filter(slot => !slot.isBooked)
      .map(slot => new Date(slot.date).toDateString())
    
    return [...new Set(dates)].sort((a, b) => new Date(a) - new Date(b)).slice(0, 6)
  }

  const getDateLabel = (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }

  const getDateNumber = (dateString) => {
    return new Date(dateString).getDate()
  }

  const getFilteredSlots = () => {
    if (!professional?.availableSlots || !selectedDate) return []
    
    return professional.availableSlots
      .filter(slot => {
        if (slot.isBooked) return false
        if (new Date(slot.date).toDateString() !== selectedDate) return false
        
        // Filter by time period
        const timeStr = slot.startTime.toLowerCase()
        let hour = parseInt(slot.startTime.split(':')[0])
        const isPM = timeStr.includes('pm')
        const isAM = timeStr.includes('am')
        
        // Convert to 24-hour format
        let hour24 = hour
        if (isPM && hour !== 12) {
          hour24 = hour + 12
        } else if (isAM && hour === 12) {
          hour24 = 0
        }
        
        // Filter based on selected time period
        if (selectedTimePeriod === 'morning') {
          return hour24 >= 6 && hour24 < 11 // 6 AM to 10:59 AM
        } else if (selectedTimePeriod === 'afternoon') {
          return hour24 >= 11 && hour24 < 18 // 11 AM to 5:59 PM
        } else { // evening
          return hour24 >= 18 || hour24 < 6 // 6 PM onwards and before 6 AM
        }
      })
      .sort((a, b) => {
        const timeA = a.startTime
        const timeB = b.startTime
        return timeA.localeCompare(timeB)
      })
  }

  // Auto-select first available date
  useEffect(() => {
    if (professional?.availableSlots && !selectedDate) {
      const dates = getUniqueDates()
      if (dates.length > 0) {
        setSelectedDate(dates[0])
      }
    }
  }, [professional, selectedDate])

  const handleBooking = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      router.push('/login')
      return
    }

    if (!selectedSlot || !selectedService || !patientDetails.prescriptionUrl) {
      toast.error('Please complete all required information')
      return
    }

    setLoading(true)
    
    try {
      // Check if user is test user (free booking)
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {}
      const isTestUser = user.email === 'user' || user.email === 'admin'

      if (isTestUser) {
        // Free booking for test users
        const bookingData = {
          slotDate: selectedSlot.date,
          slotTime: selectedSlot.startTime,
          paymentId: 'FREE_TEST_USER',
          serviceType: selectedService.id,
          patientDetails,
          bookingType: 'test_user',
          actualPrice: 0
        }
        
        // Add the appropriate ID based on professional type
        if (professionalType === 'doctor') {
          bookingData.doctorId = id
        } else if (professionalType === 'nutritionist') {
          bookingData.nutritionistId = id
        } else {
          bookingData.pharmacistId = id
        }

        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/bookings`,
          bookingData,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        toast.success('Booking confirmed! (Free for test users)')
        router.push('/patient/dashboard')
        return
      }

      // Check subscription status for regular users
      const subscriptionCheck = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/subscriptions/can-book-session?professionalType=${professionalType}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let bookingPrice = selectedService.price;
      let bookingType = 'normal_price';
      let paymentRequired = true;

      if (subscriptionCheck.data.canBookWithSubscription) {
        bookingPrice = 0;
        bookingType = 'subscription';
        paymentRequired = false;
        
        // Show confirmation for free subscription booking
        const sessionType = professionalType === 'doctor' ? 'doctor consultation' : professionalType === 'nutritionist' ? 'nutritionist consultation' : 'pharmacist session';
        const confirmFreeBooking = window.confirm(
          `Great! This ${sessionType} will be covered by your ${subscriptionCheck.data.subscription.planName} subscription.\n\n` +
          `${professionalType === 'doctor' ? 'Doctor consultations' : 'Sessions'} used: ${subscriptionCheck.data.sessionsUsed}/${subscriptionCheck.data.sessionsLimit}\n\n` +
          `Click OK to confirm your booking.`
        );
        
        if (!confirmFreeBooking) {
          setLoading(false);
          return;
        }
      } else if (subscriptionCheck.data.subscription) {
        // Show pricing info when subscription limit exceeded
        const sessionType = professionalType === 'doctor' ? 'doctor consultation' : professionalType === 'nutritionist' ? 'nutritionist consultation' : 'pharmacist session';
        const limitType = professionalType === 'doctor' ? 'Doctor consultation' : professionalType === 'nutritionist' ? 'Nutritionist consultation' : 'Session';
        const confirmPaidBooking = window.confirm(
          `Your ${subscriptionCheck.data.subscription.planName} subscription limit has been reached.\n\n` +
          `${limitType} limit: ${subscriptionCheck.data.sessionsUsed}/${subscriptionCheck.data.sessionsLimit}\n\n` +
          `This ${sessionType} will be charged at normal price: ₹${selectedService.price}\n\n` +
          `${subscriptionCheck.data.reason || ''}\n\n` +
          `Click OK to proceed with payment.`
        );
        
        if (!confirmPaidBooking) {
          setLoading(false);
          return;
        }
      } else {
        // Show pricing info for users without subscription
        const sessionType = professionalType === 'doctor' ? 'doctor consultation' : professionalType === 'nutritionist' ? 'nutritionist consultation' : 'pharmacist session';
        const confirmPaidBooking = window.confirm(
          `You don't have an active subscription.\n\n` +
          `This ${sessionType} will be charged at normal price: ₹${selectedService.price}\n\n` +
          `Consider subscribing for discounted sessions!\n\n` +
          `Click OK to proceed with payment.`
        );
        
        if (!confirmPaidBooking) {
          setLoading(false);
          return;
        }
      }

      // If no payment required (subscription covers it)
      if (!paymentRequired) {
        const bookingData = {
          slotDate: selectedSlot.date,
          slotTime: selectedSlot.startTime,
          paymentId: 'SUBSCRIPTION_COVERED',
          serviceType: selectedService.id,
          patientDetails,
          bookingType,
          actualPrice: bookingPrice
        }
        
        // Add the appropriate ID based on professional type
        if (professionalType === 'doctor') {
          bookingData.doctorId = id
        } else if (professionalType === 'nutritionist') {
          bookingData.nutritionistId = id
        } else {
          bookingData.pharmacistId = id
        }

        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/bookings`,
          bookingData,
          { headers: { Authorization: `Bearer ${token}` } }
        )

        // Update subscription usage
        try {
          await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/subscriptions/use-session`,
            { bookingType, professionalType },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (sessionErr) {
          console.warn('Failed to update session usage:', sessionErr);
        }

        toast.success(`Booking confirmed using your subscription!`)
        router.push('/patient/dashboard')
        return
      }

      // Regular payment flow for paid bookings
      const orderRes = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/payments/create-order`,
        { amount: bookingPrice, currency: 'INR' },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Check if Razorpay is loaded
      let razorpayLoaded = typeof window !== 'undefined' && typeof window.Razorpay !== 'undefined'
      if (!razorpayLoaded) {
        
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 500))
          if (typeof window !== 'undefined' && typeof window.Razorpay !== 'undefined') {
            razorpayLoaded = true
            break
          }
        }
      }
      
      if (!razorpayLoaded) {
        toast.error('Payment system failed to load. Please refresh the page and try again.')
        setLoading(false)
        return
      }

      // Initialize Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderRes.data.amount,
        currency: orderRes.data.currency,
        order_id: orderRes.data.id,
        name: 'Patient Counselling',
        description: `${selectedService.title} - ₹${bookingPrice}`,
        handler: async (response) => {
          try {
            // Create booking after payment with pre-determined booking type
            const bookingData = {
              slotDate: selectedSlot.date,
              slotTime: selectedSlot.startTime,
              paymentId: response.razorpay_payment_id,
              serviceType: selectedService.id,
              patientDetails,
              bookingType,
              actualPrice: bookingPrice
            }
            
            // Add the appropriate ID based on professional type
            if (professionalType === 'doctor') {
              bookingData.doctorId = id
            } else if (professionalType === 'nutritionist') {
              bookingData.nutritionistId = id
            } else {
              bookingData.pharmacistId = id
            }

            await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL}/bookings`,
              bookingData,
              { headers: { Authorization: `Bearer ${token}` } }
            )

            // Update session usage based on booking type
            try {
              await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/subscriptions/use-session`,
                { bookingType },
                { headers: { Authorization: `Bearer ${token}` } }
              );
            } catch (sessionErr) {
              console.warn('Failed to update session usage:', sessionErr);
            }

            toast.success('Booking confirmed successfully!')
            router.push('/patient/dashboard')
          } catch (bookingErr) {
            console.error('Booking error:', bookingErr)
            toast.error('Booking failed: ' + (bookingErr.response?.data?.message || bookingErr.message))
            fetchProfessional(professionalType)
          }
        },
        modal: {
          ondismiss: function() {
            setLoading(false)
          }
        },
        theme: {
          color: '#2563eb'
        }
      }

      try {
        const razorpay = new window.Razorpay(options)
        razorpay.on('payment.failed', function (response) {
          console.error('Payment failed:', response.error)
          toast.error('Payment failed: ' + response.error.description)
          setLoading(false)
        })
        razorpay.open()
      } catch (razorpayErr) {
        console.error('Razorpay initialization error:', razorpayErr)
        toast.error('Payment system error: ' + razorpayErr.message)
        setLoading(false)
      }
    } catch (err) {
      console.error(err)
      const errorMessage = err.response?.data?.message || err.message
      toast.error('Booking failed: ' + errorMessage)
      
      if (errorMessage.includes('already booked')) {
        fetchProfessional(professionalType)
        setSelectedSlot(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const resetBookingFlow = () => {
    setSelectedSlot(null)
    setSelectedService(null)
    setPatientDetails({
      age: '',
      sex: '',
      prescriptionUrl: '',
      additionalNotes: ''
    })
    setShowServiceModal(false)
    setShowPatientForm(false)
    setShowPrescriptionUploader(false)
  }

  if (pageLoading || !professional) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Layout>
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {typeof window !== 'undefined' && !localStorage.getItem('token') && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Please <button onClick={() => router.push('/login')} className="underline font-semibold">login</button> or <button onClick={() => router.push('/signup')} className="underline font-semibold">sign up</button> to complete booking.
              </p>
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold mb-6">Book Appointment</h1>
            
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">{professional.userId?.name}</h2>
              <p className="text-gray-600">{professional.designation}</p>
            </div>

            {/* Booking Progress */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className={`flex items-center ${selectedSlot ? 'text-green-600' : 'text-blue-600'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${selectedSlot ? 'bg-green-600' : 'bg-blue-600'}`}>
                    {selectedSlot ? '✓' : '1'}
                  </div>
                  <span className="ml-2 font-medium">Select Time Slot</span>
                </div>
                <div className={`flex items-center ${selectedService ? 'text-green-600' : selectedSlot ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${selectedService ? 'bg-green-600' : selectedSlot ? 'bg-blue-600' : 'bg-gray-400'}`}>
                    {selectedService ? '✓' : '2'}
                  </div>
                  <span className="ml-2 font-medium">Choose Service</span>
                </div>
                <div className={`flex items-center ${patientDetails.prescriptionUrl ? 'text-green-600' : selectedService ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${patientDetails.prescriptionUrl ? 'bg-green-600' : selectedService ? 'bg-blue-600' : 'bg-gray-400'}`}>
                    {patientDetails.prescriptionUrl ? '✓' : '3'}
                  </div>
                  <span className="ml-2 font-medium">Patient Details</span>
                </div>
              </div>
            </div>

            {/* Time Slots Selection - Modern UI */}
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-6">Select your preferred slot</h3>
              
              {professional.availableSlots?.filter(slot => !slot.isBooked).length === 0 ? (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                  <p className="text-yellow-800">
                    <strong>No available slots</strong> - All slots are currently booked. 
                    Please check back later or contact the {professionalType}.
                  </p>
                </div>
              ) : (
                <>
                  {/* Date Selector */}
                  <div className="mb-6">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {getUniqueDates().map((dateString, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedDate(dateString)}
                          className={`flex-shrink-0 px-6 py-3 rounded-lg border-2 transition-all ${
                            selectedDate === dateString
                              ? 'bg-gray-800 text-white border-gray-800'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-sm font-medium">{getDateLabel(dateString)}</div>
                            <div className="text-2xl font-bold mt-1">{getDateNumber(dateString)}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Period Filter */}
                  <div className="mb-6 flex gap-3 flex-wrap">
                    <button
                      onClick={() => setSelectedTimePeriod('morning')}
                      className={`flex items-center gap-2 px-6 py-3 rounded-full border-2 transition-all ${
                        selectedTimePeriod === 'morning'
                          ? 'bg-teal-50 text-teal-700 border-teal-500'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">Morning</span>
                    </button>
                    <button
                      onClick={() => setSelectedTimePeriod('afternoon')}
                      className={`flex items-center gap-2 px-6 py-3 rounded-full border-2 transition-all ${
                        selectedTimePeriod === 'afternoon'
                          ? 'bg-teal-50 text-teal-700 border-teal-500'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">Afternoon</span>
                    </button>
                    <button
                      onClick={() => setSelectedTimePeriod('evening')}
                      className={`flex items-center gap-2 px-6 py-3 rounded-full border-2 transition-all ${
                        selectedTimePeriod === 'evening'
                          ? 'bg-teal-50 text-teal-700 border-teal-500'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                      </svg>
                      <span className="font-medium">Evening</span>
                    </button>
                  </div>

                  {/* Time Slots */}
                  <div className="flex flex-wrap gap-3">
                    {getFilteredSlots().length === 0 ? (
                      <div className="w-full text-center py-8 text-gray-500">
                        No slots available for the selected time period
                      </div>
                    ) : (
                      getFilteredSlots().map((slot, index) => (
                        <button
                          key={index}
                          onClick={() => handleSlotSelection(slot)}
                          className={`px-8 py-4 rounded-xl font-semibold transition-all ${
                            selectedSlot === slot
                              ? 'bg-teal-600 text-white shadow-lg scale-105'
                              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-teal-400 hover:shadow-md'
                          }`}
                        >
                          {slot.startTime}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Selected Service and Patient Details Summary */}
            {selectedService && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Selected Service:</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg">{selectedService.icon}</span>
                    <span className="ml-2 font-medium">{selectedService.title}</span>
                  </div>
                  <span className="font-bold text-blue-600">₹{selectedService.price}</span>
                </div>
              </div>
            )}

            {patientDetails.prescriptionUrl && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Patient Information:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Age:</strong> {patientDetails.age} years</div>
                  <div><strong>Sex:</strong> {patientDetails.sex}</div>
                  <div className="col-span-2">
                    <strong>Prescription:</strong> 
                    <a href={patientDetails.prescriptionUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-green-600 hover:underline">
                      View Uploaded Prescription
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Reset Button */}
            {(selectedSlot || selectedService) && (
              <div className="mb-6">
                <button
                  onClick={resetBookingFlow}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  ← Start Over
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Service Selection Modal */}
        {showServiceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">
                    {professionalType === 'doctor' ? 'Doctor Consultation Details' : 
                     professionalType === 'nutritionist' ? 'Nutritionist Consultation Details' : 
                     'Choose Your Service'}
                  </h2>
                  <button
                    onClick={() => setShowServiceModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                <div className={`grid grid-cols-1 ${services.length > 1 ? 'md:grid-cols-2' : ''} gap-6 ${services.length === 1 ? 'max-w-xl mx-auto' : ''}`}>
                  {/* For doctors - show single service with details */}
                  {professionalType === 'doctor' && (
                    <div
                      className="border-2 border-blue-300 rounded-lg p-6 hover:border-blue-400 transition-colors cursor-pointer bg-blue-50"
                      onClick={() => {
                        const consultationFee = professional?.consultationFee || 499
                        const doctorService = {
                          id: 'doctor_consultation',
                          title: 'Doctor Consultation',
                          price: consultationFee,
                          description: 'Professional medical consultation with a qualified doctor',
                          features: [
                            'Complete medical assessment',
                            'Diagnosis and treatment advice',
                            'Prescription if required',
                            'Health recommendations',
                            'Follow-up guidance',
                            '15-minute tele-consultation'
                          ],
                          icon: '🩺'
                        }
                        handleServiceSelection(doctorService)
                      }}
                    >
                      <div className="text-center mb-4">
                        <div className="text-5xl mb-3">🩺</div>
                        <h3 className="text-2xl font-bold mb-2">Doctor Consultation</h3>
                        <div className="text-4xl font-bold text-blue-600 mb-3">₹{professional?.consultationFee || 499}</div>
                        <p className="text-gray-700 text-base">Professional medical consultation with a qualified doctor</p>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        <h4 className="font-semibold text-base text-gray-800 border-b pb-2">What's included:</h4>
                        <ul className="text-sm text-gray-700 space-y-2">
                          <li className="flex items-start">
                            <span className="text-green-500 mr-2 mt-0.5 text-lg">✓</span>
                            <span>Complete medical assessment</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-2 mt-0.5 text-lg">✓</span>
                            <span>Diagnosis and treatment advice</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-2 mt-0.5 text-lg">✓</span>
                            <span>Prescription if required</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-2 mt-0.5 text-lg">✓</span>
                            <span>Health recommendations</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-2 mt-0.5 text-lg">✓</span>
                            <span>Follow-up guidance</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-2 mt-0.5 text-lg">✓</span>
                            <span>15-minute tele-consultation</span>
                          </li>
                        </ul>
                      </div>
                      
                      <button className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg">
                        Proceed to Book
                      </button>
                    </div>
                  )}

                  {/* For nutritionists - show single service with details */}
                  {professionalType === 'nutritionist' && (
                    <div
                      className="border-2 border-green-300 rounded-lg p-6 hover:border-green-400 transition-colors cursor-pointer bg-green-50"
                      onClick={() => {
                        const consultationFee = professional?.consultationFee || 500
                        const nutritionistService = {
                          id: 'nutritionist_consultation',
                          title: 'Nutritionist Consultation',
                          price: consultationFee,
                          description: 'Professional nutrition and diet consultation',
                          features: [
                            'Personalized diet plan',
                            'Nutritional assessment',
                            'Meal planning guidance',
                            'Health and wellness advice',
                            'Lifestyle recommendations',
                            '30-minute consultation'
                          ],
                          icon: '🥗'
                        }
                        handleServiceSelection(nutritionistService)
                      }}
                    >
                      <div className="text-center mb-4">
                        <div className="text-5xl mb-3">🥗</div>
                        <h3 className="text-2xl font-bold mb-2">Nutritionist Consultation</h3>
                        <div className="text-4xl font-bold text-green-600 mb-3">₹{professional?.consultationFee || 500}</div>
                        <p className="text-gray-700 text-base">Professional nutrition and diet consultation</p>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        <h4 className="font-semibold text-base text-gray-800 border-b pb-2">What's included:</h4>
                        <ul className="text-sm text-gray-700 space-y-2">
                          <li className="flex items-start">
                            <span className="text-green-500 mr-2 mt-0.5 text-lg">✓</span>
                            <span>Personalized diet plan</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-2 mt-0.5 text-lg">✓</span>
                            <span>Nutritional assessment</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-2 mt-0.5 text-lg">✓</span>
                            <span>Meal planning guidance</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-2 mt-0.5 text-lg">✓</span>
                            <span>Health and wellness advice</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-2 mt-0.5 text-lg">✓</span>
                            <span>Lifestyle recommendations</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-green-500 mr-2 mt-0.5 text-lg">✓</span>
                            <span>30-minute consultation</span>
                          </li>
                        </ul>
                      </div>
                      
                      <button className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg">
                        Proceed to Book
                      </button>
                    </div>
                  )}

                  {/* For pharmacists - show multiple service options */}
                  {professionalType === 'pharmacist' && services.map((service) => (
                    <div
                      key={service.id}
                      className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors cursor-pointer"
                      onClick={() => handleServiceSelection(service)}
                    >
                      <div className="text-center mb-4">
                        <div className="text-4xl mb-2">{service.icon}</div>
                        <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                        <div className="text-3xl font-bold text-blue-600 mb-2">₹{service.price}</div>
                        <p className="text-gray-600 text-sm">{service.description}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-gray-800">What's included:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {service.features.map((feature, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-green-500 mr-2 mt-0.5">✓</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <button className="w-full mt-4 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors">
                        Select This Service
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Patient Details Form Modal */}
        {showPatientForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Patient Information</h2>
                  <button
                    onClick={() => setShowPatientForm(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                <form onSubmit={handlePatientDetailsSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Age <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={patientDetails.age}
                        onChange={(e) => setPatientDetails(prev => ({ ...prev, age: e.target.value }))}
                        placeholder="Enter your age"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sex <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={patientDetails.sex}
                        onChange={(e) => setPatientDetails(prev => ({ ...prev, sex: e.target.value }))}
                      >
                        <option value="">Select sex</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prescription <span className="text-red-500">*</span>
                    </label>
                    {patientDetails.prescriptionUrl ? (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="text-green-600 mr-2">✓</span>
                            <span className="text-sm text-green-800">Prescription uploaded successfully</span>
                          </div>
                          <div className="space-x-2">
                            <a
                              href={patientDetails.prescriptionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              View
                            </a>
                            <button
                              type="button"
                              onClick={() => setShowPrescriptionUploader(true)}
                              className="text-sm text-gray-600 hover:underline"
                            >
                              Change
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowPrescriptionUploader(true)}
                        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-400 transition-colors"
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-2">📄</div>
                          <p className="text-sm text-gray-600">Click to upload prescription</p>
                          <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG files accepted</p>
                        </div>
                      </button>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={patientDetails.additionalNotes}
                      onChange={(e) => setPatientDetails(prev => ({ ...prev, additionalNotes: e.target.value }))}
                      placeholder="Any additional information you'd like to share with the professional..."
                    />
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowPatientForm(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={!patientDetails.age || !patientDetails.sex || !patientDetails.prescriptionUrl || loading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {loading ? 'Processing...' : 'Proceed to Payment'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Prescription Uploader Modal */}
        {showPrescriptionUploader && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Upload Prescription</h3>
                  <button
                    onClick={() => setShowPrescriptionUploader(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl"
                  >
                    ×
                  </button>
                </div>
                
                <PdfUploader
                  onUploadSuccess={handlePrescriptionUpload}
                  uploadType="prescription"
                  label="Upload your prescription (PDF, JPG, PNG)"
                  accept="image/*,.pdf"
                />
              </div>
            </div>
          </div>
        )}

        {/* Payment Disclaimer Modal */}
        {showPaymentDisclaimer && selectedService && (
          <PaymentDisclaimer
            onAccept={proceedWithBooking}
            onCancel={() => {
              setShowPaymentDisclaimer(false);
              setLoading(false);
            }}
            amount={selectedService.price}
            serviceName={selectedService.title}
          />
        )}
      </div>
    </Layout>
  )
}
