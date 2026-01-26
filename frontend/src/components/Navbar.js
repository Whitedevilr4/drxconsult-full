import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    router.push('/')
  }

  const getDashboardLink = () => {
    if (!user) return null
    if (user.role === 'admin') return '/admin/dashboard'
    if (user.role === 'pharmacist') return '/pharmacist/dashboard'
    if (user.role === 'doctor') return '/doctor/dashboard'
    return '/patient/dashboard'
  }

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="text-2xl font-bold text-blue-600">
              💊 DRx Consult
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link 
              href="/" 
              className={`hover:text-blue-600 transition ${router.pathname === '/' ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}
            >
              Home
            </Link>
            
            {user ? (
              <>
                <Link 
                  href={getDashboardLink()} 
                  className={`hover:text-blue-600 transition ${router.pathname.includes('dashboard') ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}
                >
                  Dashboard
                </Link>
                <div className="flex items-center space-x-4">
                  <NotificationBell />
                  <span className="text-gray-600">
                    👤 {user.name}
                  </span>
                  <button 
                    onClick={handleLogout}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="text-gray-700 hover:text-blue-600 transition"
                >
                  Login
                </Link>
                <Link 
                  href="/signup" 
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-gray-700"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 space-y-3">
            <Link 
              href="/" 
              className="block py-2 text-gray-700 hover:text-blue-600"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            
            {user ? (
              <>
                <Link 
                  href={getDashboardLink()} 
                  className="block py-2 text-gray-700 hover:text-blue-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-gray-600">👤 {user.name}</span>
                  <NotificationBell />
                </div>
                <button 
                  onClick={() => {
                    handleLogout()
                    setIsMenuOpen(false)
                  }}
                  className="block w-full text-left py-2 text-red-600 hover:text-red-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="block py-2 text-gray-700 hover:text-blue-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link 
                  href="/signup" 
                  className="block py-2 bg-blue-600 text-white text-center rounded hover:bg-blue-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
