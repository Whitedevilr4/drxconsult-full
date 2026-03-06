import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Layout from '@/components/Layout'
import SEO from '@/components/SEO'

export default function Home() {
  const router = useRouter()
  const [websiteSettings, setWebsiteSettings] = useState(null)
  const [subscriptionPlans, setSubscriptionPlans] = useState([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [currentQuote, setCurrentQuote] = useState(0)
  const [currentReview, setCurrentReview] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [currentPlanSlide, setCurrentPlanSlide] = useState(0)
  const [userLocation, setUserLocation] = useState(null)
  const [locationPermission, setLocationPermission] = useState('prompt') // 'prompt', 'granted', 'denied'
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch by only rendering dynamic content on client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Use slides from website settings if available, otherwise use default slides
  const defaultSlides = [
    {
      title: "Complete Healthcare Consultation Platform",
      subtitle: "Your Health, Our Expertise",
      description: "Connect with certified doctors, pharmacists, and dietitians for comprehensive healthcare guidance",
      icon: "🛡️",
      features: [
        { text: "Medical Consultations", icon: "✓" },
        { text: "Medication Counseling", icon: "✓" },
        { text: "Nutrition Planning", icon: "✓" }
      ],
      quote: "Comprehensive healthcare from trusted professionals, all in one place",
      isMainSlide: true
    },
    {
      title: "Expert Medical Consultations",
      description: "Professional healthcare advice from certified doctors across specializations",
      icon: "🩺"
    },
    {
      title: "Pharmaceutical Counseling",
      description: "Expert medication guidance and prescription reviews from licensed pharmacists",
      icon: "💊"
    },
    {
      title: "Personalized Nutrition Plans",
      description: "Customized diet plans and wellness coaching from certified dietitians",
      icon: "🥗"
    },
    {
      title: "24/7 Online Healthcare",
      description: "Book consultations with doctors, pharmacists, and dietitians at your convenience",
      icon: "🌐"
    }
  ]

  const slides = websiteSettings?.heroSection?.slides?.length > 0 
    ? websiteSettings.heroSection.slides.sort((a, b) => (a.order || 0) - (b.order || 0))
    : defaultSlides

  // Debug: Log slides to check if images are present
  useEffect(() => {
    if (websiteSettings?.heroSection?.slides?.length > 0) {
      // Slides loaded from database
    } else {
      // Using default slides
    }
  }, [websiteSettings])

  const medicalQuotes = [
    {
      quote: "The art of medicine consists of amusing the patient while nature cures the disease.",
      author: "Voltaire"
    },
    {
      quote: "Medicine is not only a science; it is also an art.",
      author: "Paracelsus"
    },
    {
      quote: "The greatest wealth is health.",
      author: "Virgil"
    },
    {
      quote: "Prevention is better than cure.",
      author: "Desiderius Erasmus"
    },
    {
      quote: "Health is the greatest gift, contentment the greatest wealth.",
      author: "Buddha"
    }
  ]

  const customerReviews = [
    {
      name: "Priya Sharma",
      rating: 5,
      review: "Excellent service! The pharmacist was very knowledgeable and helped me understand my medications better.",
      date: "2 weeks ago",
      avatar: "PS"
    },
    {
      name: "Rahul Kumar",
      rating: 5,
      review: "Had a great consultation with a doctor. Very professional and provided clear treatment guidance.",
      date: "1 month ago",
      avatar: "RK"
    },
    {
      name: "Anjali Patel",
      rating: 5,
      review: "The dietitian created a personalized nutrition plan that really works! Feeling healthier already.",
      date: "3 weeks ago",
      avatar: "AP"
    },
    {
      name: "Vikram Singh",
      rating: 5,
      review: "Amazing platform! Got consultations from doctor, pharmacist, and dietitian all in one place.",
      date: "1 week ago",
      avatar: "VS"
    }
  ]

  useEffect(() => {
    fetchWebsiteSettings()
    // Delay location check slightly to ensure page is fully loaded
    const timer = setTimeout(() => {
      checkLocationPermission()
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const checkLocationPermission = async () => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      return
    }

    // Check if we already have location in localStorage
    const savedLocation = localStorage.getItem('userLocation')
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation)
        // Check if location is still valid (less than 5 minutes old)
        const locationAge = new Date() - new Date(parsed.timestamp)
        if (locationAge < 300000) { // 5 minutes
          setUserLocation(parsed)
          setLocationPermission('granted')
          return
        } else {
          // Location expired, remove it
          localStorage.removeItem('userLocation')
        }
      } catch (e) {
        console.error('Error parsing saved location:', e)
        localStorage.removeItem('userLocation')
      }
    }

    // Check if user previously dismissed the prompt
    const dismissed = localStorage.getItem('locationPromptDismissed')
    
    // Check permission status if available
    if (navigator.permissions) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' })
        setLocationPermission(result.state)
        
        if (result.state === 'granted') {
          getUserLocation()
        } else if (result.state === 'prompt' && !dismissed) {
          // Show custom prompt after a delay
          setTimeout(() => {
            setShowLocationPrompt(true)
          }, 3000)
        }

        // Listen for permission changes
        result.addEventListener('change', () => {
          setLocationPermission(result.state)
          if (result.state === 'granted') {
            getUserLocation()
          }
        })
      } catch (error) {
        if (!dismissed) {
          setTimeout(() => setShowLocationPrompt(true), 3000)
        }
      }
    } else {
      // Show prompt if permissions API not available and not dismissed
      if (!dismissed) {
        setTimeout(() => setShowLocationPrompt(true), 3000)
      }
    }
  }

  const getUserLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        }
        setUserLocation(location)
        setLocationPermission('granted')
        setShowLocationPrompt(false)
        localStorage.setItem('userLocation', JSON.stringify(location))
      },
      (error) => {
        console.error('Error getting location:', error.message, error.code)
        setLocationPermission('denied')
        setShowLocationPrompt(false)
        
        // Show user-friendly error message
        if (error.code === 1) {
          // User denied location access
        } else if (error.code === 2) {
          // Location unavailable
        } else if (error.code === 3) {
          // Location request timeout
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }

  const handleLocationRequest = () => {
    // Remove dismissed flag when user manually requests
    localStorage.removeItem('locationPromptDismissed')
    getUserLocation()
  }

  const handleLocationDismiss = () => {
    setShowLocationPrompt(false)
    localStorage.setItem('locationPromptDismissed', 'true')
  }

  // Swipe handlers for subscription plans
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50
    
    if (isLeftSwipe && currentPlanSlide < subscriptionPlans.length - 1) {
      setCurrentPlanSlide(currentPlanSlide + 1)
    }
    
    if (isRightSwipe && currentPlanSlide > 0) {
      setCurrentPlanSlide(currentPlanSlide - 1)
    }
    
    setTouchStart(0)
    setTouchEnd(0)
  }

  const fetchWebsiteSettings = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/website/settings`)
      setWebsiteSettings(res.data)
    } catch (err) {
      console.error('Error fetching website settings:', err)
    }
  }

  const fetchSubscriptionPlans = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/subscriptions/plans`)
      // The API returns { plans: { essential: {...}, chronic: {...}, fatToFit: {...} } }
      // Convert to array format for display
      const plansData = res.data.plans
      const plansArray = Object.keys(plansData).map(key => {
        const plan = plansData[key]
        const features = []
        
        // Add consultation limits
        if (plan.monthly.sessionsLimit > 0) {
          features.push(`${plan.monthly.sessionsLimit} Pharmacist Consultation${plan.monthly.sessionsLimit > 1 ? 's' : ''}`)
        }
        if (plan.monthly.doctorConsultationsLimit > 0) {
          features.push(`${plan.monthly.doctorConsultationsLimit} Doctor Consultation${plan.monthly.doctorConsultationsLimit > 1 ? 's' : ''}`)
        }
        if (plan.monthly.nutritionistConsultationsLimit > 0) {
          features.push(`${plan.monthly.nutritionistConsultationsLimit} Dietitian Consultation${plan.monthly.nutritionistConsultationsLimit > 1 ? 's' : ''}`)
        }
        
        // Add other features
        if (plan.features.dietChart) features.push('Personalized Diet Chart')
        if (plan.features.diabetesCare) features.push('Diabetes Care')
        if (plan.features.pcosCare) features.push('PCOS Care')
        if (plan.features.bpCare) features.push('BP Care')
        if (plan.features.weightManagement) features.push('Weight Management')
        if (plan.features.personalizedDietPlan) features.push('Personalized Diet Plan')
        if (plan.features.prescriptionExplanation) features.push('Prescription Explanation')
        if (plan.features.medicineGuidance) features.push('Medicine Guidance')
        if (plan.features.whatsappSupport) features.push('WhatsApp Support')
        if (plan.features.verifiedContent) features.push('Verified Content')
        if (plan.features.chronicCareGuidance) features.push('Chronic Care Guidance')
        if (plan.features.labReportExplanation) features.push('Lab Report Explanation')
        if (plan.features.medicationReminders) features.push('Medication Reminders')
        if (plan.features.priorityBooking) features.push('Priority Booking')
        
        features.push(`Up to ${plan.monthly.familyMembersLimit} family member${plan.monthly.familyMembersLimit > 1 ? 's' : ''}`)
        
        return {
          id: key,
          name: plan.name,
          description: plan.description,
          price: plan.monthly.price,
          yearlyPrice: plan.yearly?.price,
          duration: 1,
          durationType: 'month',
          consultationsPerMonth: plan.monthly.sessionsLimit + plan.monthly.doctorConsultationsLimit + plan.monthly.nutritionistConsultationsLimit,
          features: features,
          discount: 0,
          isActive: true
        }
      })
      setSubscriptionPlans(plansArray)
    } catch (err) {
      console.error('Error fetching subscription plans:', err)
    }
  }

  useEffect(() => {
    fetchWebsiteSettings()
    fetchSubscriptionPlans()
    // Delay location check slightly to ensure page is fully loaded
    const timer = setTimeout(() => {
      checkLocationPermission()
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  // Auto-slide for hero section
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000) // Change slide every 5 seconds
    return () => clearInterval(interval)
  }, [])

  // Auto-rotate quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % medicalQuotes.length)
    }, 7000) // Change quote every 7 seconds
    return () => clearInterval(interval)
  }, [])

  // Auto-slide reviews
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentReview((prev) => (prev + 1) % customerReviews.length)
    }, 4000) // Change review every 4 seconds
    return () => clearInterval(interval)
  }, [])

  // Auto-slide How It Works steps
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % 4) // 4 steps
    }, 3500) // Change step every 3.5 seconds
    return () => clearInterval(interval)
  }, [])

  const renderStars = (rating) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-5 h-5 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'} fill-current`}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    )
  }

  return (
    <>
      <SEO
        title="DrX Consult - Online Healthcare Consultations | Doctors, Pharmacists & Dietitians"
        description="Get professional healthcare consultations from certified doctors, pharmacists, and dietitians. Book online appointments for medical advice, medication counseling, and personalized nutrition plans. Available 24/7 with secure, affordable healthcare support."
        keywords="online doctor consultation, pharmacist counseling, dietitian consultation, medical advice online, nutrition counseling, medication guidance, healthcare consultation, telemedicine, online healthcare, virtual doctor, diet planning, prescription review, health consultation India"
        url="/"
        type="website"
      />
      <Layout>
      <div className="bg-gray-50 md:pt-0 -mt-1" suppressHydrationWarning>
        {/* Hero Slider Section */}
        <div className="relative overflow-hidden" suppressHydrationWarning>
          {/* Slide Backgrounds - Each slide has its own full-width background */}
          {slides.map((slide, index) => (
            <div
              key={`bg-${index}`}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                backgroundImage: slide.slideImage && slide.slideImage.trim() !== ''
                  ? `url(${slide.slideImage})`
                  : websiteSettings?.heroSection?.backgroundImage
                  ? `url(${websiteSettings.heroSection.backgroundImage})`
                  : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: !slide.slideImage && !websiteSettings?.heroSection?.backgroundImage
                  ? undefined
                  : 'transparent'
              }}
            >
              {/* Gradient overlay for better text readability */}
              {!slide.slideImage && !websiteSettings?.heroSection?.backgroundImage && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800"></div>
              )}
              {/* Dark overlay for images */}
              <div className="absolute inset-0 bg-black opacity-50"></div>
            </div>
          ))}

          {/* Content Container */}
          <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16 lg:py-20 relative z-10">
            <div 
              className="max-w-4xl mx-auto text-center rounded-2xl p-6 sm:p-8 text-white"
              style={{
                backgroundImage: websiteSettings?.heroSection?.textBackgroundImage 
                  ? `url(${websiteSettings.heroSection.textBackgroundImage})` 
                  : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: websiteSettings?.heroSection?.textBackgroundImage 
                  ? 'rgba(0, 0, 0, 0.3)' 
                  : 'transparent',
                backdropFilter: websiteSettings?.heroSection?.textBackgroundImage 
                  ? 'blur(2px)' 
                  : 'none'
              }}
            >
              {/* Sliding Content */}
              <div className="relative" style={{ minHeight: '300px' }}>
                {slides.map((slide, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-all duration-1000 ${
                      index === currentSlide
                        ? 'opacity-100 transform translate-x-0'
                        : index < currentSlide
                        ? 'opacity-0 transform -translate-x-full'
                        : 'opacity-0 transform translate-x-full'
                    }`}
                  >
                    {slide.isMainSlide ? (
                      /* Main Banner Slide */
                      <div className="space-y-4 sm:space-y-6">
                        {/* Icon only (no image display here since it's the background) */}
                        {!slide.slideImage && (
                          <div className="mb-4 sm:mb-6 inline-block">
                            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-3 sm:p-4 inline-flex">
                              <svg className="w-8 h-8 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                            </div>
                          </div>
                        )}

                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-3 sm:mb-4 leading-tight">
                          {websiteSettings?.heroSection?.title || slide.title}
                        </h1>
                        
                        <div className="space-y-2 sm:space-y-3">
                          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-blue-100">
                            {websiteSettings?.heroSection?.subtitle || slide.subtitle}
                          </p>
                          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-blue-50 max-w-2xl mx-auto leading-relaxed px-4">
                            {websiteSettings?.heroSection?.description || slide.description}
                          </p>
                        </div>

                        {/* Key Features */}
                        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-4 sm:mt-6 px-4">
                          {slide.features.map((feature, idx) => (
                            <div key={idx} className="bg-white bg-opacity-10 backdrop-blur-sm rounded-full px-3 sm:px-6 py-2 sm:py-3 flex items-center space-x-1 sm:space-x-2">
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs sm:text-sm font-medium">{feature.text}</span>
                            </div>
                          ))}
                        </div>

                        <p className="mt-4 sm:mt-6 text-sm sm:text-base text-blue-100 italic max-w-2xl mx-auto px-4">
                          "{slide.quote}"
                        </p>

                        {/* CTA Button */}
                        <div className="mt-6 sm:mt-8">
                          <a
                            href="#pharmacists"
                            className="inline-block bg-white text-blue-600 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg hover:bg-blue-50 transition-colors shadow-lg"
                          >
                            {websiteSettings?.heroSection?.ctaText || 'Book Consultation'}
                          </a>
                        </div>
                      </div>
                    ) : (
                      /* Regular Slides */
                      <div>
                        {/* Icon only (no image display here since it's the background) */}
                        {!slide.slideImage && (
                          <div className="text-4xl sm:text-6xl mb-4 sm:mb-6 animate-bounce">{slide.icon}</div>
                        )}
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">{slide.title}</h1>
                        <p className="text-base sm:text-lg lg:text-xl text-blue-100 px-4">{slide.description}</p>
                        {slide.quote && (
                          <p className="mt-4 text-sm sm:text-base text-blue-100 italic max-w-2xl mx-auto px-4">
                            "{slide.quote}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Slide Indicators */}
              <div className="flex justify-center space-x-2 mt-6 sm:mt-8">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all ${
                      index === currentSlide ? 'bg-white w-6 sm:w-8' : 'bg-blue-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Our Healthcare Professionals Section */}
        <div id="professionals" className="container mx-auto px-4 py-8 sm:py-12">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-3 sm:mb-4">Our Healthcare Professionals</h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto px-4">
              Connect with certified doctors, pharmacists, and dietitians for comprehensive healthcare guidance
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 max-w-7xl mx-auto">
            {/* Doctors Tile */}
            <div
              onClick={() => router.push('/doctors')}
              className="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 aspect-square"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-teal-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative h-full p-4 sm:p-6 text-white flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">Doctors</h3>
                <p className="text-green-100 mb-3 sm:mb-4 text-xs sm:text-sm line-clamp-3">
                  Professional medical consultations and comprehensive healthcare
                </p>
                <div className="flex items-center space-x-1 text-xs sm:text-sm font-medium mt-auto">
                  <span>Consult Doctors</span>
                  <svg className="w-4 h-4 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full -mr-12 -mt-12"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white opacity-5 rounded-full -ml-10 -mb-10"></div>
            </div>

            {/* Pharmacists Tile */}
            <div
              onClick={() => router.push('/pharmacists')}
              className="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 aspect-square"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative h-full p-4 sm:p-6 text-white flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">Pharmacists</h3>
                <p className="text-blue-100 mb-3 sm:mb-4 text-xs sm:text-sm line-clamp-3">
                  Expert pharmaceutical counseling and medication guidance for your health needs
                </p>
                <div className="flex items-center space-x-1 text-xs sm:text-sm font-medium mt-auto">
                  <span>Consult Pharmacists</span>
                  <svg className="w-4 h-4 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full -mr-12 -mt-12"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white opacity-5 rounded-full -ml-10 -mb-10"></div>
            </div>

            {/* Nutritionists/Dietitians Tile */}
            <div
              onClick={() => router.push('/nutritionists')}
              className="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 aspect-square"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-lime-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative h-full p-4 sm:p-6 text-white flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">Dietitians</h3>
                <p className="text-emerald-100 mb-3 sm:mb-4 text-xs sm:text-sm line-clamp-3">
                  Personalized diet plans and nutrition counseling for a healthier lifestyle
                </p>
                <div className="flex items-center space-x-1 text-xs sm:text-sm font-medium mt-auto">
                  <span>Consult Dietitians</span>
                  <svg className="w-4 h-4 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full -mr-12 -mt-12"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white opacity-5 rounded-full -ml-10 -mb-10"></div>
            </div>

            {/* Find Nearby Hospital Tile */}
            <div
              onClick={() => router.push('/locate-hospital')}
              className="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 aspect-square"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-pink-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative h-full p-4 sm:p-6 text-white flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">Find Hospitals</h3>
                <p className="text-red-100 mb-3 sm:mb-4 text-xs sm:text-sm line-clamp-3">
                  Locate nearby hospitals and emergency care facilities with real-time availability
                </p>
                <div className="flex items-center space-x-1 text-xs sm:text-sm font-medium mt-auto">
                  <span>Find Nearby</span>
                  <svg className="w-4 h-4 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full -mr-12 -mt-12"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white opacity-5 rounded-full -ml-10 -mb-10"></div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-white py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 sm:mb-16">
              <div className="inline-block mb-4">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-semibold">
                  Simple Process
                </div>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-800 mb-4">How It Works</h2>
              <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
                Get expert healthcare consultation in just 4 easy steps
              </p>
            </div>

            {/* Steps Grid */}
            <div className="max-w-6xl mx-auto">
              {/* Desktop: Show all 4 steps in grid */}
              <div className="hidden lg:grid grid-cols-4 gap-8 relative">
                {/* Connecting Line (Desktop) */}
                <div className="absolute top-16 left-0 right-0 h-1 bg-gradient-to-r from-blue-200 via-green-200 to-purple-200" style={{ top: '80px' }}></div>

                {/* Step 1 */}
                <div className="relative">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 relative z-10">
                    <div className="flex flex-col items-center text-center">
                      {/* Step Number */}
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mb-4 shadow-lg">
                        <span className="text-2xl font-bold text-white">1</span>
                      </div>
                      {/* Icon */}
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-md">
                        <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      {/* Content */}
                      <h3 className="text-xl font-bold text-gray-800 mb-2">Choose Professional</h3>
                      <p className="text-sm text-gray-600">
                        Browse and select from our certified doctors, pharmacists, or dietitians based on your needs
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 relative z-10">
                    <div className="flex flex-col items-center text-center">
                      {/* Step Number */}
                      <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center mb-4 shadow-lg">
                        <span className="text-2xl font-bold text-white">2</span>
                      </div>
                      {/* Icon */}
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-md">
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      {/* Content */}
                      <h3 className="text-xl font-bold text-gray-800 mb-2">Book Appointment</h3>
                      <p className="text-sm text-gray-600">
                        Select a convenient time slot from the professional's available schedule and book instantly
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 relative z-10">
                    <div className="flex flex-col items-center text-center">
                      {/* Step Number */}
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center mb-4 shadow-lg">
                        <span className="text-2xl font-bold text-white">3</span>
                      </div>
                      {/* Icon */}
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-md">
                        <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      {/* Content */}
                      <h3 className="text-xl font-bold text-gray-800 mb-2">Make Payment</h3>
                      <p className="text-sm text-gray-600">
                        Complete secure payment through our trusted payment gateway to confirm your booking
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 relative z-10">
                    <div className="flex flex-col items-center text-center">
                      {/* Step Number */}
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-orange-700 rounded-full flex items-center justify-center mb-4 shadow-lg">
                        <span className="text-2xl font-bold text-white">4</span>
                      </div>
                      {/* Icon */}
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-md">
                        <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      {/* Content */}
                      <h3 className="text-xl font-bold text-gray-800 mb-2">Get Consultation</h3>
                      <p className="text-sm text-gray-600">
                        Join the video call at scheduled time and receive expert healthcare advice from your professional
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile & Tablet: 2-column grid with auto-slide */}
              <div className="lg:hidden">
                {/* 2-column grid for mobile/tablet */}
                <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-6">
                  {/* Step 1 */}
                  <div className={`transition-all duration-300 ${currentStep === 0 ? 'ring-4 ring-blue-400 ring-opacity-50' : ''}`}>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 sm:p-6 h-full">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mb-3 shadow-lg">
                          <span className="text-lg sm:text-xl font-bold text-white">1</span>
                        </div>
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-md">
                          <svg className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-2">Choose Professional</h3>
                        <p className="text-xs text-gray-600">
                          Browse and select from our certified professionals
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className={`transition-all duration-300 ${currentStep === 1 ? 'ring-4 ring-green-400 ring-opacity-50' : ''}`}>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 sm:p-6 h-full">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center mb-3 shadow-lg">
                          <span className="text-lg sm:text-xl font-bold text-white">2</span>
                        </div>
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-md">
                          <svg className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-2">Book Appointment</h3>
                        <p className="text-xs text-gray-600">
                          Select a convenient time slot and book instantly
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className={`transition-all duration-300 ${currentStep === 2 ? 'ring-4 ring-purple-400 ring-opacity-50' : ''}`}>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 sm:p-6 h-full">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center mb-3 shadow-lg">
                          <span className="text-lg sm:text-xl font-bold text-white">3</span>
                        </div>
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-md">
                          <svg className="w-7 h-7 sm:w-8 sm:h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-2">Make Payment</h3>
                        <p className="text-xs text-gray-600">
                          Complete secure payment to confirm booking
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className={`transition-all duration-300 ${currentStep === 3 ? 'ring-4 ring-orange-400 ring-opacity-50' : ''}`}>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 sm:p-6 h-full">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange-600 to-orange-700 rounded-full flex items-center justify-center mb-3 shadow-lg">
                          <span className="text-lg sm:text-xl font-bold text-white">4</span>
                        </div>
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-md">
                          <svg className="w-7 h-7 sm:w-8 sm:h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-2">Get Consultation</h3>
                        <p className="text-xs text-gray-600">
                          Join video call and receive expert advice
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step Indicators */}
                <div className="flex justify-center space-x-2">
                  {[0, 1, 2, 3].map((step) => (
                    <button
                      key={step}
                      onClick={() => setCurrentStep(step)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        step === currentStep ? 'bg-blue-600 w-8' : 'bg-gray-300'
                      }`}
                      aria-label={`Go to step ${step + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Additional Features */}
              <div className="mt-16 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-8 sm:p-10">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">What You Get</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">Instant Booking</h4>
                      <p className="text-sm text-gray-600">Book appointments 24/7 without waiting</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">Secure & Private</h4>
                      <p className="text-sm text-gray-600">Your health data is encrypted and protected</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">Digital Prescriptions</h4>
                      <p className="text-sm text-gray-600">Receive prescriptions directly in your dashboard</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">Flexible Timing</h4>
                      <p className="text-sm text-gray-600">Choose slots that fit your schedule</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">Follow-up Support</h4>
                      <p className="text-sm text-gray-600">Chat with professionals after consultation</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">Health Tracking</h4>
                      <p className="text-sm text-gray-600">Monitor your health with built-in trackers</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="text-center mt-12">
                <button
                  onClick={() => router.push('/signup')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl"
                >
                  Get Started Now
                </button>
                <p className="text-sm text-gray-500 mt-4">No credit card required • Free to sign up</p>
              </div>
            </div>
          </div>
        </div>

        {/* Medical Quotes Section */}
        <div className="relative bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-20 overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-200 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-green-200 rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-5xl mx-auto">
              {/* Section Header */}
              <div className="text-center mb-12">
                <div className="inline-block mb-4">
                  <div className="bg-gradient-to-r from-blue-600 to-teal-600 text-white px-6 py-2 rounded-full text-sm font-semibold">
                    Inspiration
                  </div>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">Words of Wisdom</h2>
                <p className="text-gray-600 text-lg">Timeless insights from medical pioneers</p>
              </div>

              {/* Quotes Carousel */}
              <div className="relative" style={{ minHeight: '280px' }}>
                {medicalQuotes.map((item, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-all duration-1000 ${
                      index === currentQuote
                        ? 'opacity-100 transform scale-100'
                        : 'opacity-0 transform scale-95'
                    }`}
                  >
                    <div className="bg-white rounded-2xl shadow-2xl p-10 md:p-12 relative overflow-hidden">
                      {/* Decorative corner */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-transparent rounded-bl-full opacity-50"></div>
                      
                      {/* Quote icon */}
                      <div className="relative z-10">
                        <div className="inline-block mb-6">
                          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-full p-4 shadow-lg">
                            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                            </svg>
                          </div>
                        </div>
                        
                        <p className="text-2xl md:text-3xl italic text-gray-800 mb-6 leading-relaxed font-serif">
                          "{item.quote}"
                        </p>
                        
                        <div className="flex items-center justify-center space-x-3">
                          <div className="h-px w-12 bg-gradient-to-r from-transparent to-blue-600"></div>
                          <p className="text-lg text-gray-700 font-bold">{item.author}</p>
                          <div className="h-px w-12 bg-gradient-to-l from-transparent to-blue-600"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Navigation Dots */}
              <div className="flex justify-center items-center space-x-3 mt-10">
                {medicalQuotes.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuote(index)}
                    className={`transition-all duration-300 rounded-full ${
                      index === currentQuote 
                        ? 'bg-gradient-to-r from-blue-600 to-teal-600 w-10 h-3 shadow-lg' 
                        : 'bg-gray-300 hover:bg-gray-400 w-3 h-3'
                    }`}
                    aria-label={`Go to quote ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Reviews Section */}
        <div className="container mx-auto px-4 py-12 sm:py-16">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-3 sm:mb-4">What Our Patients Say</h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600">Real experiences from real people</p>
          </div>

          {/* Desktop: Show all reviews in grid */}
          <div className="hidden lg:grid grid-cols-4 gap-6">
            {customerReviews.map((review, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {review.avatar}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-800 text-base">{review.name}</h3>
                    <p className="text-xs text-gray-500">{review.date}</p>
                  </div>
                </div>
                {renderStars(review.rating)}
                <p className="text-gray-600 mt-3 text-sm leading-relaxed">{review.review}</p>
              </div>
            ))}
          </div>

          {/* Mobile & Tablet: Auto-sliding carousel */}
          <div className="lg:hidden relative overflow-hidden">
            <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentReview * 100}%)` }}>
              {customerReviews.map((review, index) => (
                <div
                  key={index}
                  className="w-full flex-shrink-0 px-4"
                >
                  <div className="bg-white rounded-lg shadow-lg p-6 mx-auto max-w-md">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {review.avatar}
                      </div>
                      <div className="ml-3">
                        <h3 className="font-semibold text-gray-800 text-base">{review.name}</h3>
                        <p className="text-xs text-gray-500">{review.date}</p>
                      </div>
                    </div>
                    {renderStars(review.rating)}
                    <p className="text-gray-600 mt-3 text-sm leading-relaxed">{review.review}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Slide Indicators */}
            <div className="flex justify-center space-x-2 mt-6">
              {customerReviews.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentReview(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentReview ? 'bg-blue-600 w-8' : 'bg-gray-300'
                  }`}
                  aria-label={`Go to review ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center mt-8 sm:mt-12">
            <button
              onClick={() => window.location.href = '/signup'}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-semibold hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-300 shadow-lg"
            >
              Book Your Consultation Today
            </button>
          </div>
        </div>

        {/* Health Trackers Section */}
        <div className="bg-white py-12 sm:py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-3 sm:mb-4">
                Health Tracking Tools
              </h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                Monitor your health with our comprehensive tracking tools designed to help you stay on top of your wellness journey
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">💉</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Child Vaccine Tracker</h3>
                <p className="text-sm text-gray-600 mb-4">Track your child's vaccination schedule and never miss important immunizations</p>
                <a 
                  href="/health-trackers/child-vaccine"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  Start Tracking
                </a>
              </div>
              
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">🌸</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Period & PCOS Tracker</h3>
                <p className="text-sm text-gray-600 mb-4">Monitor menstrual cycles and assess PCOS risk with our comprehensive tracker</p>
                <a 
                  href="/health-trackers/period-pcos"
                  className="inline-block bg-pink-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-pink-700 transition-colors"
                >
                  Start Tracking
                </a>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">❤️</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Blood Pressure Tracker</h3>
                <p className="text-sm text-gray-600 mb-4">Monitor your blood pressure readings and track your cardiovascular health</p>
                <a 
                  href="/health-trackers/bp-tracker"
                  className="inline-block bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors"
                >
                  Start Tracking
                </a>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">🩺</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Diabetes Tracker</h3>
                <p className="text-sm text-gray-600 mb-4">Track glucose levels and manage your diabetes with detailed monitoring</p>
                <a 
                  href="/health-trackers/diabetes-tracker"
                  className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
                >
                  Start Tracking
                </a>
              </div>
            </div>
            
            <div className="text-center mt-8">
              <a 
                href="/health-trackers"
                className="inline-block bg-gray-800 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-900 transition-colors"
              >
                View All Health Trackers
              </a>
            </div>
          </div>
        </div>

        {/* Subscription Plans Section */}
        {subscriptionPlans.length > 0 && (
          <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 py-16 sm:py-20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                  Choose Your Health Plan
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Affordable subscription plans for comprehensive healthcare access
                </p>
              </div>
              
              {/* Desktop: Grid view */}
              <div className="hidden lg:grid grid-cols-3 gap-8 max-w-7xl mx-auto">
                {subscriptionPlans.map((plan, index) => (
                  <div 
                    key={plan.id}
                    className={`bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                      plan.id === 'chronic' ? 'scale-105 border-4 border-blue-500' : ''
                    }`}
                  >
                    {plan.id === 'chronic' && (
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center py-2 text-sm font-semibold">
                        ⭐ MOST POPULAR
                      </div>
                    )}
                    
                    <div className="p-8">
                      <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                        <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                        <div className="mb-3">
                          <div className="flex items-baseline justify-center">
                            <span className="text-5xl font-bold text-gray-900">₹{plan.price}</span>
                            <span className="text-gray-600 ml-2">/month</span>
                          </div>
                          {plan.yearlyPrice && (
                            <div className="mt-2 text-sm text-gray-600">
                              or ₹{plan.yearlyPrice}/year
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-4 mb-8">
                        <div className="flex items-start">
                          <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="font-semibold text-gray-800">
                              {plan.consultationsPerMonth === -1 ? 'Unlimited' : plan.consultationsPerMonth} Consultations
                            </p>
                            <p className="text-sm text-gray-600">Per month</p>
                          </div>
                        </div>
                        
                        {plan.features && plan.features.length > 0 && plan.features.slice(0, 6).map((feature, idx) => (
                          <div key={idx} className="flex items-start">
                            <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <p className="text-gray-700">{feature}</p>
                          </div>
                        ))}
                        
                        {plan.discount > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                            <p className="text-green-700 font-semibold text-sm text-center">
                              🎉 Save {plan.discount}% on this plan!
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => router.push('/patient/dashboard?tab=subscription')}
                        className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                          plan.id === 'chronic'
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
                            : 'bg-gray-800 text-white hover:bg-gray-900'
                        }`}
                      >
                        Get Started
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile & Tablet: Swipeable carousel */}
              <div className="lg:hidden">
                <div className="relative overflow-hidden">
                  <div 
                    className="flex transition-transform duration-300 ease-out touch-pan-x"
                    style={{ 
                      transform: `translateX(-${currentPlanSlide * 100}%)`,
                      scrollSnapType: 'x mandatory'
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    {subscriptionPlans.map((plan, index) => (
                      <div 
                        key={plan.id}
                        className="w-full flex-shrink-0 px-4"
                        style={{ scrollSnapAlign: 'start' }}
                      >
                        <div 
                          className={`bg-white rounded-2xl shadow-xl overflow-hidden mx-auto max-w-md ${
                            plan.id === 'chronic' ? 'border-4 border-blue-500' : ''
                          }`}
                        >
                          {plan.id === 'chronic' && (
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center py-2 text-sm font-semibold">
                              ⭐ MOST POPULAR
                            </div>
                          )}
                          
                          <div className="p-6">
                            <div className="text-center mb-6">
                              <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                              <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                              <div className="mb-3">
                                <div className="flex items-baseline justify-center">
                                  <span className="text-4xl font-bold text-gray-900">₹{plan.price}</span>
                                  <span className="text-gray-600 ml-2">/month</span>
                                </div>
                                {plan.yearlyPrice && (
                                  <div className="mt-2 text-sm text-gray-600">
                                    or ₹{plan.yearlyPrice}/year
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-3 mb-6">
                              <div className="flex items-start">
                                <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <div>
                                  <p className="font-semibold text-gray-800">
                                    {plan.consultationsPerMonth === -1 ? 'Unlimited' : plan.consultationsPerMonth} Consultations
                                  </p>
                                  <p className="text-sm text-gray-600">Per month</p>
                                </div>
                              </div>
                              
                              {plan.features && plan.features.length > 0 && plan.features.slice(0, 5).map((feature, idx) => (
                                <div key={idx} className="flex items-start">
                                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  <p className="text-gray-700 text-sm">{feature}</p>
                                </div>
                              ))}
                            </div>
                            
                            <button
                              onClick={() => router.push('/patient/dashboard?tab=subscription')}
                              className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                                plan.id === 'chronic'
                                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg'
                                  : 'bg-gray-800 text-white hover:bg-gray-900'
                              }`}
                            >
                              Get Started
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Slide Indicators */}
                <div className="flex justify-center space-x-2 mt-6">
                  {subscriptionPlans.map((plan, index) => (
                    <button
                      key={plan.id}
                      onClick={() => setCurrentPlanSlide(index)}
                      className={`transition-all rounded-full ${
                        index === currentPlanSlide
                          ? 'bg-blue-600 w-8 h-3' 
                          : 'bg-gray-300 w-3 h-3'
                      }`}
                      aria-label={`Go to ${plan.name} plan`}
                    />
                  ))}
                </div>

                {/* Swipe Instructions */}
                <div className="text-center mt-4">
                  <p className="text-sm text-gray-500">← Swipe to see more plans →</p>
                </div>
              </div>
              
              <div className="text-center mt-12">
                <a 
                  href="/patient/dashboard?tab=subscription"
                  className="inline-block text-blue-600 hover:text-blue-700 font-semibold text-lg hover:underline"
                >
                  View All Plans & Compare Features →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="bg-gray-100 py-12 sm:py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <div className="text-center">
                <div className="bg-blue-600 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Certified Professionals</h3>
                <p className="text-sm sm:text-base text-gray-600">All our pharmacists are licensed and experienced</p>
              </div>
              <div className="text-center">
                <div className="bg-green-600 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">24/7 Availability</h3>
                <p className="text-sm sm:text-base text-gray-600">Book appointments at your convenience</p>
              </div>
              <div className="text-center">
                <div className="bg-purple-600 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Secure & Private</h3>
                <p className="text-sm sm:text-base text-gray-600">Your health information is safe with us</p>
              </div>
            </div>
          </div>
        </div>

        {/* Location Permission Prompt */}
        {showLocationPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center md:justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Enable Location Access</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Allow us to access your location to find nearby healthcare professionals and hospitals for faster, more convenient care.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="text-xs text-blue-800">
                        <p className="font-medium mb-1">Benefits:</p>
                        <ul className="space-y-1">
                          <li>• Find nearby doctors, pharmacists & dietitians</li>
                          <li>• Locate closest hospitals in emergencies</li>
                          <li>• Get personalized recommendations</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleLocationRequest}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Allow Location
                    </button>
                    <button
                      onClick={handleLocationDismiss}
                      className="px-4 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                    >
                      Not Now
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    Your location data is only used to improve your experience and is never shared.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Location Status Indicator (when granted) */}
        {userLocation && locationPermission === 'granted' && (
          <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-40">
            <div className="bg-white rounded-full shadow-lg px-4 py-2 flex items-center space-x-2 border border-green-200 animate-fade-in">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs font-medium text-gray-700">Location Active</span>
            </div>
          </div>
        )}

        {/* Manual Location Enable Button (when not granted and prompt dismissed) */}
        {!userLocation && locationPermission !== 'granted' && !showLocationPrompt && (
          <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-40">
            <button
              onClick={() => setShowLocationPrompt(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-lg px-4 py-2 flex items-center space-x-2 hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 animate-fade-in"
              title="Enable location to find nearby healthcare professionals"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs font-medium">Enable Location</span>
            </button>
          </div>
        )}
      </div>
    </Layout>
    </>
  )
}
