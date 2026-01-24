import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Layout from '@/components/Layout'

export default function PharmacistDashboard() {
  const router = useRouter()
  const [bookings, setBookings] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const dummyBookings = [
    {
      _id: '1',
      patientId: { name: 'John Doe', email: 'john@example.com' },
      slotDate: new Date(Date.now() + 3600000).toISOString(),
      slotTime: '10:00 AM',
      status: 'confirmed',
      meetLink: 'https://meet.google.com/abc-defg-hij'
    },
    {
      _id: '2',
      patientId: { name: 'Jane Smith', email: 'jane@example.com' },
      slotDate: new Date(Date.now() + 86400000).toISOString(),
      slotTime: '2:00 PM',
      status: 'confirmed',
      meetLink: 'https://meet.google.com/xyz-uvwx-yz'
    }
  ]

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem('token')
    const userData = JSON.parse(localStorage.getItem('user') || '{}')
    
    if (!token && !userData.name) {
      // Demo mode
      setUser({ name: 'Dr. Demo Pharmacist', email: 'demo@example.com', role: 'pharmacist' })
      setBookings(dummyBookings)
      setLoading(false)
      return
    }
    
    setUser(userData)
    if (token) {
      fetchBookings(token)
    } else {
      setBookings(dummyBookings)
      setLoading(false)
    }
  }, [])

  const fetchBookings = async (token) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/bookings/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setBookings(res.data)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setBookings(dummyBookings)
      setLoading(false)
    }
  }

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    router.push('/')
  }

  const handleDemoLogin = () => {
    router.push('/login')
  }

  return (
    <Layout>
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Pharmacist Dashboard</h1>
        {typeof window !== 'undefined' && !localStorage.getItem('token') && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-1">
                <p className="text-sm text-yellow-700">
                  <strong>Demo Mode:</strong> You're viewing sample data. 
                  <button onClick={handleDemoLogin} className="ml-2 underline font-semibold">
                    Login
                  </button> to access real features.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <h2 className="text-2xl font-bold mb-4">Upcoming Sessions</h2>
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <p className="text-gray-600">No bookings yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map(booking => (
              <div key={booking._id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">Patient: {booking.patientId?.name}</p>
                    <p>Email: {booking.patientId?.email}</p>
                    <p>Date: {new Date(booking.slotDate).toLocaleDateString()}</p>
                    <p>Time: {booking.slotTime}</p>
                    <p className="text-sm text-gray-600">Status: {booking.status}</p>
                  </div>
                  <div className="space-x-2">
                    {booking.meetLink && (
                      <a 
                        href={booking.meetLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                      >
                        Join Meeting
                      </a>
                    )}
                  </div>
                </div>
                {booking.status === 'confirmed' && (
                  <div className="mt-4">
                    <button 
                      onClick={() => router.push(`/pharmacist/upload-report/${booking._id}`)}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Upload Counselling Report
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </Layout>
  )
}
