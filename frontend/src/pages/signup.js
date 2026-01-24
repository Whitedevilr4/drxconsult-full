import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'
import Layout from '@/components/Layout'
import GoogleSignInButton from '@/components/GoogleSignInButton'
import { toast } from 'react-toastify'

export default function Signup() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: Form, 2: OTP Verification
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '' })
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpInfo, setOtpInfo] = useState(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)

  // Countdown timer for resend cooldown
  useState(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleRequestOTP = async (e) => {
    e.preventDefault()
    
    // Check if user agreed to terms
    if (!agreeToTerms) {
      setError('Please agree to the Terms & Conditions and Privacy Policy to continue.')
      toast.error('Please agree to the Terms & Conditions and Privacy Policy to continue.')
      return
    }
    
    setLoading(true)
    setError('')

    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/signup/request-otp`, {
        email: formData.email,
        name: formData.name
      })
      
      setOtpInfo(res.data)
      setStep(2)
      toast.success('OTP sent to your email address!')
      
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to send OTP'
      setError(errorMsg)
      toast.error(errorMsg)
      
      if (err.response?.data?.userExists) {
        // User already exists, redirect to login
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/signup/verify-otp`, {
        ...formData,
        otp
      })
      
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      toast.success('Account created and verified successfully!')
      router.push('/patient/dashboard')
      
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'OTP verification failed'
      setError(errorMsg)
      toast.error(errorMsg)
      
      // If OTP expired or rate limited, go back to step 1
      if (err.response?.data?.expired || err.response?.data?.rateLimited) {
        setStep(1)
        setOtp('')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/signup/resend-otp`, {
        email: formData.email,
        name: formData.name
      })
      
      setOtpInfo(res.data)
      setResendCooldown(60) // 1 minute cooldown
      toast.success('OTP resent to your email address!')
      
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to resend OTP'
      setError(errorMsg)
      toast.error(errorMsg)
      
      if (err.response?.data?.rateLimited) {
        setStep(1) // Go back to form if rate limited
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBackToForm = () => {
    setStep(1)
    setOtp('')
    setError('')
    setOtpInfo(null)
  }

  const handleGoogleSignUpSuccess = (data, firebaseUser) => {
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    toast.success('Account created successfully!')
    router.push('/patient/dashboard')
  }

  const handleGoogleSignUpError = (error) => {
    if (error.includes('already exists')) {
      setError('An account with this Google email already exists. Please login instead.')
      toast.error('Account already exists. Please login instead.')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } else {
      setError(error)
      toast.error(error)
    }
  }

  return (
    <Layout showFooter={false}>
      <div className="bg-gray-50 min-h-screen flex items-center justify-center py-8 sm:py-12 px-4">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-6">
            {step === 1 ? 'Sign Up' : 'Verify Your Email'}
          </h2>
          
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          {step === 1 ? (
            // Step 1: Registration Form
            <div>
              <form onSubmit={handleRequestOTP}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  disabled={loading}
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 mb-2">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600 pr-12"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                    minLength={6}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
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
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              </div>
              
              {/* Terms & Conditions Agreement */}
              <div className="mb-6">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="agree-terms"
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      disabled={loading}
                      required
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="agree-terms" className="text-gray-700">
                      I agree to the{' '}
                      <button
                        type="button"
                        className="text-blue-600 hover:underline font-medium"
                        onClick={() => window.open('/terms-and-conditions', '_blank')}
                      >
                        Terms & Conditions
                      </button>
                      {' '}and{' '}
                      <button
                        type="button"
                        className="text-blue-600 hover:underline font-medium"
                        onClick={() => window.open('/privacy-policy', '_blank')}
                      >
                        Privacy Policy
                      </button>
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                  </div>
                </div>
                {!agreeToTerms && (
                  <p className="text-xs text-gray-500 mt-2 ml-7">
                    You must agree to our terms and privacy policy to create an account.
                  </p>
                )}
              </div>
              
              <button 
                type="submit"
                className={`w-full py-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  agreeToTerms 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={loading || !agreeToTerms}
              >
                {loading ? 'Sending OTP...' : 'Send Verification Code'}
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
              
              {/* Google Sign Up */}
              <div className="mt-6">
                <GoogleSignInButton
                  onSuccess={handleGoogleSignUpSuccess}
                  onError={handleGoogleSignUpError}
                  isSignup={true}
                  disabled={!agreeToTerms}
                  className={!agreeToTerms ? 'opacity-50 cursor-not-allowed' : ''}
                />
                {!agreeToTerms && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Please agree to the Terms & Conditions to use Google Sign Up
                  </p>
                )}
              </div>
            </div>
          ) : (
            // Step 2: OTP Verification
            <div>
              <div className="text-center mb-6">
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-blue-800">
                    We've sent a 6-digit verification code to:
                  </p>
                  <p className="font-semibold text-blue-900">{formData.email}</p>
                </div>
                
                {otpInfo && (
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Code expires in 10 minutes</p>
                    <p>Attempts remaining: {otpInfo.attemptsLeft || 3}</p>
                    <p>Resends remaining: {otpInfo.resendsLeft || 3}</p>
                  </div>
                )}
              </div>

              <form onSubmit={handleVerifyOTP}>
                <div className="mb-6">
                  <label className="block text-gray-700 mb-2 text-center">Enter Verification Code</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border rounded text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    required
                    disabled={loading}
                  />
                </div>
                
                <button 
                  type="submit"
                  className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </button>
              </form>

              <div className="space-y-3">
                <button
                  onClick={handleResendOTP}
                  className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || resendCooldown > 0}
                >
                  {resendCooldown > 0 
                    ? `Resend Code (${resendCooldown}s)` 
                    : loading 
                      ? 'Resending...' 
                      : 'Resend Code'
                  }
                </button>
                
                <button
                  onClick={handleBackToForm}
                  className="w-full text-blue-600 py-2 hover:underline"
                  disabled={loading}
                >
                  ← Back to Form
                </button>
              </div>
            </div>
          )}
          
          <p className="text-center mt-6 text-gray-600">
            Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Login</Link>
          </p>
          
          {step === 1 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              <p className="font-semibold mb-1">📧 Email Verification Required</p>
              <p>All new accounts must verify their email address before login. You'll receive a 6-digit code via email.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
