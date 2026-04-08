import { useState, useEffect } from 'react'
import Link from 'next/link'

const CACHE_KEY = 'drx_location_cache'
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (Date.now() - cached.ts > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY)
      return null
    }
    return cached
  } catch {
    return null
  }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, ts: Date.now() }))
  } catch {}
}

// States: 'prompt' | 'loading' | 'success' | 'hidden'
export default function LocationDisplay() {
  const [status, setStatus] = useState('prompt')
  const [cityName, setCityName] = useState('')
  const [hospitalCount, setHospitalCount] = useState(null)
  const [hospitalRadius, setHospitalRadius] = useState(5)

  // On mount: restore from cache so page navigation doesn't re-ask
  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('hidden')
      return
    }
    const cached = readCache()
    if (cached) {
      setCityName(cached.cityName)
      setHospitalCount(cached.hospitalCount)
      setHospitalRadius(cached.hospitalRadius || 5)
      setStatus('success')
    }
  }, [])

  const fetchNearbyHospitals = async (lat, lng) => {
    try {
      let res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/hospitals/nearby?latitude=${lat}&longitude=${lng}&radius=5`
      )
      if (res.ok) {
        const data = await res.json()
        const hospitals = data.hospitals || []
        if (hospitals.length > 0) {
          return { count: hospitals.length, radius: 5 }
        }
      }
      res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/hospitals/nearby?latitude=${lat}&longitude=${lng}&radius=10`
      )
      if (res.ok) {
        const data = await res.json()
        return { count: (data.hospitals || []).length, radius: 10 }
      }
    } catch {}
    return { count: 0, radius: 10 }
  }

  // Direct user gesture — browser popup fires from this click
  const handleEnableClick = () => {
    setStatus('loading')
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        let city = `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
          )
          const data = await res.json()
          city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            data.address?.state ||
            city
        } catch {}

        const { count, radius } = await fetchNearbyHospitals(latitude, longitude)

        // Save to cache so page navigations don't re-ask
        writeCache({ cityName: city, hospitalCount: count, hospitalRadius: radius })

        setCityName(city)
        setHospitalCount(count)
        setHospitalRadius(radius)
        setStatus('success')
      },
      (error) => {
        console.log('Geolocation error — code:', error.code, '| message:', error.message)
        setStatus('hidden')
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    )
  }

  if (status === 'hidden') return null

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center gap-2 py-1 text-xs text-gray-500">
        <svg className="w-3 h-3 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <span>Detecting location...</span>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex items-center justify-center gap-3 flex-wrap py-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
          <svg className="w-3 h-3 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="font-medium">{cityName}</span>
        </div>

        {hospitalCount !== null && (
          <Link
            href="/locate-hospital"
            className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-100 px-3 py-1 rounded-full hover:bg-green-100 transition-colors"
          >
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>
              {hospitalCount > 0
                ? `${hospitalCount} hospital${hospitalCount > 1 ? 's' : ''} within ${hospitalRadius}km`
                : 'No hospitals within 10km'}
            </span>
          </Link>
        )}
      </div>
    )
  }

  // prompt
  return (
    <div className="flex items-center justify-center py-1">
      <button
        onClick={handleEnableClick}
        className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-full transition-colors font-medium"
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Enable location for nearby hospitals
      </button>
    </div>
  )
}
