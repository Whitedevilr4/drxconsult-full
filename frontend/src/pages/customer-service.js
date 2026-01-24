import { useState, useEffect } from 'react'
import axios from 'axios'
import Layout from '@/components/Layout'

export default function CustomerService() {
  const [services, setServices] = useState([])
  const [websiteSettings, setWebsiteSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCustomerServices()
    fetchWebsiteSettings()
  }, [])

  const fetchCustomerServices = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/website/customer-service`)
      setServices(res.data)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching customer services:', err)
      setLoading(false)
    }
  }

  const fetchWebsiteSettings = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/website/settings`)
      setWebsiteSettings(res.data)
    } catch (err) {
      console.error('Error fetching website settings:', err)
    }
  }

  const getContactMethodIcon = (method) => {
    const icons = {
      phone: '📞',
      email: '📧',
      chat: '💬',
      form: '📝',
      whatsapp: '📱'
    }
    return icons[method] || '📞'
  }

  const getContactMethodLink = (method, value) => {
    switch (method) {
      case 'phone':
        return `tel:${value}`
      case 'email':
        return `mailto:${value}`
      case 'whatsapp':
        return `https://wa.me/${value.replace(/[^0-9]/g, '')}`
      case 'form':
        return value.startsWith('http') ? value : `/${value}`
      default:
        return value
    }
  }

  const getContactMethodText = (method) => {
    const texts = {
      phone: 'Call Now',
      email: 'Send Email',
      chat: 'Start Chat',
      form: 'Fill Form',
      whatsapp: 'WhatsApp'
    }
    return texts[method] || 'Contact'
  }

  return (
    <Layout>
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Customer Service
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're here to help! Choose the best way to reach our support team for assistance with your healthcare needs.
            </p>
          </div>

          {/* Contact Methods */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading support options...</p>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No support options available</h3>
              <p className="text-gray-500">Please check back later or contact us directly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {services.map((service) => (
                <div key={service._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="text-center">
                    <div className="text-4xl mb-4">
                      {service.icon || getContactMethodIcon(service.contactMethod)}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      {service.title}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {service.description}
                    </p>
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-1">Available:</p>
                      <p className="text-sm font-medium text-gray-700">
                        {service.workingHours}
                      </p>
                    </div>
                    <a
                      href={getContactMethodLink(service.contactMethod, service.contactValue)}
                      target={service.contactMethod === 'whatsapp' || service.contactMethod === 'form' ? '_blank' : undefined}
                      rel={service.contactMethod === 'whatsapp' || service.contactMethod === 'form' ? 'noopener noreferrer' : undefined}
                      className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors w-full"
                    >
                      {getContactMethodText(service.contactMethod)}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Contact Info */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Quick Contact Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl mb-2">📧</div>
                <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                <a 
                  href={`mailto:${websiteSettings?.contactInfo?.email || 'support@patientcounselling.com'}`}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  {websiteSettings?.contactInfo?.email || 'support@patientcounselling.com'}
                </a>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">📞</div>
                <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                <a 
                  href={`tel:${websiteSettings?.contactInfo?.phone || '+1 (555) 123-4567'}`}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  {websiteSettings?.contactInfo?.phone || '+1 (555) 123-4567'}
                </a>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">📍</div>
                <h3 className="font-semibold text-gray-900 mb-1">Address</h3>
                <p className="text-gray-600 text-sm">
                  {websiteSettings?.contactInfo?.address || '123 Healthcare St, Medical City'}
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🕒</div>
                <h3 className="font-semibold text-gray-900 mb-1">Hours</h3>
                <p className="text-gray-600 text-sm">
                  {websiteSettings?.contactInfo?.workingHours || 'Mon-Fri: 9:00 AM - 6:00 PM'}
                </p>
              </div>
            </div>
          </div>

          {/* FAQ Link */}
          <div className="bg-blue-50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Check Our FAQ First
            </h2>
            <p className="text-gray-600 mb-6">
              Many common questions are answered in our comprehensive FAQ section. You might find your answer there instantly!
            </p>
            <a
              href="/faq"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Browse FAQ
            </a>
          </div>
        </div>
      </div>
    </Layout>
  )
}