import { useState, useEffect } from 'react'
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

export default function LocationDisplay() {
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [permissionState, setPermissionState] = useState('prompt') // 'prompt' | 'granted' | 'denied'
  const [nearbyHospitals, setNearbyHospitals] = useState([])
  const [userCoords, setUserCoords] = useState(null)
  const [showHospitals, setShowHospitals] = useState(false)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Location not supported by your browser')
      return
    }

    // Check existing permission state before prompting
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionState(result.state)
        if (result.state === 'granted') {
          fetchLocation()
        } else if (result.state === 'denied') {
          setError('denied')
        }
        // 'prompt' → show the button, wait for user click
        result.onchange = () => {
          setPermissionState(result.state)
          if (result.state === 'granted') {
            setError(null)
            fetchLocation()
          } else if (result.state === 'denied') {
            setError('denied')
          }
        }
      }).catch(() => {
        setPermissionState('prompt')
      })
    }
  }, [])

  const fetchLocation = () => {
    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setUserCoords({ latitude, longitude })
        setPermissionState('granted')

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
          )
          const data = await response.json()

          const city = data.address.city || data.address.town || data.address.village || data.address.county
          const state = data.address.state
          const country = data.address.country

          let locationText = ''
          if (city && state) {
            locationText = `${city}, ${state}`
          } else if (city && country) {
            locationText = `${city}, ${country}`
          } else if (state && country) {
            locationText = `${state}, ${country}`
          } else {
            locationText = country || 'Unknown Location'
          }

          setLocation(locationText)
          await fetchNearbyHospitals(latitude, longitude)
          setLoading(false)
        } catch (err) {
          console.error('Error fetching location name:', err)
          setLocation(`${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`)
          setLoading(false)
        }
      },
      (err) => {
        console.error('Geolocation error:', err)
        setPermissionState('denied')
        setError(err.code === 1 ? 'denied' : 'unavailable')
        setLoading(false)
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000
      }
    )
  }

  const fetchNearbyHospitals = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/hospitals/nearby?latitude=${latitude}&longitude=${longitude}&radius=5`
      )
      
      if (response.ok) {
        const data = await response.json()
        setNearbyHospitals(data.hospitals || [])
      }
    } catch (err) {
      console.error('Error fetching nearby hospitals:', err)
    }
  }

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Earth's radius in km
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const toRad = (degrees) => {
    return degrees * (Math.PI / 180)
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-gray-500 text-sm">
        <LocationIcon />
        <span className="animate-pulse">Detecting location...</span>
      </div>
    )
  }

  if (error === 'denied') {
    return (
      <div className="flex flex-col items-center space-y-3 text-sm py-2">
        <div className="flex items-center space-x-2 text-gray-500">
          <LocationIcon />
          <span>Location access blocked</span>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-center max-w-sm">
          <p className="text-xs text-amber-800 font-medium mb-2">To enable location:</p>
          <p className="text-xs text-amber-700">
            Click the 🔒 lock icon in the address bar → <strong>Site settings</strong> → <strong>Location</strong> → set to <strong>Allow</strong>
          </p>
        </div>
        <button
          onClick={() => {
            setError(null)
            setPermissionState('prompt')
            // Re-query permission state before trying
            if (navigator.permissions) {
              navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                setPermissionState(result.state)
                if (result.state === 'denied') {
                  setError('denied')
                } else {
                  fetchLocation()
                }
              }).catch(() => {
                fetchLocation()
              })
            } else {
              fetchLocation()
            }
          }}
          className="text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors border border-blue-200"
        >
          🔄 I've enabled it — try again
        </button>
      </div>
    )
  }

  if (error === 'unavailable') {
    return (
      <div className="flex items-center space-x-2 text-gray-400 text-sm">
        <LocationIcon />
        <span>Location unavailable</span>
      </div>
    )
  }

  // Show button to request location if not yet granted
  if (!location && permissionState !== 'granted') {
    return (
      <button
        onClick={fetchLocation}
        className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
      >
        <LocationIcon />
        <span>Share location for nearby hospitals</span>
      </button>
    )
  }

  return (
    <div className="w-full">
      {/* Location and Hospital Count Bar */}
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

      {/* Hospitals List - Always Visible */}
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
                <div
                  key={hospital._id}
                  className="p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
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
                      <span className="text-gray-600">
                        🛏️ {hospital.availableBeds}/{hospital.totalBeds} beds
                      </span>
                      {hospital.availableIcuBeds > 0 && (
                        <span className="text-red-600">
                          🏥 {hospital.availableIcuBeds} ICU
                        </span>
                      )}
                    </div>
                    <a
                      href={`tel:${hospital.contactNumber}`}
                      className="text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                    >
                      📞 Call
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
          {nearbyHospitals.length > 5 && (
            <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
              <Link
                href="/locate-hospital"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All {nearbyHospitals.length} Hospitals →
              </Link>
            </div>
          )}
        </div>
      )}

      {nearbyHospitals.length === 0 && !loading && !error && (
        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <p className="text-sm text-yellow-800">
            No hospitals found within 5km. <Link href="/locate-hospital" className="text-blue-600 hover:text-blue-700 font-medium">Search wider area →</Link>
          </p>
        </div>
      )}
    </div>
  )
}
