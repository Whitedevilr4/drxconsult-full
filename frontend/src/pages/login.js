import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'
import Layout from '@/components/Layout'
import GoogleSignInButton from '@/components/GoogleSignInButton'
import { toast } from 'react-toastify'

export default function Login() {
  const router = useRouter()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [showVerificationNotice, setShowVerificationNotice] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showSuspensionNotice, setShowSuspensionNotice] = useState(false)

  useEffect(() => {
    // Check if user was redirected due to suspension
    if (router.query.suspended === 'true') {
      setShowSuspensionNotice(true)
      toast.error('Your account has been suspended. Please contact support.')
    }
  }, [router.query])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setShowVerificationNotice(false)
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      if (!apiUrl) {
        const errorMsg = 'API URL not configured. Please check your .env.local file.'
        setError(errorMsg)
        toast.error(errorMsg)
        return
      }

      const res = await axios.post(`${apiUrl}/auth/login`, formData)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      
      toast.success('Login successful!')
      
      if (res.data.user.role === 'admin') {
        router.push('/admin/dashboard')
      } else if (res.data.user.role === 'pharmacist') {
        router.push('/pharmacist/dashboard')
      } else {
        router.push('/patient/dashboard')
      }
    } catch (err) {
      console.error('Login error:', err)
      let errorMsg = 'Login failed. Please try again.'
      
      if (err.response) {
        errorMsg = err.response.data?.message || 'Login failed'
        
        // Handle email not verified case
        if (err.response.data?.emailNotVerified) {
          setShowVerificationNotice(true)
          setUnverifiedEmail(err.response.data.email || formData.email)
          return
        }
        
        // Handle suspended account
        if (err.response.data?.suspended) {
          setShowSuspensionNotice(true)
          errorMsg = `Account suspended: ${err.response.data.reason || 'Contact support for details'}`
          return
        }
      } else if (err.request) {
        errorMsg = 'Cannot connect to server. Make sure the backend is running on port 5000.'
      }
      
      setError(errorMsg)
      toast.error(errorMsg)
    }
  }

  const handleGoToSignup = () => {
    router.push('/signup')
  }

  const handleGoogleSignInSuccess = (data, firebaseUser) => {
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    
    toast.success('Login successful!')
    
    if (data.user.role === 'admin') {
      router.push('/admin/dashboard')
    } else if (data.user.role === 'pharmacist') {
      router.push('/pharmacist/dashboard')
    } else {
      router.push('/patient/dashboard')
    }
  }

  const handleGoogleSignInError = (error) => {
    if (error.includes('Account not found')) {
      setShowVerificationNotice(false)
      setError('No account found with this Google account. Please sign up first.')
      toast.error('No account found. Please sign up first.')
    } else {
      setError(error)
      toast.error(error)
    }
  }

  return (
    <Layout showFooter={false}>
      <div className="bg-gray-50 min-h-screen flex items-center justify-center py-8 sm:py-12 px-4">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-6">Login</h2>
        
        {showSuspensionNotice && (
          <div className="bg-red-100 border-l-4 border-red-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  <strong>Account Suspended</strong>
                </p>
                <p className="text-sm text-red-700 mt-1">
                  Your account has been suspended. Please contact support for assistance.
                </p>
                <div className="mt-3">
                  <Link href="/customer-service" className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition inline-block">
                    Contact Support
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {showVerificationNotice && (
          <div className="bg-yellow-100 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Email Verification Required</strong>
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Your account ({unverifiedEmail}) needs email verification before you can login.
                </p>
                <div className="mt-3">
                  <button
                    onClick={handleGoToSignup}
                    className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700 transition"
                  >
                    Complete Verification
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Email or Username</label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="admin or user@example.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600 pr-12"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <div className="text-right mt-2">
              <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                Forgot Password?
              </Link>
            </div>
          </div>
          <button 
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Login
          </button>
        </form>
        
        {/* Divider */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>
        </div>
        
        {/* Google Sign In */}
        <div className="mt-6">
          <GoogleSignInButton
            onSuccess={handleGoogleSignInSuccess}
            onError={handleGoogleSignInError}
            isSignup={false}
          />
        </div>
        <p className="text-center mt-4 text-gray-600">
          Don't have an account? <Link href="/signup" className="text-blue-600 hover:underline">Sign up</Link>
        </p>
        </div>
      </div>
    </Layout>
  )
}
