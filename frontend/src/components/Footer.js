import Link from 'next/link'
import { useState, useEffect } from 'react'
import axios from 'axios'

export default function Footer() {
  const [websiteSettings, setWebsiteSettings] = useState(null)
  const [customerServices, setCustomerServices] = useState([])

  useEffect(() => {
    fetchWebsiteSettings()
    fetchCustomerServices()
  }, [])

  const fetchWebsiteSettings = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/website/settings`)
      setWebsiteSettings(res.data)
    } catch (err) {
      console.error('Error fetching website settings:', err)
    }
  }

  const fetchCustomerServices = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/website/customer-service`)
      setCustomerServices(res.data.slice(0, 3)) // Show only first 3 in footer
    } catch (err) {
      console.error('Error fetching customer services:', err)
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
      default:
        return value
    }
  }

  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <div className="flex items-center mb-4">
              {websiteSettings?.logo && (
                <img 
                  src={websiteSettings.logo} 
                  alt="Logo" 
                  className="h-8 w-8 mr-2"
                />
              )}
              <h3 className="text-lg font-semibold">
                {websiteSettings?.websiteName || 'Patient Counselling Platform'}
              </h3>
            </div>
            <p className="text-gray-400 text-sm">
              {websiteSettings?.footerText || 'Connecting patients with expert pharmacists for personalized online counselling sessions.'}
            </p>
            
            {/* Social Media Links */}
            {websiteSettings?.socialMedia && (
              <div className="flex space-x-3 mt-4">
                {websiteSettings.socialMedia.facebook && (
                  <a href={websiteSettings.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                    📘
                  </a>
                )}
                {websiteSettings.socialMedia.twitter && (
                  <a href={websiteSettings.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                    🇽
                  </a>
                )}
                {websiteSettings.socialMedia.instagram && (
                  <a href={websiteSettings.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                    📷
                  </a>
                )}
                {websiteSettings.socialMedia.linkedin && (
                  <a href={websiteSettings.socialMedia.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                    💼
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white transition">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-400 hover:text-white transition">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/customer-service" className="text-gray-400 hover:text-white transition">
                  Customer Service
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="text-gray-400 hover:text-white transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-and-conditions" className="text-gray-400 hover:text-white transition">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-gray-400 hover:text-white transition">
                  Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Customer Service</h3>
            <ul className="space-y-2 text-sm">
              {customerServices.map((service) => (
                <li key={service._id}>
                  <a 
                    href={getContactMethodLink(service.contactMethod, service.contactValue)}
                    className="text-gray-400 hover:text-white transition flex items-center"
                    target={service.contactMethod === 'whatsapp' ? '_blank' : undefined}
                    rel={service.contactMethod === 'whatsapp' ? 'noopener noreferrer' : undefined}
                  >
                    <span className="mr-2">{service.icon || getContactMethodIcon(service.contactMethod)}</span>
                    {service.title}
                  </a>
                </li>
              ))}
              <li>
                <Link href="/customer-service" className="text-blue-400 hover:text-blue-300 transition text-sm">
                  View All Support Options →
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Info</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center">
                <span className="mr-2">📧</span>
                <a href={`mailto:${websiteSettings?.contactInfo?.email || 'support@patientcounselling.com'}`} className="hover:text-white transition">
                  {websiteSettings?.contactInfo?.email || 'support@patientcounselling.com'}
                </a>
              </li>
              <li className="flex items-center">
                <span className="mr-2">📞</span>
                <a href={`tel:${websiteSettings?.contactInfo?.phone || '+1 (555) 123-4567'}`} className="hover:text-white transition">
                  {websiteSettings?.contactInfo?.phone || '+1 (555) 123-4567'}
                </a>
              </li>
              <li className="flex items-start">
                <span className="mr-2 mt-0.5">📍</span>
                <span>{websiteSettings?.contactInfo?.address || '123 Healthcare St, Medical City'}</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">🕒</span>
                <span>{websiteSettings?.contactInfo?.workingHours || 'Mon-Fri: 9:00 AM - 6:00 PM'}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} {websiteSettings?.websiteName || 'Patient Counselling Platform'}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
