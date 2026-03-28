import { useState, useEffect } from 'react'
import Link from 'next/link'
import axios from 'axios'
import SubscriptionChatWindow from '@/components/SubscriptionChatWindow'
import WeeklyDietChart from '@/components/WeeklyDietChart'
import SubscriptionProgressBoard from '@/components/SubscriptionProgressBoard'

const PLAN_COLORS = {
  womensCare: { bg: 'bg-pink-50',   border: 'border-pink-200',   badge: 'bg-pink-100 text-pink-800',     icon: '🌸', accent: 'text-pink-700' },
  chronic:    { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-800',     icon: '🔵', accent: 'text-blue-700' },
  fatToFit:   { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-800', icon: '🟣', accent: 'text-purple-700' },
  essential:  { bg: 'bg-green-50',  border: 'border-green-200',  badge: 'bg-green-100 text-green-800',   icon: '🟢', accent: 'text-green-700' },
  family:     { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-800', icon: '🏠', accent: 'text-orange-700' },
}

const BILLING_LABELS = {
  threeMonths:  '3-Month Plan',
  sixMonths:    '6-Month Plan',
  twelveMonths: '12-Month Plan',
  monthly:      'Monthly Plan',
  yearly:       'Yearly Plan',
}

const FEATURE_LABELS = {
  prescriptionExplanation:      { label: 'Prescription Explanation',       icon: '📋' },
  medicineGuidance:             { label: 'Medicine Guidance',              icon: '💊' },
  whatsappSupport:              { label: 'WhatsApp Support',               icon: '💬' },
  verifiedContent:              { label: 'Verified Health Content',        icon: '✅' },
  chronicCareGuidance:          { label: 'Chronic Care Guidance',          icon: '🩺' },
  labReportExplanation:         { label: 'Lab Report Explanation',         icon: '🔬' },
  medicationReminders:          { label: 'Medication Reminders',           icon: '⏰' },
  priorityBooking:              { label: 'Priority Booking',               icon: '⭐' },
  dietChart:                    { label: 'Personalised Diet Chart',        icon: '🥗' },
  gynaecologistConsultation:    { label: 'Gynaecologist Consultation',     icon: '👩‍⚕️' },
  dieticianConsultation:        { label: 'Dietician Consultation',         icon: '🥦' },
  comprehensiveMedicalHistory:  { label: 'Comprehensive Medical History',  icon: '📁' },
  hairAndSkinCare:              { label: 'Hair & Skin Care',               icon: '✨' },
  liveYogaSession:              { label: 'Live Yoga Sessions',             icon: '🧘' },
  periodAndPcosCare:            { label: 'Period & PCOS Care',             icon: '🌺' },
  weightManagement:             { label: 'Weight Management',              icon: '⚖️' },
  whatsappSupportOneToOne:      { label: '1-to-1 WhatsApp Support',        icon: '📱' },
  priorityCare:                 { label: 'Priority Care',                  icon: '🏆' },
  doctorConsultationMonthly:    { label: 'Monthly Doctor Consultation',    icon: '👨‍⚕️' },
  dedicatedDietCoach:           { label: 'Dedicated Diet Coach',           icon: '🎯' },
  personalizedDietChart:        { label: 'Personalised Diet Chart',        icon: '📊' },
  bpManagement:                 { label: 'BP Management',                  icon: '❤️' },
  diabetesManagement:           { label: 'Diabetes Management',            icon: '🩸' },
  thyroidCare:                  { label: 'Thyroid Care',                   icon: '🦋' },
  weightSession:                { label: 'Weight Sessions',                icon: '🏋️' },
  dietCoachOneToOne:            { label: '1-to-1 Diet Coach',              icon: '🥗' },
  coachFollowUpWeekly:          { label: 'Weekly Coach Follow-up',         icon: '📅' },
  cravingCare:                  { label: 'Craving Care',                   icon: '🍎' },
  motivatedWeekPlanning:        { label: 'Motivated Week Planning',        icon: '📝' },
  cheatMeal:                    { label: 'Cheat Meal Guidance',            icon: '🍕' },
}

function ConsultantGroup({ title, icon, professionals, providerType, existingBookings, currentUserId, onBooked }) {
  const [booking, setBooking] = useState({})
  const [openChat, setOpenChat] = useState(null) // { bookingId, name }

  // On mount, mark already-booked professionals
  useEffect(() => {
    if (!existingBookings?.length) return
    const fieldMap = { pharmacist: 'pharmacistId', doctor: 'doctorId', nutritionist: 'nutritionistId' }
    const field = fieldMap[providerType]
    const initial = {}
    existingBookings.forEach(b => {
      const profId = b[field]?._id || b[field]
      if (profId) initial[profId] = { state: 'done', bookingId: b._id }
    })
    setBooking(initial)
  }, [existingBookings, providerType])

  const handleBook = async (professionalId) => {
    setBooking(prev => ({ ...prev, [professionalId]: { state: 'loading' } }))
    try {
      const token = localStorage.getItem('token')
      const fieldMap = { pharmacist: 'pharmacistId', doctor: 'doctorId', nutritionist: 'nutritionistId' }
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/subscription`,
        { [fieldMap[providerType]]: professionalId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setBooking(prev => ({ ...prev, [professionalId]: { state: 'done', bookingId: res.data.booking._id } }))
      if (onBooked) onBooked()
    } catch (err) {
      const msg = err.response?.data?.message || 'Booking failed'
      setBooking(prev => ({ ...prev, [professionalId]: { state: 'error', msg } }))
    }
  }

  return (
    <div className="mb-5 last:mb-0">
      <h4 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
        <span>{icon}</span>{title}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {professionals.map((p) => {
          const info = booking[p._id] || {}
          const isDone = info.state === 'done'
          const isLoading = info.state === 'loading'
          const isError = info.state === 'error'
          return (
            <div key={p._id} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
              <img
                src={p.photo || p.userId?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.userId?.name || 'Pro')}&size=56&background=3b82f6&color=fff`}
                alt={p.userId?.name}
                className="w-14 h-14 rounded-full object-cover flex-shrink-0 border-2 border-white shadow"
                onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.userId?.name || 'Pro')}&size=56` }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{p.userId?.name}</p>
                {p.specialization && <p className="text-xs text-blue-600 truncate">{p.specialization}</p>}
                {p.designation && <p className="text-xs text-blue-600 truncate">{p.designation}</p>}
                {p.experience && <p className="text-xs text-gray-500">{p.experience} yrs exp</p>}
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                  p.status === 'online' ? 'bg-green-100 text-green-700' :
                  p.status === 'busy' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {p.status || 'offline'}
                </span>
                {isError && <p className="text-xs text-red-500 mt-1">{info.msg}</p>}
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button
                  onClick={() => !isDone && !isLoading && handleBook(p._id)}
                  disabled={isDone || isLoading}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    isDone ? 'bg-green-100 text-green-700 cursor-default' :
                    isLoading ? 'bg-gray-100 text-gray-400 cursor-wait' :
                    'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isDone ? '✓ Booked' : isLoading ? '...' : 'Book'}
                </button>
                {isDone && info.bookingId && (
                  <button
                    onClick={() => setOpenChat({ bookingId: info.bookingId, name: p.userId?.name })}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                  >
                    💬 Chat
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Chat window */}
      {openChat && (
        <SubscriptionChatWindow
          bookingId={openChat.bookingId}
          currentUserId={currentUserId}
          otherName={openChat.name}
          onClose={() => setOpenChat(null)}
        />
      )}
    </div>
  )
}

export default function MySubscriptionTab() {
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [coreTeam, setCoreTeam] = useState({ pharmacists: [], doctors: [], nutritionists: [] })
  const [coreTeamLoading, setCoreTeamLoading] = useState(false)
  const [existingBookings, setExistingBookings] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}')
    if (userData._id) setCurrentUserId(userData._id)
    else if (userData.id) setCurrentUserId(userData.id)

    const fetchSubscription = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) { setLoading(false); return }
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/subscriptions/current`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setSubscription(res.data.subscription)
        if (res.data.subscription) {
          fetchCoreTeam(token)
          fetchExistingBookings(token)
        }
      } catch (err) {
        console.error('Error fetching subscription:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSubscription()
  }, [])

  const fetchExistingBookings = async (token) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/bookings/subscription-status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setExistingBookings(res.data.bookings || [])
    } catch (err) {
      console.error('Error fetching subscription status:', err)
    }
  }

  const fetchCoreTeam = async (token) => {
    setCoreTeamLoading(true)
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/core-team`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCoreTeam(res.data)
    } catch (err) {
      console.error('Error fetching core team:', err)
    } finally {
      setCoreTeamLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-3 text-gray-500">Loading subscription...</p>
      </div>
    )
  }

  // LOCKED STATE — no active subscription
  if (!subscription) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-10">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">My Subscription</h2>
          <p className="text-gray-500 mb-6">
            You don't have an active subscription plan. Subscribe to unlock personalised healthcare, consultant access, diet charts, and progress tracking.
          </p>
          <Link
            href="/subscription-plans"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors"
          >
            View Subscription Plans
          </Link>
        </div>
      </div>
    )
  }

  const colors = PLAN_COLORS[subscription.planType] || PLAN_COLORS.essential
  const billingLabel = BILLING_LABELS[subscription.billingCycle] || subscription.billingCycle
  const endDate = new Date(subscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const startDate = new Date(subscription.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const daysLeft = Math.max(0, Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
  const totalDays = Math.ceil((new Date(subscription.endDate) - new Date(subscription.startDate)) / (1000 * 60 * 60 * 24))
  const progressPct = Math.min(100, Math.round(((totalDays - daysLeft) / totalDays) * 100))

  const activeFeatures = Object.entries(subscription.features || {})
    .filter(([, val]) => val === true)

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">

      {/* ── 1. Subscription Details & Benefits ── */}
      <div className={`${colors.bg} border ${colors.border} rounded-2xl p-6`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{colors.icon}</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{subscription.planName}</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>{billingLabel}</span>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700">
            ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5 text-sm">
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <p className="text-gray-400 text-xs mb-1">Started</p>
            <p className="font-semibold text-gray-800">{startDate}</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <p className="text-gray-400 text-xs mb-1">Expires</p>
            <p className="font-semibold text-gray-800">{endDate}</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center shadow-sm col-span-2 sm:col-span-1">
            <p className="text-gray-400 text-xs mb-1">Days Left</p>
            <p className={`font-bold text-lg ${daysLeft <= 15 ? 'text-red-600' : colors.accent}`}>{daysLeft}</p>
          </div>
        </div>

        {/* Plan progress bar */}
        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Plan usage</span>
            <span>{progressPct}% used</span>
          </div>
          <div className="w-full bg-white rounded-full h-2.5 shadow-inner">
            <div
              className="bg-blue-500 h-2.5 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Benefits */}
        <div>
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Your Plan Benefits</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeFeatures.map(([key]) => {
              const feat = FEATURE_LABELS[key]
              if (!feat) return null
              return (
                <div key={key} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm text-sm">
                  <span>{feat.icon}</span>
                  <span className="text-gray-700">{feat.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-4 text-right">
          <Link href="/subscription-plans" className="text-xs text-blue-600 hover:underline">
            Manage Plan →
          </Link>
        </div>
      </div>

      {/* ── 2. Choose Your Consultant ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Choose Your Consultant</h3>
        <p className="text-sm text-gray-500 mb-4">Book a session with your plan's included consultants</p>

        {coreTeamLoading ? (
          <div className="text-center py-6">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* No core team members assigned yet */}
            {coreTeam.pharmacists.length === 0 && coreTeam.doctors.length === 0 && coreTeam.nutritionists.length === 0 && (
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400 text-sm">
                No consultants assigned yet. Please check back soon.
              </div>
            )}

            {/* Pharmacists */}
            {coreTeam.pharmacists.length > 0 && (
              <ConsultantGroup title="Pharmacists" icon="💊" professionals={coreTeam.pharmacists} providerType="pharmacist" existingBookings={existingBookings} currentUserId={currentUserId} onBooked={() => fetchExistingBookings(localStorage.getItem('token'))} />
            )}

            {/* Doctors */}
            {coreTeam.doctors.length > 0 && (
              <ConsultantGroup title="Doctors" icon="👨‍⚕️" professionals={coreTeam.doctors} providerType="doctor" existingBookings={existingBookings} currentUserId={currentUserId} onBooked={() => fetchExistingBookings(localStorage.getItem('token'))} />
            )}

            {/* Nutritionists */}
            {coreTeam.nutritionists.length > 0 && (
              <ConsultantGroup title="Nutritionists / Diet Coaches" icon="🥗" professionals={coreTeam.nutritionists} providerType="nutritionist" existingBookings={existingBookings} currentUserId={currentUserId} onBooked={() => fetchExistingBookings(localStorage.getItem('token'))} />
            )}
          </>
        )}
      </div>

      {/* ── 3. Weekly Diet Chart ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Your Weekly Diet Chart</h3>
        <p className="text-sm text-gray-500 mb-4">Log your meals, track water intake and mark each day as taken</p>
        <WeeklyDietChart />
      </div>

      {/* ── 4. Progress Board ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Your Progress</h3>
        <p className="text-sm text-gray-500 mb-4">Track weight, steps, sleep, calories, exercise and mood daily</p>
        <SubscriptionProgressBoard />
      </div>

    </div>
  )
}
