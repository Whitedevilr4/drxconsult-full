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
              
              {user && (
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
          <div className="flex justify-between items-center py-4">
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
        <div className="flex justify-around items-center py-3 px-4">
          <NavIcon
            href="/"
            icon={<HomeIcon className="w-full h-full" />}
            label="Home"
            isActive={router.pathname === '/'}
          />
          
          {user && (
            <NavIcon
              href="/health-trackers"
              icon={<HealthIcon className="w-full h-full" />}
              label="Health"
              isActive={router.pathname.includes('health-trackers')}
            />
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

      {/* Mobile Bottom Padding */}
      <div className="md:hidden h-24"></div>
    </>
  )
}
