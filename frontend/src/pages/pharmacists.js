import { useState, useEffect } from 'react'
import axios from 'axios'
import PharmacistCard from '@/components/PharmacistCard'
import Layout from '@/components/Layout'
import SEO from '@/components/SEO'
import { useRouter } from 'next/router'

export default function PharmacistsPage() {
  const router = useRouter()
  const [pharmacists, setPharmacists] = useState([])
  const [filteredPharmacists, setFilteredPharmacists] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedLanguage, setSelectedLanguage] = useState('all')
  const [sortBy, setSortBy] = useState('smart')

  const categories = [
    { id: 'all', name: 'All Pharmacists', icon: '💊' },
    { id: 'clinical', name: 'Clinical Pharmacist', icon: '🏥' },
    { id: 'consultant', name: 'Consultant Pharmacist', icon: '👨‍⚕️' },
    { id: 'hospital', name: 'Hospital Pharmacist', icon: '🏨' },
    { id: 'community', name: 'Community Pharmacist', icon: '🏪' },
    { id: 'specialist', name: 'Clinical Specialist', icon: '⚕️' }
  ]

  useEffect(() => {
    fetchPharmacists()
  }, [])

  useEffect(() => {
    filterAndSortPharmacists()
  }, [pharmacists, searchQuery, selectedCategory, selectedLanguage, sortBy])

  const fetchPharmacists = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      const response = await axios.get(`${apiUrl}/pharmacists`)
      setPharmacists(response.data || [])
    } catch (error) {
      console.error('Error fetching pharmacists:', error)
      setPharmacists([])
    } finally {
      setLoading(false)
    }
  }

  // Collect all unique languages from loaded professionals
  const allLanguages = ['all', ...new Set(
    pharmacists.flatMap(p => p.languages || []).filter(Boolean)
  )].sort((a, b) => a === 'all' ? -1 : a.localeCompare(b))

  const smartScore = (p) => {
    const sessions = p.completedSessions || p.totalPatientsCounselled || 0
    const reviews = p.totalReviews || 0
    const rating = p.averageRating || p.rating || 0
    return sessions * 1 + reviews * 2 + rating * 10
  }

  const filterAndSortPharmacists = () => {
    let filtered = [...pharmacists]

    filtered = filtered.filter(p => !p.adminDisabled)

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.designation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.languages || []).some(l => l.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p =>
        p.designation?.toLowerCase().includes(selectedCategory.toLowerCase())
      )
    }

    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(p =>
        (p.languages || []).some(l => l.toLowerCase() === selectedLanguage.toLowerCase())
      )
    }

    filtered.sort((a, b) => {
      // Online always first
      const aOnline = a.status === 'online' ? 1 : 0
      const bOnline = b.status === 'online' ? 1 : 0
      if (bOnline !== aOnline) return bOnline - aOnline

      switch (sortBy) {
        case 'smart':
          return smartScore(b) - smartScore(a)
        case 'name':
          return (a.userId?.name || '').localeCompare(b.userId?.name || '')
        case 'experience':
          return (b.totalPatientsCounselled || 0) - (a.totalPatientsCounselled || 0)
        case 'rating':
          return (b.averageRating || b.rating || 0) - (a.averageRating || a.rating || 0)
        default:
          return smartScore(b) - smartScore(a)
      }
    })

    setFilteredPharmacists(filtered)
  }

  return (
    <>
      <SEO
        title="Find Pharmacists - Expert Pharmaceutical Counseling | DrX Consult"
        description="Browse certified pharmacists for professional pharmaceutical counseling. Get expert medication guidance, prescription reviews, and personalized healthcare advice. Part of our comprehensive healthcare consultation platform with doctors and dietitians."
        keywords="pharmacist consultation, pharmaceutical counseling, medication guidance, prescription review, clinical pharmacist, hospital pharmacist, online pharmacist, medication counseling, drug interaction check"
        url="/pharmacists"
      />
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <div className="inline-block mb-4">
                  <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-4 inline-flex">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">Find Expert Pharmacists</h1>
                <p className="text-xl text-blue-100 mb-6">
                  Connect with certified pharmaceutical professionals for personalized counseling and medication guidance
                </p>
                <div className="flex items-center justify-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Licensed Professionals</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Verified Credentials</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>24/7 Available</span>
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
                    placeholder="Search pharmacists..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search Pharmacists</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by name, specialization, or language..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="smart">Best Match (Online + Popular)</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="experience">Most Consultations</option>
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
                            ? 'bg-blue-600 text-white shadow'
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                >
                  <option value="smart">Sort: Best Match</option>
                  <option value="name">Sort: Name (A-Z)</option>
                  <option value="experience">Sort: Most Consultations</option>
                  <option value="rating">Sort: Highest Rated</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Filter by Category</label>
                <div className="flex flex-wrap gap-2 md:gap-3">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-3 md:px-4 py-2 rounded-xl font-medium transition-all transform hover:scale-105 text-sm ${
                        selectedCategory === category.id
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span className="mr-1 md:mr-2">{category.icon}</span>
                      <span className="hidden sm:inline">{category.name}</span>
                      <span className="sm:hidden">{category.name.split(' ')[0]}</span>
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
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
                <p className="mt-4 text-gray-600 text-lg">Loading pharmacists...</p>
              </div>
            ) : filteredPharmacists.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {filteredPharmacists.length} Pharmacist{filteredPharmacists.length !== 1 ? 's' : ''} Found
                  </h2>
                  <button
                    onClick={() => router.push('/')}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Back to Home</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredPharmacists.map(pharmacist => (
                    <PharmacistCard key={pharmacist._id} pharmacist={pharmacist} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">No Pharmacists Found</h3>
                <p className="text-gray-600 mb-6">Try adjusting your search or filter criteria</p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory('all')
                    setSelectedLanguage('all')
                  }}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium"
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
