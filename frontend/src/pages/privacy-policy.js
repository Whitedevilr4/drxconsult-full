import { useState, useEffect } from 'react'
import axios from 'axios'
import Layout from '@/components/Layout'

export default function PrivacyPolicy() {
  const [legalPage, setLegalPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchLegalPage()
  }, [])

  const fetchLegalPage = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/website/legal/privacy-policy`)
      setLegalPage(res.data)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching privacy policy:', err)
      setError(err.response?.status === 404 ? 'Privacy policy not found' : 'Failed to load privacy policy')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-12 px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading privacy policy...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-12 px-4">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-yellow-800">{error}</p>
              <p className="text-sm text-yellow-600 mt-2">Please contact support if this issue persists.</p>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">{legalPage.title}</h1>
          
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Last updated:</strong> {new Date(legalPage.lastUpdated).toLocaleDateString()}
              {legalPage.version && (
                <span className="ml-4">
                  <strong>Version:</strong> {legalPage.version}
                </span>
              )}
            </p>
            
            {/* Dynamic Content */}
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: legalPage.content.replace(/\n/g, '<br/>') }}
            />

            {legalPage.updatedBy && (
              <div className="bg-gray-50 p-4 rounded mt-8">
                <p className="text-sm text-gray-600">
                  Last updated by: {legalPage.updatedBy.name}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}