import { useState, useEffect } from 'react'
import axios from 'axios'
import Layout from '@/components/Layout'
import SEO from '@/components/SEO'

export default function FAQ() {
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedFaq, setExpandedFaq] = useState(null)

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'general', label: 'General' },
    { value: 'booking', label: 'Booking' },
    { value: 'payment', label: 'Payment' },
    { value: 'consultation', label: 'Consultation' },
    { value: 'technical', label: 'Technical' },
    { value: 'other', label: 'Other' }
  ]

  useEffect(() => {
    fetchFAQs()
  }, [])

  const fetchFAQs = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/website/faqs`)
      setFaqs(res.data)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching FAQs:', err)
      setLoading(false)
    }
  }

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory
    const matchesSearch = searchTerm === '' || 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesCategory && matchesSearch
  })

  const toggleFaq = (faqId) => {
    setExpandedFaq(expandedFaq === faqId ? null : faqId)
  }

  const getCategoryIcon = (category) => {
    const icons = {
      general: '❓',
      booking: '📅',
      payment: '💳',
      consultation: '👨‍⚕️',
      technical: '🔧',
      other: '📋'
    }
    return icons[category] || '❓'
  }

  return (
    <>
      <SEO
        title="FAQ - Frequently Asked Questions | DrX Consult"
        description="Find answers to common questions about DrX Consult's online pharmacy consultation services, booking process, payments, and medication counseling. Get help with your healthcare queries."
        keywords="FAQ, frequently asked questions, pharmacy consultation help, online consultation questions, medication guidance FAQ, prescription review questions, healthcare support"
        url="/faq"
      />
      <Layout>
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Find answers to common questions about our platform, booking process, and services.
            </p>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search FAQs
                </label>
                <input
                  type="text"
                  placeholder="Search questions and answers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* FAQs */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading FAQs...</p>
            </div>
          ) : filteredFaqs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No FAQs found</h3>
              <p className="text-gray-500">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No FAQs are available at the moment.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-4 text-sm text-gray-600">
                Showing {filteredFaqs.length} of {faqs.length} FAQs
              </div>
              
              {filteredFaqs.map((faq) => (
                <div key={faq._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <button
                    onClick={() => toggleFaq(faq._id)}
                    className="w-full px-6 py-4 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="text-lg mr-2">
                            {getCategoryIcon(faq.category)}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            {categories.find(c => c.value === faq.category)?.label || faq.category}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 pr-4">
                          {faq.question}
                        </h3>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <svg
                          className={`w-5 h-5 text-gray-500 transform transition-transform ${
                            expandedFaq === faq._id ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                  
                  {expandedFaq === faq._id && (
                    <div className="px-6 pb-4 border-t border-gray-100">
                      <div className="pt-4">
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Contact Support */}
          <div className="mt-12 bg-blue-50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Still have questions?
            </h2>
            <p className="text-gray-600 mb-6">
              Can't find the answer you're looking for? Our customer support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/customer-service"
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
              >
                Contact Support
              </a>
              <a
                href="mailto:support@patientcounselling.com"
                className="bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-md hover:bg-blue-50 transition-colors"
              >
                Send Email
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
    </>
  )
}
