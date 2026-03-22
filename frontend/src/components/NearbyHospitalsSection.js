import { useState, useEffect } from 'react'
import Link from 'next/link'

const LocationIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const HospitalIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

export default function NearbyHospitalsSection() {
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [nearbyHospitals, setNearbyHospitals] = useState([])
  const [userCoords, setUserCoords] = useState(null)
  const [permissionDenied, setPermissionDenied] = useState(false)

  // Automatically request location on component mount
  useEffect(() => {
    // Small delay to ensure page is loaded
    const timer = setTimeout(() => {
      requestLocation()
    }, 500)
    
    return () => clearTimeout(timer)
  }, [])

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setUserCoords({ latitude, longitude })
        
        try {
          // Reverse geocode to get location name
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
          
          // Fetch nearby hospitals
          await fetchNearbyHospitals(latitude, longitude)
          
          setLoading(false)
        } catch (err) {
          console.error('Error fetching location name:', err)
          setLocation(`${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`)
          await fetchNearbyHospitals(latitude, longitude)
          setLoading(false)
        }
      },
      (err) => {
        console.error('Error getting location:', err)
        setError('Unable to access your location. Please enable location services.')
        setPermissionDenied(true)
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
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
    const R = 6371
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
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-white rounded-2xl shadow-xl p-12">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <LocationIcon />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Detecting Your Location...</h3>
              <p className="text-gray-600 mb-6">
                Please allow location access to find nearby hospitals
              </p>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (permissionDenied || error) {
    return (
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                Location Access Denied
              </h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                {error || 'We need your location to show nearby hospitals. Please enable location access in your browser settings and refresh the page.'}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                <button
                  onClick={requestLocation}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2"
                >
                  <LocationIcon />
                  <span>Try Again</span>
                </button>
                
                <Link
                  href="/locate-hospital"
                  className="text-blue-600 hover:text-blue-700 font-semibold text-lg underline"
                >
                  Search Manually Instead
                </Link>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700">
                <p className="font-semibold mb-2">How to enable location:</p>
                <ul className="text-left space-y-1 max-w-md mx-auto">
                  <li>• Click the location icon in your browser's address bar</li>
                  <li>• Select "Allow" or "Always allow"</li>
                  <li>• Refresh the page</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (nearbyHospitals.length === 0 && userCoords) {
    return (
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">No Hospitals Found Nearby</h3>
              <p className="text-gray-600 mb-6">
                We couldn't find any hospitals within 5km of your location: <span className="font-semibold">{location}</span>
              </p>
              <Link
                href="/locate-hospital"
                className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300"
              >
                Search Wider Area
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (nearbyHospitals.length > 0) {
    return (
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-md mb-4">
                <LocationIcon />
                <span className="font-semibold text-gray-700">{location}</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                {nearbyHospitals.length} Hospital{nearbyHospitals.length > 1 ? 's' : ''} Near You
              </h2>
              <p className="text-lg text-gray-600">
                Within 5km of your current location
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {nearbyHospitals.slice(0, 6).map((hospital) => {
                const distance = userCoords && hospital.latitude && hospital.longitude
                  ? calculateDistance(userCoords.latitude, userCoords.longitude, hospital.latitude, hospital.longitude)
                  : hospital.distance

                return (
                  <div
                    key={hospital._id}
                    className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100"
                  >
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 text-white">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">{hospital.hospitalName}</h3>
                        {distance && (
                          <span className="bg-white text-green-700 px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap ml-2">
                            {distance.toFixed(1)} km
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-green-50">{hospital.city}</p>
                    </div>
                    
                    <div className="p-4">
                      <p className="text-sm text-gray-600 mb-4">{hospital.address}</p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">🛏️ General Beds:</span>
                          <span className="font-semibold text-gray-800">
                            {hospital.availableBeds}/{hospital.totalBeds}
                          </span>
                        </div>
                        {hospital.icuBeds > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">🏥 ICU Beds:</span>
                            <span className="font-semibold text-red-600">
                              {hospital.availableIcuBeds}/{hospital.icuBeds}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <a
                          href={`tel:${hospital.contactNumber}`}
                          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors text-center"
                        >
                          📞 Call
                        </a>
                        <Link
                          href="/locate-hospital"
                          className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors text-center"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {nearbyHospitals.length > 6 && (
              <div className="text-center">
                <Link
                  href="/locate-hospital"
                  className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  View All {nearbyHospitals.length} Hospitals
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
