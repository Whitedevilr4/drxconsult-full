import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import NotificationBell from './NotificationBell'

// Modern SVG Icons with gradients and better designs
const HomeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="homeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
      </linearGradient>
    </defs>
    <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" fill="url(#homeGradient)" stroke="currentColor" strokeWidth="0.5"/>
  </svg>
)

const HealthIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
      </linearGradient>
    </defs>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#healthGradient)" stroke="currentColor" strokeWidth="0.5"/>
  </svg>
)

const DashboardIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="dashGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
      </linearGradient>
    </defs>
    <rect x="3" y="3" width="8" height="8" rx="2" fill="url(#dashGradient)" stroke="currentColor" strokeWidth="0.5"/>
    <rect x="13" y="3" width="8" height="8" rx="2" fill="url(#dashGradient)" stroke="currentColor" strokeWidth="0.5"/>
    <rect x="3" y="13" width="8" height="8" rx="2" fill="url(#dashGradient)" stroke="currentColor" strokeWidth="0.5"/>
    <rect x="13" y="13" width="8" height="8" rx="2" fill="url(#dashGradient)" stroke="currentColor" strokeWidth="0.5"/>
  </svg>
)

const LoginIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="loginGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
      </linearGradient>
    </defs>
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="url(#loginGradient)" stroke="currentColor" strokeWidth="0.5"/>
  </svg>
)

const SignUpIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="signupGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="8" r="4" fill="url(#signupGradient)" stroke="currentColor" strokeWidth="0.5"/>
    <path d="M12 14c-4 0-8 2-8 4v2h16v-2c0-2-4-4-8-4z" fill="url(#signupGradient)" stroke="currentColor" strokeWidth="0.5"/>
    <circle cx="19" cy="8" r="2" fill="url(#signupGradient)" stroke="currentColor" strokeWidth="0.5"/>
    <path d="M17 10v2h4v-2h-4z" fill="url(#signupGradient)"/>
    <path d="M19 8v4" stroke="currentColor" strokeWidth="1"/>
    <path d="M17 10h4" stroke="currentColor" strokeWidth="1"/>
  </svg>
)

const HospitalIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="hospitalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
      </linearGradient>
    </defs>
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z" fill="url(#hospitalGradient)" stroke="currentColor" strokeWidth="0.5"/>
  </svg>
)

const LogoutIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="logoutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
      </linearGradient>
    </defs>
    <path d="M16 17v-3H9v-4h7V7l5 5-5 5M14 2a2 2 0 0 1 2 2v2h-2V4H4v16h10v-2h2v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10z" fill="url(#logoutGradient)" stroke="currentColor" strokeWidth="0.5"/>
  </svg>
)

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [showMobileProfessionalsMenu, setShowMobileProfessionalsMenu] = useState(false)

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
    if (user.role === 'nutritionist') return '/nutritionist/dashboard'
    if (user.role === 'hospital') return '/hospital/dashboard'
    return '/patient/dashboard'
  }

  const NavIcon = ({ href, icon, label, isActive, onClick }) => (
    <Link 
      href={href}
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 relative min-w-[60px] group ${
        isActive 
          ? 'text-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg shadow-blue-200/50' 
          : 'text-gray-400 hover:text-blue-600 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 hover:shadow-lg hover:shadow-blue-200/30'
      }`}
    >
      <div className={`w-6 h-6 mb-2 transition-all duration-300 ${
        isActive ? 'transform scale-110 drop-shadow-sm' : 'group-hover:scale-105 group-hover:drop-shadow-sm'
      }`}>
        {icon}
      </div>
      <span className={`text-xs font-medium transition-all duration-300 ${
        isActive ? 'text-blue-600 font-semibold' : 'text-gray-400 group-hover:text-blue-600'
      }`}>
        {label}
      </span>
      {/* Active indicator with glow */}
      {isActive && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-600 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></div>
      )}
      {/* Hover glow effect */}
      <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
        isActive ? 'bg-gradient-to-br from-blue-400/10 to-blue-600/10' : 'group-hover:bg-gradient-to-br group-hover:from-blue-400/5 group-hover:to-blue-600/5'
      }`}></div>
    </Link>
  )

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="bg-white/95 backdrop-blur-lg shadow-lg shadow-gray-200/50 sticky top-0 z-50 hidden md:block border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                💊 DRx Consult
              </div>
            </Link>

            {/* Desktop Navigation Icons */}
            <div className="flex items-center space-x-8">
              <Link 
                href="/" 
                className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 group relative ${
                  router.pathname === '/' 
                    ? 'text-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg shadow-blue-200/50' 
                    : 'text-gray-400 hover:text-blue-600 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 hover:shadow-lg hover:shadow-blue-200/30'
                }`}
              >
                <div className={`w-6 h-6 mb-2 transition-all duration-300 ${
                  router.pathname === '/' ? 'transform scale-110 drop-shadow-sm' : 'group-hover:scale-105 group-hover:drop-shadow-sm'
                }`}>
                  <HomeIcon className="w-full h-full" />
                </div>
                <span className={`text-xs font-medium transition-all duration-300 ${
                  router.pathname === '/' ? 'text-blue-600 font-semibold' : 'text-gray-400 group-hover:text-blue-600'
                }`}>Home</span>
                {/* Hover glow effect */}
                <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
                  router.pathname === '/' ? 'bg-gradient-to-br from-blue-400/10 to-blue-600/10' : 'group-hover:bg-gradient-to-br group-hover:from-blue-400/5 group-hover:to-blue-600/5'
                }`}></div>
              </Link>
              
              {/* Professionals Dropdown */}
              <div className="relative group">
                <button className="flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 text-gray-400 hover:text-blue-600 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 hover:shadow-lg hover:shadow-blue-200/30">
                  <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-xs font-medium">Professionals</span>
                </button>
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 border border-gray-100">
                  <div className="py-2">
                    <Link href="/pharmacists" className="flex items-center px-4 py-3 hover:bg-blue-50 transition-colors">
                      <span className="text-2xl mr-3">💊</span>
                      <div>
                        <div className="font-medium text-gray-800">Pharmacists</div>
                        <div className="text-xs text-gray-500">Medication counseling</div>
                      </div>
                    </Link>
                    <Link href="/doctors" className="flex items-center px-4 py-3 hover:bg-green-50 transition-colors">
                      <span className="text-2xl mr-3">🩺</span>
                      <div>
                        <div className="font-medium text-gray-800">Doctors</div>
                        <div className="text-xs text-gray-500">Medical consultations</div>
                      </div>
                    </Link>
                    <Link href="/nutritionists" className="flex items-center px-4 py-3 hover:bg-emerald-50 transition-colors">
                      <span className="text-2xl mr-3">🥗</span>
                      <div>
                        <div className="font-medium text-gray-800">Nutritionists</div>
                        <div className="text-xs text-gray-500">Diet & wellness plans</div>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
              
              {user && (
                <>
                  <Link 
                    href="/health-trackers" 
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 group relative ${
                      router.pathname.includes('health-trackers') 
                        ? 'text-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg shadow-blue-200/50' 
                        : 'text-gray-400 hover:text-blue-600 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 hover:shadow-lg hover:shadow-blue-200/30'
                    }`}
                  >
                    <div className={`w-6 h-6 mb-2 transition-all duration-300 ${
                      router.pathname.includes('health-trackers') ? 'transform scale-110 drop-shadow-sm' : 'group-hover:scale-105 group-hover:drop-shadow-sm'
                    }`}>
                      <HealthIcon className="w-full h-full" />
                    </div>
                    <span className={`text-xs font-medium transition-all duration-300 ${
                      router.pathname.includes('health-trackers') ? 'text-blue-600 font-semibold' : 'text-gray-400 group-hover:text-blue-600'
                    }`}>Health</span>
                    {/* Hover glow effect */}
                    <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
                      router.pathname.includes('health-trackers') ? 'bg-gradient-to-br from-blue-400/10 to-blue-600/10' : 'group-hover:bg-gradient-to-br group-hover:from-blue-400/5 group-hover:to-blue-600/5'
                    }`}></div>
                  </Link>
                  
                  <Link 
                    href="/locate-hospital" 
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 group relative ${
                      router.pathname.includes('locate-hospital') 
                        ? 'text-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg shadow-blue-200/50' 
                        : 'text-gray-400 hover:text-blue-600 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 hover:shadow-lg hover:shadow-blue-200/30'
                    }`}
                  >
                    <div className={`w-6 h-6 mb-2 transition-all duration-300 ${
                      router.pathname.includes('locate-hospital') ? 'transform scale-110 drop-shadow-sm' : 'group-hover:scale-105 group-hover:drop-shadow-sm'
                    }`}>
                      <HospitalIcon className="w-full h-full" />
                    </div>
                    <span className={`text-xs font-medium transition-all duration-300 ${
                      router.pathname.includes('locate-hospital') ? 'text-blue-600 font-semibold' : 'text-gray-400 group-hover:text-blue-600'
                    }`}>Hospital</span>
                    {/* Hover glow effect */}
                    <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
                      router.pathname.includes('locate-hospital') ? 'bg-gradient-to-br from-blue-400/10 to-blue-600/10' : 'group-hover:bg-gradient-to-br group-hover:from-blue-400/5 group-hover:to-blue-600/5'
                    }`}></div>
                  </Link>
                </>
              )}
              
              {user ? (
                <>
                  <Link 
                    href={getDashboardLink()} 
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 group relative ${
                      router.pathname.includes('dashboard') 
                        ? 'text-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg shadow-blue-200/50' 
                        : 'text-gray-400 hover:text-blue-600 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 hover:shadow-lg hover:shadow-blue-200/30'
                    }`}
                  >
                    <div className={`w-6 h-6 mb-2 transition-all duration-300 ${
                      router.pathname.includes('dashboard') ? 'transform scale-110 drop-shadow-sm' : 'group-hover:scale-105 group-hover:drop-shadow-sm'
                    }`}>
                      <DashboardIcon className="w-full h-full" />
                    </div>
                    <span className={`text-xs font-medium transition-all duration-300 ${
                      router.pathname.includes('dashboard') ? 'text-blue-600 font-semibold' : 'text-gray-400 group-hover:text-blue-600'
                    }`}>Dashboard</span>
                    {/* Hover glow effect */}
                    <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
                      router.pathname.includes('dashboard') ? 'bg-gradient-to-br from-blue-400/10 to-blue-600/10' : 'group-hover:bg-gradient-to-br group-hover:from-blue-400/5 group-hover:to-blue-600/5'
                    }`}></div>
                  </Link>
                  
                  <div className="flex items-center space-x-4 ml-6">
                    <NotificationBell />
                    <div className="flex items-center space-x-2 p-2 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 shadow-sm">
                      <span className="text-xl">👤</span>
                      <span className="text-sm font-medium text-gray-700">{user.name}</span>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl text-gray-400 hover:text-blue-600 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 hover:shadow-lg hover:shadow-blue-200/30 transition-all duration-300 group relative"
                    >
                      <div className="w-5 h-5 mb-1 group-hover:scale-105 transition-all duration-300 drop-shadow-sm">
                        <LogoutIcon className="w-full h-full" />
                      </div>
                      <span className="text-xs font-medium group-hover:text-blue-600 transition-all duration-300">Logout</span>
                      {/* Hover glow effect */}
                      <div className="absolute inset-0 rounded-2xl transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-blue-400/5 group-hover:to-blue-600/5"></div>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    className="flex flex-col items-center justify-center p-3 rounded-2xl text-gray-400 hover:text-blue-600 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 hover:shadow-lg hover:shadow-blue-200/30 transition-all duration-300 group relative"
                  >
                    <div className="w-6 h-6 mb-2 group-hover:scale-105 group-hover:drop-shadow-sm transition-all duration-300">
                      <LoginIcon className="w-full h-full" />
                    </div>
                    <span className="text-xs font-medium group-hover:text-blue-600 transition-all duration-300">Login</span>
                    {/* Hover glow effect */}
                    <div className="absolute inset-0 rounded-2xl transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-blue-400/5 group-hover:to-blue-600/5"></div>
                  </Link>
                  <Link 
                    href="/signup" 
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 transition-all duration-300 group shadow-lg shadow-blue-200/50 hover:shadow-blue-300/50"
                  >
                    <div className="w-6 h-6 mb-2 group-hover:scale-105 transition-all duration-300 drop-shadow-sm">
                      <SignUpIcon className="w-full h-full" />
                    </div>
                    <span className="text-xs font-medium">Sign Up</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <nav className="bg-white/95 backdrop-blur-lg shadow-lg shadow-gray-200/50 sticky top-0 z-50 md:hidden border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                💊 DRx Consult
              </div>
            </Link>

            {/* User Info and Notifications */}
            <div className="flex items-center space-x-3">
              {user && <NotificationBell />}
              {user && (
                <div className="flex items-center space-x-2">
                  <span className="text-lg">👤</span>
                  <span className="text-sm font-medium text-gray-700 max-w-20 truncate">{user.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 z-50 shadow-2xl shadow-gray-200/50">
        <div className="flex justify-around items-center py-3 px-2">
          <NavIcon
            href="/"
            icon={<HomeIcon className="w-full h-full" />}
            label="Home"
            isActive={router.pathname === '/'}
          />
          
          {/* Professionals Menu Button */}
          <button
            onClick={() => setShowMobileProfessionalsMenu(!showMobileProfessionalsMenu)}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 relative min-w-[60px] group ${
              router.pathname.includes('/pharmacists') || router.pathname.includes('/doctors') || router.pathname.includes('/nutritionists')
                ? 'text-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg shadow-blue-200/50' 
                : 'text-gray-400 hover:text-blue-600 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100'
            }`}
          >
            <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-xs font-medium">Pros</span>
          </button>
          
          {user && (
            <>
              <NavIcon
                href="/health-trackers"
                icon={<HealthIcon className="w-full h-full" />}
                label="Health"
                isActive={router.pathname.includes('health-trackers')}
              />
              <NavIcon
                href="/locate-hospital"
                icon={<HospitalIcon className="w-full h-full" />}
                label="Hospital"
                isActive={router.pathname.includes('locate-hospital')}
              />
            </>
          )}
          
          {user ? (
            <>
              <NavIcon
                href={getDashboardLink()}
                icon={<DashboardIcon className="w-full h-full" />}
                label="Dashboard"
                isActive={router.pathname.includes('dashboard')}
              />
              <NavIcon
                href="#"
                icon={<LogoutIcon className="w-full h-full" />}
                label="Logout"
                isActive={false}
                onClick={(e) => {
                  e.preventDefault()
                  handleLogout()
                }}
              />
            </>
          ) : (
            <>
              <NavIcon
                href="/login"
                icon={<LoginIcon className="w-full h-full" />}
                label="Login"
                isActive={router.pathname === '/login'}
              />
              <NavIcon
                href="/signup"
                icon={<SignUpIcon className="w-full h-full" />}
                label="Sign Up"
                isActive={router.pathname === '/signup'}
              />
            </>
          )}
        </div>
      </div>

      {/* Mobile Professionals Menu Modal */}
      {showMobileProfessionalsMenu && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end" onClick={() => setShowMobileProfessionalsMenu(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Healthcare Professionals</h3>
              <button
                onClick={() => setShowMobileProfessionalsMenu(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <Link
                href="/pharmacists"
                onClick={() => setShowMobileProfessionalsMenu(false)}
                className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-2xl mr-4">
                  💊
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">Pharmacists</div>
                  <div className="text-sm text-gray-600">Medication counseling & guidance</div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              
              <Link
                href="/doctors"
                onClick={() => setShowMobileProfessionalsMenu(false)}
                className="flex items-center p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-2xl mr-4">
                  🩺
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">Doctors</div>
                  <div className="text-sm text-gray-600">Medical consultations & treatment</div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              
              <Link
                href="/nutritionists"
                onClick={() => setShowMobileProfessionalsMenu(false)}
                className="flex items-center p-4 bg-gradient-to-r from-emerald-50 to-lime-50 rounded-xl hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-2xl mr-4">
                  🥗
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">Nutritionists</div>
                  <div className="text-sm text-gray-600">Diet plans & wellness coaching</div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Padding */}
      <div className="md:hidden h-24"></div>
    </>
  )
}
