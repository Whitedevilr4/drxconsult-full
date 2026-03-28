import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const LocationIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const HospitalIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

// States: 'idle' | 'loading' | 'success' | 'denied' | 'unavailable' | 'unsupported'
export default function LocationDisplay() {
  const [status, setStatus] = useState('idle')
  const [location, setLocation] = useState(null)
  const [nearbyHospitals, setNearbyHospitals] = useState([])
  const [userCoords, setUserCoords] = useState(null)

  const fetchNearbyHospitals = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/hospitals/nearby?latitude=${latitude}&longitude=${longitude}&radius=5`
      )
      if (response.ok) {
        const data = await response.json()
        setNearbyHospitals(data.hospitals || [])
      }
    } catch (err) {
      console.error('Error fetching nearby hospitals:', err)
    }
  }

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unsupported')
      return
    }

    setStatus('loading')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setUserCoords({ latitude, longitude })

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
          )
          const data = await response.json()
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county
          const state = data.address?.state
          const country = data.address?.country

          let locationText = ''
          if (city && state) locationText = `${city}, ${state}`
          else if (city && country) locationText = `${city}, ${country}`
          else if (state && country) locationText = `${state}, ${country}`
          else locationText = country || 'Your Location'

          setLocation(locationText)
          setStatus('success')
          await fetchNearbyHospitals(latitude, longitude)
        } catch (err) {
          console.error('Reverse geocode error:', err)
          setLocation(`${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`)
          setStatus('success')
          await fetchNearbyHospitals(latitude, longitude)
        }
      },
      (err) => {
        console.error('Geolocation error code:', err.code, err.message)
        if (err.code === 1) {
          setStatus('denied')
        } else {
          setStatus('unavailable')
        }
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    )
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('unsupported')
      return
    }
    // Only auto-fetch if permission was already granted before
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          requestLocation()
        }
        // For 'prompt' or 'denied' — show the button, let user decide
      }).catch(() => {
        // permissions API failed — show button
      })
    }
    // No permissions API — show button
  }, [requestLocation])

  const toRad = (d) => d * (Math.PI / 180)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  // --- RENDER ---

  if (status === 'unsupported') {
    return (
      <div className="flex items-center space-x-2 text-gray-400 text-sm">
        <LocationIcon />
        <span>Location not supported by your browser</span>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center space-x-2 text-gray-500 text-sm">
        <LocationIcon />
        <span className="animate-pulse">Detecting location...</span>
      </div>
    )
  }

  if (status === 'denied' || status === 'unavailable') {
    return null
  }

  if (status === 'idle') {
    return (
      <button
        onClick={requestLocation}
        className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors border border-blue-200"
      >
        <LocationIcon />
        <span>Share location for nearby hospitals</span>
      </button>
    )
  }

  // status === 'success'
  return (
    <div className="w-full">
      <div className="flex items-center justify-center space-x-3 flex-wrap">
        <div className="flex items-center space-x-2 text-gray-700 text-sm bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5 rounded-full shadow-sm">
          <LocationIcon />
          <span className="font-medium">{location}</span>
        </div>
        {nearbyHospitals.length > 0 && (
          <div className="flex items-center space-x-2 text-sm bg-gradient-to-r from-green-50 to-emerald-50 px-3 py-1.5 rounded-full shadow-sm text-green-700 font-medium">
            <HospitalIcon />
            <span>{nearbyHospitals.length} Hospital{nearbyHospitals.length > 1 ? 's' : ''} Within 5km</span>
          </div>
        )}
      </div>

      {nearbyHospitals.length > 0 && (
        <div className="mt-3 bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center space-x-2">
              <HospitalIcon />
              <span>Nearby Hospitals</span>
            </h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {nearbyHospitals.slice(0, 5).map((hospital) => {
              const distance = userCoords && hospital.latitude && hospital.longitude
                ? calculateDistance(userCoords.latitude, userCoords.longitude, hospital.latitude, hospital.longitude)
                : hospital.distance
              return (
                <div key={hospital._id} className="p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-gray-800 text-sm">{hospital.hospitalName}</h4>
                    {distance && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium whitespace-nowrap ml-2">
                        {distance.toFixed(1)} km
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{hospital.address}, {hospital.city}</p>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3 flex-wrap">
                      <span className="text-gray-600">🛏️ {hospital.availableBeds}/{hospital.totalBeds} beds</span>
                      {hospital.availableIcuBeds > 0 && (
                        <span className="text-red-600">🏥 {hospital.availableIcuBeds} ICU</span>
                      )}
                    </div>
                    <a href={`tel:${hospital.contactNumber}`} className="text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap">
                      📞 Call
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
          {nearbyHospitals.length > 5 && (
            <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
              <Link href="/locate-hospital" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All {nearbyHospitals.length} Hospitals →
              </Link>
            </div>
          )}
        </div>
      )}

      {nearbyHospitals.length === 0 && (
        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <p className="text-sm text-yellow-800">
            No hospitals found within 5km.{' '}
            <Link href="/locate-hospital" className="text-blue-600 hover:text-blue-700 font-medium">
              Search wider area →
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}
