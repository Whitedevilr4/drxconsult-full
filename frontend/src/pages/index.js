import { useState, useEffect } from 'react'
import axios from 'axios'
import PharmacistCard from '@/components/PharmacistCard'
import DoctorCard from '@/components/DoctorCard'
import Layout from '@/components/Layout'
import SEO from '@/components/SEO'

export default function Home() {
  const [pharmacists, setPharmacists] = useState([])
  const [doctors, setDoctors] = useState([])
  const [websiteSettings, setWebsiteSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [currentQuote, setCurrentQuote] = useState(0)

  const slides = [
    {
      title: "Patient Counselling Platform",
      subtitle: "Your Health, Our Priority",
      description: "Connect with expert pharmacists for personalized counselling sessions",
      icon: "🛡️",
      features: [
        { text: "Medical History Tracking", icon: "✓" },
        { text: "Expert Counselling", icon: "✓" },
        { text: "Personalized Care", icon: "✓" }
      ],
      quote: "Medical history and proper counselling are essential for your wellbeing",
      isMainSlide: true
    },
    {
      title: "Your Health, Our Priority",
      description: "Expert pharmaceutical counseling for better health outcomes",
      icon: "💊"
    },
    {
      title: "Comprehensive Medical History",
      description: "Track your medications, allergies, and health conditions in one place",
      icon: "📋"
    },
    {
      title: "Professional Counseling",
      description: "Get personalized advice from certified pharmacists",
      icon: "👨‍⚕️"
    },
    {
      title: "24/7 Online Support",
      description: "Book appointments and get consultations at your convenience",
      icon: "🌐"
    }
  ]

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
      review: "Very professional and caring. Got my prescription reviewed and received valuable advice.",
      date: "1 month ago",
      avatar: "RK"
    },
    {
      name: "Anjali Patel",
      rating: 4,
      review: "Great experience! The online consultation was smooth and the pharmacist was very helpful.",
      date: "3 weeks ago",
      avatar: "AP"
    },
    {
      name: "Vikram Singh",
      rating: 5,
      review: "Highly recommend! They took time to explain everything and answered all my questions.",
      date: "1 week ago",
      avatar: "VS"
    }
  ]

  // Dummy data fallback
  const dummyPharmacists = [
    {
      _id: '1',
      userId: { name: 'Dr. Sarah Johnson', email: 'sarah@example.com' },
      designation: 'Clinical Pharmacist',
      totalPatientsCounselled: 150,
      photo: 'https://ui-avatars.com/api/?name=Sarah+Johnson&size=150&background=3498db&color=fff'
    },
    {
      _id: '2',
      userId: { name: 'Dr. Michael Chen', email: 'michael@example.com' },
      designation: 'Senior Pharmacist',
      totalPatientsCounselled: 200,
      photo: 'https://ui-avatars.com/api/?name=Michael+Chen&size=150&background=2ecc71&color=fff'
    },
    {
      _id: '3',
      userId: { name: 'Dr. Emily Davis', email: 'emily@example.com' },
      designation: 'Consultant Pharmacist',
      totalPatientsCounselled: 180,
      photo: 'https://ui-avatars.com/api/?name=Emily+Davis&size=150&background=e74c3c&color=fff'
    },
    {
      _id: '4',
      userId: { name: 'Dr. James Wilson', email: 'james@example.com' },
      designation: 'Hospital Pharmacist',
      totalPatientsCounselled: 165,
      photo: 'https://ui-avatars.com/api/?name=James+Wilson&size=150&background=9b59b6&color=fff'
    },
    {
      _id: '5',
      userId: { name: 'Dr. Lisa Anderson', email: 'lisa@example.com' },
      designation: 'Community Pharmacist',
      totalPatientsCounselled: 190,
      photo: 'https://ui-avatars.com/api/?name=Lisa+Anderson&size=150&background=f39c12&color=fff'
    },
    {
      _id: '6',
      userId: { name: 'Dr. Robert Taylor', email: 'robert@example.com' },
      designation: 'Clinical Specialist',
      totalPatientsCounselled: 175,
      photo: 'https://ui-avatars.com/api/?name=Robert+Taylor&size=150&background=1abc9c&color=fff'
    }
  ]

  useEffect(() => {
    fetchWebsiteSettings()
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (!apiUrl) {
      // Use dummy data if API URL not configured
      setPharmacists(dummyPharmacists)
      setLoading(false)
      return
    }

    axios.get(`${apiUrl}/pharmacists`)
      .then(res => {
        setPharmacists(res.data.length > 0 ? res.data : dummyPharmacists)
      })
      .catch(err => {
        console.error(err)
        // Fallback to dummy data on error
        setPharmacists(dummyPharmacists)
      })

    // Fetch doctors
    axios.get(`${apiUrl}/doctors`)
      .then(res => {
        setDoctors(res.data || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching doctors:', err)
        setDoctors([])
        setLoading(false)
      })
  }, [])

  const fetchWebsiteSettings = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/website/settings`)
      setWebsiteSettings(res.data)
    } catch (err) {
      console.error('Error fetching website settings:', err)
    }
  }

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
        title="DrX Consult - Online Pharmacy Consultation & Expert Medical Counseling"
        description="Get professional pharmaceutical counseling from certified pharmacists. Book online consultations, prescription reviews, and personalized medication guidance. Available 24/7 with secure, affordable healthcare support."
        keywords="online pharmacy consultation, pharmacist counseling, prescription review, medication guidance, healthcare consultation, medical advice, pharmacy services, drug interaction check, medication management, online pharmacist, pharmaceutical care, medicine consultation India"
        url="/"
        type="website"
      />
      <Layout>
      <div className="bg-gray-50">
        {/* Hero Slider Section */}
        <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="container mx-auto px-4 py-12 sm:py-16 lg:py-20 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
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
                        {/* Icon */}
                        <div className="mb-4 sm:mb-6 inline-block">
                          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-3 sm:p-4 inline-flex">
                            <svg className="w-8 h-8 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                        </div>

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
                        <div className="text-4xl sm:text-6xl mb-4 sm:mb-6 animate-bounce">{slide.icon}</div>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">{slide.title}</h1>
                        <p className="text-base sm:text-lg lg:text-xl text-blue-100 px-4">{slide.description}</p>
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
              Certified professionals dedicated to your health and wellness
            </p>
          </div>

          {loading ? (
            <div className="text-center py-8 sm:py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading healthcare professionals...</p>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Pharmacists Section */}
              {pharmacists.length > 0 && (
                <div>
                  <div className="text-center mb-8">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
                      💊 Pharmacists
                    </h3>
                    <p className="text-gray-600">Expert pharmaceutical counseling and medication guidance</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
                    {pharmacists.map(pharmacist => (
                      <PharmacistCard key={pharmacist._id} pharmacist={pharmacist} />
                    ))}
                  </div>
                </div>
              )}

              {/* Doctors Section */}
              {doctors.length > 0 && (
                <div>
                  <div className="text-center mb-8">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
                      🩺 Doctors
                    </h3>
                    <p className="text-gray-600">Professional medical consultations and healthcare advice</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
                    {doctors.map(doctor => (
                      <DoctorCard key={doctor._id} doctor={doctor} />
                    ))}
                  </div>
                </div>
              )}

              {/* No professionals available */}
              {pharmacists.length === 0 && doctors.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏥</div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No Healthcare Professionals Available</h3>
                  <p className="text-gray-600">Please check back later for available consultations.</p>
                </div>
              )}
            </div>
          )}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {customerReviews.map((review, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-lg">
                    {review.avatar}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{review.name}</h3>
                    <p className="text-xs text-gray-500">{review.date}</p>
                  </div>
                </div>
                {renderStars(review.rating)}
                <p className="text-gray-600 mt-3 text-xs sm:text-sm leading-relaxed">{review.review}</p>
              </div>
            ))}
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
      </div>
    </Layout>
    </>
  )
}
