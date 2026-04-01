import { useState, useEffect } from 'react'
import axios from 'axios'
import DoctorCard from '@/components/DoctorCard'
import Layout from '@/components/Layout'
import SEO from '@/components/SEO'
import { useRouter } from 'next/router'

export default function DoctorsPage() {
  const router = useRouter()
  const [doctors, setDoctors] = useState([])
  const [filteredDoctors, setFilteredDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSpecialization, setSelectedSpecialization] = useState('all')
  const [selectedLanguage, setSelectedLanguage] = useState('all')
  const [sortBy, setSortBy] = useState('smart')

  const specializations = [
    { id: 'all', name: 'All Specializations', icon: '🩺' },
    { id: 'general', name: 'General Physician', icon: '👨‍⚕️' },
    { id: 'cardiology', name: 'Cardiology', icon: '❤️' },
    { id: 'dermatology', name: 'Dermatology', icon: '🧴' },
    { id: 'pediatrics', name: 'Pediatrics', icon: '👶' },
    { id: 'orthopedics', name: 'Orthopedics', icon: '🦴' },
    { id: 'gynecology', name: 'Gynecology', icon: '👩‍⚕️' },
    { id: 'neurology', name: 'Neurology', icon: '🧠' },
    { id: 'psychiatry', name: 'Psychiatry', icon: '🧘' },
    { id: 'ophthalmology', name: 'Ophthalmology', icon: '👁️' },
    { id: 'ent', name: 'ENT', icon: '👂' }
  ]

  useEffect(() => {
    fetchDoctors()
  }, [])

  useEffect(() => {
    filterAndSortDoctors()
  }, [doctors, searchQuery, selectedSpecialization, selectedLanguage, sortBy])

  const fetchDoctors = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      const response = await axios.get(`${apiUrl}/doctors`)
      setDoctors(response.data || [])
    } catch (error) {
      console.error('Error fetching doctors:', error)
      setDoctors([])
    } finally {
      setLoading(false)
    }
  }

  const allLanguages = ['all', ...new Set(
    doctors.flatMap(d => d.languages || []).filter(Boolean)
  )].sort((a, b) => a === 'all' ? -1 : a.localeCompare(b))

  const smartScore = (d) => {
    const sessions = d.completedSessions || 0
    const reviews = d.totalReviews || 0
    const rating = d.averageRating || d.rating || 0
    return sessions * 1 + reviews * 2 + rating * 10
  }

  const filterAndSortDoctors = () => {
    let filtered = [...doctors]

    filtered = filtered.filter(d => !d.adminDisabled)

    if (searchQuery) {
      filtered = filtered.filter(d =>
        d.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.qualifications?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.languages || []).some(l => l.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    if (selectedSpecialization !== 'all') {
      filtered = filtered.filter(d =>
        d.specialization?.toLowerCase().includes(selectedSpecialization.toLowerCase())
      )
    }

    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(d =>
        (d.languages || []).some(l => l.toLowerCase() === selectedLanguage.toLowerCase())
      )
    }

    filtered.sort((a, b) => {
      const aOnline = a.status === 'online' ? 1 : 0
      const bOnline = b.status === 'online' ? 1 : 0
      if (bOnline !== aOnline) return bOnline - aOnline

      switch (sortBy) {
        case 'smart':
          return smartScore(b) - smartScore(a)
        case 'name':
          return (a.userId?.name || '').localeCompare(b.userId?.name || '')
        case 'experience':
          return (b.experience || b.yearsOfExperience || 0) - (a.experience || a.yearsOfExperience || 0)
        case 'fee':
          return (a.consultationFee || 0) - (b.consultationFee || 0)
        case 'rating':
          return (b.averageRating || b.rating || 0) - (a.averageRating || a.rating || 0)
        default:
          return smartScore(b) - smartScore(a)
      }
    })

    setFilteredDoctors(filtered)
  }

  return (
    <>
      <SEO
        title="Find Doctors - Expert Medical Consultations | DrX Consult"
        description="Browse certified doctors across specializations. Get professional medical consultations, health advice, and treatment plans from experienced physicians. Part of our comprehensive healthcare platform with pharmacists and dietitians."
        keywords="doctor consultation, medical advice, specialist doctors, online doctor, healthcare consultation, physician, telemedicine, virtual doctor, medical consultation online, general physician, specialist consultation"
        url="/doctors"
      />
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <div className="inline-block mb-4">
                  <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-4 inline-flex">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">Find Expert Doctors</h1>
                <p className="text-xl text-green-100 mb-6">
                  Connect with certified medical professionals across specializations for comprehensive healthcare
                </p>
                <div className="flex items-center justify-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Board Certified</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Experienced Physicians</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Online Consultations</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="container mx-auto px-4 -mt-8 mb-8">
            <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-6">
              {/* Mobile: Compact Search */}
              <div className="md:hidden mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search doctors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Desktop: Full Search */}
              <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Search */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search Doctors</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by name, specialization, or language..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  >
                    <option value="smart">Best Match (Online + Popular)</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="experience">Most Experienced</option>
                    <option value="fee">Lowest Fee</option>
                    <option value="rating">Highest Rated</option>
                  </select>
                </div>
              </div>

              {/* Language Filter */}
              {allLanguages.length > 1 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Language</label>
                  <div className="flex flex-wrap gap-2">
                    {allLanguages.map(lang => (
                      <button
                        key={lang}
                        onClick={() => setSelectedLanguage(lang)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          selectedLanguage === lang
                            ? 'bg-green-600 text-white shadow'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {lang === 'all' ? '🌐 All Languages' : `🗣 ${lang}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mobile: Sort Dropdown */}
              <div className="md:hidden mb-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm"
                >
                  <option value="smart">Sort: Best Match</option>
                  <option value="name">Sort: Name (A-Z)</option>
                  <option value="experience">Sort: Most Experienced</option>
                  <option value="fee">Sort: Lowest Fee</option>
                  <option value="rating">Sort: Highest Rated</option>
                </select>
              </div>

              {/* Specialization Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Filter by Specialization</label>
                <div className="flex flex-wrap gap-2 md:gap-3">
                  {specializations.map(spec => (
                    <button
                      key={spec.id}
                      onClick={() => setSelectedSpecialization(spec.id)}
                      className={`px-3 md:px-4 py-2 rounded-xl font-medium transition-all transform hover:scale-105 text-sm ${
                        selectedSpecialization === spec.id
                          ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span className="mr-1 md:mr-2">{spec.icon}</span>
                      <span className="hidden sm:inline">{spec.name}</span>
                      <span className="sm:hidden">{spec.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="container mx-auto px-4 pb-16">
            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-green-600"></div>
                <p className="mt-4 text-gray-600 text-lg">Loading doctors...</p>
              </div>
            ) : filteredDoctors.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {filteredDoctors.length} Doctor{filteredDoctors.length !== 1 ? 's' : ''} Found
                  </h2>
                  <button
                    onClick={() => router.push('/')}
                    className="text-green-600 hover:text-green-700 font-medium flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Back to Home</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredDoctors.map(doctor => (
                    <DoctorCard key={doctor._id} doctor={doctor} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">No Doctors Found</h3>
                <p className="text-gray-600 mb-6">Try adjusting your search or filter criteria</p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedSpecialization('all')
                    setSelectedLanguage('all')
                  }}
                  className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-colors font-medium"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  )
}
