import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Layout from '@/components/Layout'
import PdfUploader from '@/components/EnhancedUploader'
import ImageUploader from '@/components/EnhancedUploader'
import ComplaintList from '@/components/ComplaintList'
import ComplaintDetail from '@/components/ComplaintDetail'
import { toast } from 'react-toastify'
import { io } from 'socket.io-client'

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [pharmacists, setPharmacists] = useState([])
  const [doctors, setDoctors] = useState([])
  const [nutritionists, setNutritionists] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  
  // Complaints state
  const [complaints, setComplaints] = useState([])
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [complaintsLoading, setComplaintsLoading] = useState(false)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem('token')
    const userData = JSON.parse(localStorage.getItem('user') || '{}')
    
    // Check if user is logged in
    if (!token || !userData.role) {
      router.push('/login?redirect=/admin/dashboard')
      return
    }
    
    // Check if user has admin role
    if (userData.role !== 'admin') {
      setAccessDenied(true)
      setLoading(false)
      return
    }

    fetchData(token)
    fetchComplaints(token)
  }, [router])

  const fetchData = async (token) => {
    try {
      const requests = [
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/pharmacists`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/doctors`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/patients`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]

      // Try to fetch nutritionists and hospitals, but don't fail if they don't exist
      try {
        requests.push(
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/nutritionists`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      } catch (err) {
        console.log('Nutritionists endpoint not available')
      }

      try {
        requests.push(
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/hospitals`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      } catch (err) {
        console.log('Hospitals endpoint not available')
      }

      const results = await Promise.allSettled(requests)
      
      setUsers(results[0].status === 'fulfilled' ? results[0].value.data : [])
      setPharmacists(results[1].status === 'fulfilled' ? results[1].value.data : [])
      setDoctors(results[2].status === 'fulfilled' ? results[2].value.data : [])
      setPatients(results[3].status === 'fulfilled' ? results[3].value.data : [])
      setNutritionists(results[4]?.status === 'fulfilled' ? results[4].value.data : [])
      setHospitals(results[5]?.status === 'fulfilled' ? results[5].value.data : [])
      
      setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const fetchComplaints = async (token) => {
    setComplaintsLoading(true)
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/complaints/admin/all`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setComplaints(res.data.complaints || [])
    } catch (err) {
      console.error('Error fetching complaints:', err)
      setComplaints([])
    } finally {
      setComplaintsLoading(false)
    }
  }

  const handleComplaintClick = (complaint) => {
    setSelectedComplaint(complaint)
  }

  const handleComplaintUpdate = () => {
    const token = localStorage.getItem('token')
    if (token) {
      fetchComplaints(token)
    }
    setSelectedComplaint(null)
  }

  return (
    <Layout>
      {/* Access Denied Screen */}
      {accessDenied && (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
              <p className="text-gray-600 mb-6">
                You don't have permission to access the admin dashboard. This area is restricted to administrators only.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push('/patient/dashboard')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Patient Dashboard
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Go to Home
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('token')
                  localStorage.removeItem('user')
                  router.push('/login')
                }}
                className="w-full text-gray-600 py-2 px-4 rounded-lg hover:text-gray-800 transition-colors text-sm"
              >
                Login as Different User
              </button>
            </div>
            
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Are you an administrator?</strong> Please contact the system administrator to get admin access.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Normal Dashboard Content */}
      {!accessDenied && (
        <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>

          {/* Stats Cards - Optimized */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Users</p>
                  <p className="text-4xl font-bold mt-2">{users.length}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-lg shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Pharmacists</p>
                  <p className="text-4xl font-bold mt-2">{pharmacists.length}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Patients</p>
                  <p className="text-4xl font-bold mt-2">{patients.length}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b border-gray-200">
              {/* Mobile Tab Selector */}
              <div className="md:hidden px-4 py-3">
                <select
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="overview">Overview</option>
                  <option value="hospital-bookings">🏥 Hospital Bookings</option>
                  <option value="add-pharmacist">Add Pharmacist</option>
                  <option value="add-doctor">Add Doctor</option>
                  <option value="add-nutritionist">Add Nutritionist</option>
                  <option value="add-hospital">Add Hospital</option>
                  <option value="manage-pharmacists">Manage Pharmacists</option>
                  <option value="manage-doctors">Manage Doctors</option>
                  <option value="manage-nutritionists">Manage Nutritionists</option>
                  <option value="manage-hospitals">Manage Hospitals</option>
                  <option value="upload-results">Upload Test Results</option>
                  <option value="analytics">📊 Analytics</option>
                  <option value="payments">💰 Pharmacist Payments</option>
                  <option value="doctor-payments">💰 Doctor Payments</option>
                  <option value="nutritionist-payments">💰 Nutritionist Payments</option>
                  <option value="incentives">🎁 Incentives</option>
                  <option value="subscription-bookings">💳 Subscription Bookings</option>
                  <option value="complaints">📝 Complaints</option>
                  <option value="live-chat">💬 Live Chat</option>
                  <option value="website">🌐 Website</option>
                  <option value="users">👥 User Management</option>
                  <option value="subscriptions">💳 Subscriptions</option>
                  <option value="medical-forms">📋 Medical Forms</option>
                </select>
              </div>

              {/* Desktop Tab Navigation */}
              <nav className="hidden md:flex -mb-px overflow-x-auto">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'overview'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('hospital-bookings')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'hospital-bookings'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🏥 Hospital Bookings
                </button>
                <button
                  onClick={() => setActiveTab('add-pharmacist')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'add-pharmacist'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Add Pharmacist
                </button>
                <button
                  onClick={() => setActiveTab('add-doctor')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'add-doctor'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Add Doctor
                </button>
                <button
                  onClick={() => setActiveTab('add-nutritionist')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'add-nutritionist'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Add Nutritionist
                </button>
                <button
                  onClick={() => setActiveTab('add-hospital')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'add-hospital'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Add Hospital
                </button>
                <button
                  onClick={() => setActiveTab('manage-pharmacists')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'manage-pharmacists'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Manage Pharmacists
                </button>
                <button
                  onClick={() => setActiveTab('manage-doctors')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'manage-doctors'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Manage Doctors
                </button>
                <button
                  onClick={() => setActiveTab('manage-nutritionists')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'manage-nutritionists'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Manage Nutritionists
                </button>
                <button
                  onClick={() => setActiveTab('manage-hospitals')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'manage-hospitals'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Manage Hospitals
                </button>
                <button
                  onClick={() => setActiveTab('upload-results')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'upload-results'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Upload Results
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'analytics'
                      ? 'border-b-2 border-green-600 text-green-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📊 Analytics
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'payments'
                      ? 'border-b-2 border-yellow-600 text-yellow-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  💰 Pharmacist Payments
                </button>
                <button
                  onClick={() => setActiveTab('doctor-payments')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'doctor-payments'
                      ? 'border-b-2 border-yellow-600 text-yellow-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  💰 Doctor Payments
                </button>
                <button
                  onClick={() => setActiveTab('nutritionist-payments')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'nutritionist-payments'
                      ? 'border-b-2 border-yellow-600 text-yellow-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  💰 Nutritionist Payments
                </button>
                <button
                  onClick={() => setActiveTab('incentives')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'incentives'
                      ? 'border-b-2 border-emerald-600 text-emerald-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🎁 Incentives
                </button>
                <button
                  onClick={() => setActiveTab('subscription-bookings')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'subscription-bookings'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  💳 Subscription Bookings
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'reviews'
                      ? 'border-b-2 border-orange-600 text-orange-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ⭐ Reviews
                </button>
                <button
                  onClick={() => setActiveTab('manage')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'manage'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Manage
                </button>
                <button
                  onClick={() => setActiveTab('complaints')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'complaints'
                      ? 'border-b-2 border-red-600 text-red-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📝 Complaints
                </button>
                <button
                  onClick={() => setActiveTab('live-chat')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'live-chat'
                      ? 'border-b-2 border-purple-600 text-purple-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  💬 Live Chat
                </button>
                <button
                  onClick={() => setActiveTab('website')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'website'
                      ? 'border-b-2 border-purple-600 text-purple-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🌐 Website
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'users'
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  👥 Users
                </button>
                <button
                  onClick={() => setActiveTab('subscriptions')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'subscriptions'
                      ? 'border-b-2 border-purple-600 text-purple-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  💳 Subscriptions
                </button>
                <button
                  onClick={() => setActiveTab('medical-forms')}
                  className={`py-4 px-4 lg:px-6 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'medical-forms'
                      ? 'border-b-2 border-teal-600 text-teal-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📋 Medical Forms
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && <OverviewTab users={users} pharmacists={pharmacists} doctors={doctors} nutritionists={nutritionists} hospitals={hospitals} patients={patients} />}
              {activeTab === 'hospital-bookings' && <HospitalBookingsTab />}
              {activeTab === 'add-pharmacist' && <AddPharmacistTab onSuccess={() => fetchData(localStorage.getItem('token'))} />}
              {activeTab === 'add-doctor' && <AddDoctorTab onSuccess={() => fetchData(localStorage.getItem('token'))} />}
              {activeTab === 'add-nutritionist' && <AddNutritionistTab onSuccess={() => fetchData(localStorage.getItem('token'))} />}
              {activeTab === 'add-hospital' && <AddHospitalTab onHospitalAdded={() => fetchData(localStorage.getItem('token'))} />}
              {activeTab === 'manage-pharmacists' && <ManageUsersTab users={users} pharmacists={pharmacists} onUpdate={() => fetchData(localStorage.getItem('token'))} />}
              {activeTab === 'manage-doctors' && <ManageDoctorsTab onUpdate={() => fetchData(localStorage.getItem('token'))} />}
              {activeTab === 'manage-nutritionists' && <ManageNutritionistsTab onUpdate={() => fetchData(localStorage.getItem('token'))} />}
              {activeTab === 'manage-hospitals' && <ManageHospitalsTab onUpdate={() => fetchData(localStorage.getItem('token'))} />}
              {activeTab === 'upload-results' && <UploadResultsTab patients={patients} />}

              {activeTab === 'analytics' && <AnalyticsTab />}
              {activeTab === 'payments' && <PaymentsTab />}
              {activeTab === 'doctor-payments' && <DoctorPaymentsTab />}
              {activeTab === 'nutritionist-payments' && <NutritionistPaymentsTab />}
              {activeTab === 'incentives' && <IncentivesTab />}
              {activeTab === 'subscription-bookings' && <SubscriptionBookingsTab />}
              {activeTab === 'reviews' && <ReviewsTab pharmacists={pharmacists} doctors={doctors} />}
              {activeTab === 'manage' && <ManageUsersTab users={users} pharmacists={pharmacists} onUpdate={() => fetchData(localStorage.getItem('token'))} />}
              {activeTab === 'complaints' && <ComplaintsTab complaints={complaints} loading={complaintsLoading} onComplaintClick={handleComplaintClick} onRefresh={() => fetchComplaints(localStorage.getItem('token'))} />}
              {activeTab === 'live-chat' && <LiveChatTab />}
              {activeTab === 'website' && <WebsiteTab />}
              {activeTab === 'users' && <UserManagementTab />}
              {activeTab === 'subscriptions' && <SubscriptionManagementTab />}
              {activeTab === 'medical-forms' && <MedicalFormsTab />}
            </div>
          </div>
        </div>

        {/* Complaint Detail Modal */}
        {selectedComplaint && (
          <ComplaintDetail
            complaint={selectedComplaint}
            onClose={() => setSelectedComplaint(null)}
            onUpdate={handleComplaintUpdate}
            isAdmin={true}
          />
        )}
        </div>
      )}
    </Layout>
  )
}

// Overview Tab Component
function OverviewTab({ users, pharmacists, doctors, nutritionists, hospitals, patients }) {
  const stats = [
    {
      title: 'Total Doctors',
      count: doctors?.length || 0,
      icon: '🩺',
      color: 'from-green-500 to-teal-500',
      bgColor: 'from-green-50 to-teal-50'
    },
    {
      title: 'Total Pharmacists',
      count: pharmacists?.length || 0,
      icon: '💊',
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'from-blue-50 to-indigo-50'
    },
    {
      title: 'Total Nutritionists',
      count: nutritionists?.length || 0,
      icon: '🥗',
      color: 'from-emerald-500 to-lime-500',
      bgColor: 'from-emerald-50 to-lime-50'
    },
    {
      title: 'Total Hospitals',
      count: hospitals?.length || 0,
      icon: '🏥',
      color: 'from-red-500 to-pink-500',
      bgColor: 'from-red-50 to-pink-50'
    },
    {
      title: 'Total Patients',
      count: patients?.length || 0,
      icon: '👥',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'from-purple-50 to-pink-50'
    },
    {
      title: 'Total Users',
      count: users?.length || 0,
      icon: '👤',
      color: 'from-gray-500 to-gray-600',
      bgColor: 'from-gray-50 to-gray-100'
    }
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-800">System Overview</h2>
      
      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgColor} opacity-90`}></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-4xl font-bold text-gray-800">{stat.count}</p>
                </div>
                <div className={`w-16 h-16 bg-gradient-to-br ${stat.color} rounded-full flex items-center justify-center text-3xl shadow-lg`}>
                  {stat.icon}
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Active in system</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-bold mb-4 text-gray-800">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-center">
            <div className="text-2xl mb-2">➕</div>
            <div className="text-sm font-medium text-gray-700">Add Doctor</div>
          </button>
          <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-center">
            <div className="text-2xl mb-2">➕</div>
            <div className="text-sm font-medium text-gray-700">Add Pharmacist</div>
          </button>
          <button className="p-4 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors text-center">
            <div className="text-2xl mb-2">➕</div>
            <div className="text-sm font-medium text-gray-700">Add Nutritionist</div>
          </button>
          <button className="p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-center">
            <div className="text-2xl mb-2">➕</div>
            <div className="text-sm font-medium text-gray-700">Add Hospital</div>
          </button>
        </div>
      </div>
    </div>
  )
}

// Hospital Bookings Tab Component
function HospitalBookingsTab() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterBookingType, setFilterBookingType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/hospital-bookings/admin/all`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setBookings(res.data)
    } catch (err) {
      console.error('Error fetching hospital bookings:', err)
      setError(err.response?.data?.message || 'Failed to load hospital bookings')
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort bookings
  const filteredBookings = bookings
    .filter(booking => {
      // Status filter
      if (filterStatus !== 'all' && booking.status !== filterStatus) return false
      
      // Booking type filter
      if (filterBookingType !== 'all' && booking.bookingType !== filterBookingType) return false
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const patientName = booking.userId?.name?.toLowerCase() || ''
        const hospitalName = booking.hospitalId?.hospitalName?.toLowerCase() || ''
        const bookingId = booking._id?.toLowerCase() || ''
        
        if (!patientName.includes(query) && !hospitalName.includes(query) && !bookingId.includes(query)) {
          return false
        }
      }
      
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt)
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt)
        case 'amount-high':
          return b.paymentAmount - a.paymentAmount
        case 'amount-low':
          return a.paymentAmount - b.paymentAmount
        default:
          return 0
      }
    })

  // Calculate statistics
  const stats = {
    total: bookings.length,
    bed: bookings.filter(b => b.bookingType === 'bed').length,
    ambulance: bookings.filter(b => b.bookingType === 'ambulance').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    inProgress: bookings.filter(b => b.status === 'in_progress').length,
    pendingPayment: bookings.filter(b => b.status === 'pending_payment').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    totalRevenue: bookings
      .filter(b => b.paymentStatus === 'completed')
      .reduce((sum, b) => sum + b.paymentAmount, 0),
    patientArrived: bookings.filter(b => b.patientArrivalStatus === 'arrived').length,
    ambulanceIssued: bookings.filter(b => b.bookingType === 'ambulance' && b.status !== 'cancelled').length
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending_payment: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  const getPaymentStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      initiated: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-orange-100 text-orange-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  const exportToCSV = () => {
    const headers = ['Booking ID', 'Patient Name', 'Hospital Name', 'Type', 'Status', 'Payment Status', 'Amount', 'Patient Arrived', 'Ambulance', 'Date']
    const rows = filteredBookings.map(b => [
      b._id,
      b.userId?.name || 'N/A',
      b.hospitalId?.hospitalName || 'N/A',
      b.bookingType,
      b.status,
      b.paymentStatus,
      b.paymentAmount,
      b.patientArrivalStatus || 'N/A',
      b.bookingType === 'ambulance' ? 'Yes' : 'No',
      new Date(b.createdAt).toLocaleDateString()
    ])
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hospital-bookings-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        <p className="mt-4 text-gray-600">Loading hospital bookings...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-red-800">Error Loading Data</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={fetchBookings}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">🏥 Hospital Bookings Management</h2>
        <button
          onClick={exportToCSV}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg shadow">
          <p className="text-sm text-blue-600 font-medium">Total Bookings</p>
          <p className="text-3xl font-bold text-blue-700">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg shadow">
          <p className="text-sm text-purple-600 font-medium">Bed Bookings</p>
          <p className="text-3xl font-bold text-purple-700">{stats.bed}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg shadow">
          <p className="text-sm text-orange-600 font-medium">Ambulances</p>
          <p className="text-3xl font-bold text-orange-700">{stats.ambulance}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg shadow">
          <p className="text-sm text-green-600 font-medium">Completed</p>
          <p className="text-3xl font-bold text-green-700">{stats.completed}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg shadow">
          <p className="text-sm text-yellow-600 font-medium">In Progress</p>
          <p className="text-3xl font-bold text-yellow-700">{stats.inProgress}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg shadow">
          <p className="text-sm text-emerald-600 font-medium">Total Revenue</p>
          <p className="text-2xl font-bold text-emerald-700">₹{stats.totalRevenue}</p>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border-2 border-teal-200 p-4 rounded-lg">
          <p className="text-sm text-teal-600 font-medium">Patients Arrived</p>
          <p className="text-2xl font-bold text-teal-700">{stats.patientArrived}</p>
        </div>
        <div className="bg-white border-2 border-indigo-200 p-4 rounded-lg">
          <p className="text-sm text-indigo-600 font-medium">Ambulances Issued</p>
          <p className="text-2xl font-bold text-indigo-700">{stats.ambulanceIssued}</p>
        </div>
        <div className="bg-white border-2 border-red-200 p-4 rounded-lg">
          <p className="text-sm text-red-600 font-medium">Cancelled</p>
          <p className="text-2xl font-bold text-red-700">{stats.cancelled}</p>
        </div>
        <div className="bg-white border-2 border-yellow-200 p-4 rounded-lg">
          <p className="text-sm text-yellow-600 font-medium">Pending Payment</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.pendingPayment}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Patient, Hospital, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Status</option>
              <option value="pending_payment">Pending Payment</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Booking Type</label>
            <select
              value={filterBookingType}
              onChange={(e) => setFilterBookingType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Types</option>
              <option value="bed">Bed Booking</option>
              <option value="ambulance">Ambulance</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount-high">Amount: High to Low</option>
              <option value="amount-low">Amount: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Booking ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Hospital</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Patient Arrived</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Ambulance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-gray-500">
                    No bookings found matching your filters
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">{booking._id.slice(-8)}</code>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{booking.userId?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{booking.userId?.phoneNumber || 'No phone'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{booking.hospitalId?.hospitalName || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{booking.hospitalId?.contactNumber || 'No contact'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        booking.bookingType === 'bed' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {booking.bookingType === 'bed' ? '🛏️ Bed' : '🚑 Ambulance'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(booking.status)}`}>
                        {booking.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadge(booking.paymentStatus)}`}>
                        {booking.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">
                      ₹{booking.paymentAmount}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {booking.bookingType === 'bed' ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          booking.patientArrivalStatus === 'arrived' ? 'bg-green-100 text-green-800' :
                          booking.patientArrivalStatus === 'not_arrived' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.patientArrivalStatus === 'arrived' ? '✓ Arrived' :
                           booking.patientArrivalStatus === 'not_arrived' ? '✗ Not Arrived' :
                           '⏳ Pending'}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {booking.bookingType === 'ambulance' ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {booking.status === 'cancelled' ? '✗ Cancelled' : '✓ Issued'}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>
                        <p>{new Date(booking.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-400">{new Date(booking.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mt-4 text-sm text-gray-600 text-center">
        Showing {filteredBookings.length} of {bookings.length} total bookings
      </div>
    </div>
  )
}

// Add Pharmacist Tab Component
function AddPharmacistTab({ onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    designation: '',
    description: '',
    photo: ''
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [generatedCredentials, setGeneratedCredentials] = useState(null)

  const handleImageUpload = (data) => {
    setFormData(prev => ({...prev, photo: data.url}))
    setMessage('Profile picture uploaded successfully!')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')

    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/pharmacists`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setMessage('Pharmacist created successfully!')
      setGeneratedCredentials({
        email: formData.email,
        password: formData.password
      })
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        designation: '',
        description: '',
        photo: ''
      })
      
      onSuccess()
    } catch (err) {
      console.error('Error creating pharmacist:', err)
      setError(err.response?.data?.message || 'Failed to create pharmacist')
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Add New Pharmacist</h2>
      
      {message && (
        <div className="bg-green-100 text-green-700 p-4 rounded mb-4">
          {message}
          {generatedCredentials && (
            <div className="mt-2 p-3 bg-white rounded">
              <p className="font-semibold">Login Credentials:</p>
              <p>Email: <code className="bg-gray-100 px-2 py-1 rounded">{generatedCredentials.email}</code></p>
              <p>Password: <code className="bg-gray-100 px-2 py-1 rounded">{generatedCredentials.password}</code></p>
              <p className="text-sm text-gray-600 mt-2">⚠️ Save these credentials! They won't be shown again.</p>
            </div>
          )}
        </div>
      )}
      
      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Profile Picture Upload */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <ImageUploader 
            onUploadSuccess={handleImageUpload}
            uploadType="prescription"
            currentImage={formData.photo}
            label="Profile Picture (Optional)"
          />
          {formData.photo && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
              <p className="text-green-700 font-medium">✓ Profile picture ready</p>
              <p className="text-xs text-gray-600 truncate">{formData.photo}</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Name *</label>
          <input
            type="text"
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Email/Username *</label>
          <input
            type="text"
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Password *</label>
          <input
            type="password"
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
            minLength={6}
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Phone</label>
          <input
            type="tel"
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Designation *</label>
          <input
            type="text"
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="e.g., Clinical Pharmacist"
            value={formData.designation}
            onChange={(e) => setFormData({...formData, designation: e.target.value})}
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Description</label>
          <textarea
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="Brief description about the pharmacist..."
            rows="3"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Create Pharmacist
        </button>
      </form>
    </div>
  )
}

// Upload Results Tab Component
function UploadResultsTab({ patients }) {
  const [selectedPatient, setSelectedPatient] = useState('')
  const [reportUrl, setReportUrl] = useState('')
  const [reportType, setReportType] = useState('assessment')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState('')

  const handlePdfUpload = (data) => {
    setReportUrl(data.url)
    setUploadedFileName(data.filename)
    setMessage('PDF uploaded! Now select patient and submit.')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')

    if (!reportUrl) {
      setError('Please upload a PDF first')
      return
    }

    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/upload-test-result`,
        {
          patientId: selectedPatient,
          reportUrl,
          reportType
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setMessage('Test result uploaded successfully!')
      setReportUrl('')
      setUploadedFileName('')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload test result')
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Upload Test Results</h2>
      
      {message && <div className="bg-green-100 text-green-700 p-4 rounded mb-4">{message}</div>}
      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}

      <div className="space-y-6">
        {/* Step 1: Upload PDF */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3">Step 1: Upload PDF File</h3>
          <PdfUploader 
            onUploadSuccess={handlePdfUpload}
            uploadType="pdf"
            label="Select Test Result PDF"
          />
          {uploadedFileName && (
            <div className="mt-2 p-2 bg-green-50 text-green-700 rounded text-sm">
              ✓ Uploaded: {uploadedFileName}
            </div>
          )}
        </div>

        {/* Step 2: Select Patient and Submit */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="font-semibold">Step 2: Assign to Patient</h3>
          
          <div>
            <label className="block text-gray-700 mb-2">Select Patient *</label>
            <select
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              required
            >
              <option value="">Choose a patient...</option>
              {patients.map(patient => (
                <option key={patient._id} value={patient._id}>
                  {patient.name} ({patient.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Report Type *</label>
            <select
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="assessment">Assessment Report</option>
              <option value="document">Medical Document</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={!reportUrl}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            Submit Test Result
          </button>
        </form>
      </div>
    </div>
  )
}

// Manage Users Tab Component
function ManageUsersTab({ users, pharmacists, onUpdate }) {
  const [editingPharmacist, setEditingPharmacist] = useState(null)
  const [editForm, setEditForm] = useState({})

  const handleToggleCoreTeam = async (pharmacistId, current) => {
    try {
      const token = localStorage.getItem('token')
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/pharmacists/${pharmacistId}/core-team`,
        { coreTeam: !current },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      onUpdate()
      toast.success(`Pharmacist ${!current ? 'added to' : 'removed from'} Core Team`)
    } catch (err) {
      toast.error('Failed to update core team status')
    }
  }

  const handleToggleStatus = async (pharmacistId, currentAdminDisabled) => {
    try {
      const token = localStorage.getItem('token')
      const newAdminDisabled = !currentAdminDisabled
      
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/pharmacists/${pharmacistId}/status`,
        { adminDisabled: newAdminDisabled },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      onUpdate()
      toast.success(`Pharmacist bookings ${newAdminDisabled ? 'disabled' : 'enabled'} successfully`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to update booking status')
    }
  }

  const handleEdit = (pharmacist) => {
    setEditingPharmacist(pharmacist._id)
    setEditForm({
      designation: pharmacist.designation,
      description: pharmacist.description || '',
      status: pharmacist.status,
      photo: pharmacist.photo || ''
    })
  }

  const handlePhotoUpload = (data) => {
    setEditForm(prev => ({...prev, photo: data.url}))
  }

  const handleSaveEdit = async (pharmacistId) => {
    try {
      const token = localStorage.getItem('token')
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/pharmacists/${pharmacistId}`,
        editForm,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setEditingPharmacist(null)
      onUpdate()
      toast.success('Pharmacist updated successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to update pharmacist')
    }
  }

  const handleDelete = async (pharmacistId, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return
    
    try {
      const token = localStorage.getItem('token')
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/pharmacists/${pharmacistId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      onUpdate()
      toast.success('Pharmacist deleted successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete pharmacist')
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Manage Pharmacists</h2>
      
      <div className="space-y-6">
        {pharmacists.map(pharmacist => (
          <div key={pharmacist._id} className="bg-white border rounded-lg p-4">
            {editingPharmacist === pharmacist._id ? (
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded">
                  <ImageUploader 
                    onUploadSuccess={handlePhotoUpload}
                    uploadType="prescription"
                    currentImage={editForm.photo}
                    label="Update Profile Picture"
                  />
                </div>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Designation"
                  value={editForm.designation}
                  onChange={(e) => setEditForm({...editForm, designation: e.target.value})}
                />
                <textarea
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Description"
                  rows="2"
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleSaveEdit(pharmacist._id)}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingPharmacist(null)}
                    className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-start space-x-3">
                    <img 
                      src={pharmacist.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(pharmacist.userId?.name || 'User')}&size=80`}
                      alt={pharmacist.userId?.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                      onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(pharmacist.userId?.name || 'User')}&size=80` }}
                    />
                    <div>
                      <h3 className="font-semibold text-lg">{pharmacist.userId?.name}</h3>
                      <p className="text-sm text-gray-600">{pharmacist.userId?.email}</p>
                      <p className="text-sm text-blue-600">{pharmacist.designation}</p>
                      {pharmacist.description && (
                        <p className="text-sm text-gray-500 mt-1">{pharmacist.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-wrap gap-2">
                    <button
                      onClick={() => handleToggleStatus(pharmacist._id, pharmacist.adminDisabled)}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        pharmacist.adminDisabled
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {pharmacist.adminDisabled ? '🔴 Bookings Disabled' : '🟢 Bookings Enabled'}
                    </button>
                    <button
                      onClick={() => handleToggleCoreTeam(pharmacist._id, pharmacist.coreTeam)}
                      className={`px-3 py-1 rounded text-sm font-medium border ${
                        pharmacist.coreTeam
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                          : 'bg-gray-100 text-gray-500 border-gray-300'
                      }`}
                    >
                      {pharmacist.coreTeam ? '⭐ Core Team' : '☆ Core Team'}
                    </button>
                  </div>
                </div>
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={() => handleEdit(pharmacist)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(pharmacist._id, pharmacist.userId?.name)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Analytics Tab Component
function AnalyticsTab() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [professionalType, setProfessionalType] = useState('all') // 'all', 'pharmacist', 'doctor', 'nutritionist'
  const [dateRange, setDateRange] = useState('all') // 'all', 'today', 'week', 'month', 'year'
  const [selectedProfessional, setSelectedProfessional] = useState('all')

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/analytics`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setAnalytics(res.data)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const filterByDateRange = (bookings) => {
    if (!bookings || dateRange === 'all') return bookings

    const now = new Date()
    const filtered = bookings.filter(booking => {
      const bookingDate = new Date(booking.slotDate || booking.createdAt)
      
      switch (dateRange) {
        case 'today':
          return bookingDate.toDateString() === now.toDateString()
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          return bookingDate >= weekAgo
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          return bookingDate >= monthAgo
        case 'year':
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          return bookingDate >= yearAgo
        default:
          return true
      }
    })
    return filtered
  }

  const getFilteredPerformance = () => {
    if (!analytics) return []

    let allPerformance = []

    // Add pharmacist performance
    if (analytics.pharmacistPerformance) {
      allPerformance = allPerformance.concat(
        analytics.pharmacistPerformance.map(p => ({ ...p, type: 'pharmacist' }))
      )
    }

    // Add doctor performance
    if (analytics.doctorPerformance) {
      allPerformance = allPerformance.concat(
        analytics.doctorPerformance.map(p => ({ ...p, type: 'doctor' }))
      )
    }

    // Add nutritionist performance
    if (analytics.nutritionistPerformance) {
      allPerformance = allPerformance.concat(
        analytics.nutritionistPerformance.map(p => ({ ...p, type: 'nutritionist' }))
      )
    }

    // Filter by professional type
    if (professionalType !== 'all') {
      allPerformance = allPerformance.filter(p => p.type === professionalType)
    }

    // Filter by specific professional
    if (selectedProfessional !== 'all') {
      allPerformance = allPerformance.filter(p => p.name === selectedProfessional)
    }

    return allPerformance
  }

  const getFilteredBookings = () => {
    if (!analytics || !analytics.recentBookings) return []
    
    let bookings = [...analytics.recentBookings]
    
    // Filter by date range
    bookings = filterByDateRange(bookings)
    
    // Filter by professional type
    if (professionalType !== 'all') {
      bookings = bookings.filter(b => {
        if (professionalType === 'pharmacist') return b.pharmacistId
        if (professionalType === 'doctor') return b.doctorId
        if (professionalType === 'nutritionist') return b.nutritionistId
        return true
      })
    }

    return bookings
  }

  const calculateFilteredStats = () => {
    const filteredBookings = getFilteredBookings()
    
    return {
      total: filteredBookings.length,
      completed: filteredBookings.filter(b => b.status === 'completed').length,
      active: filteredBookings.filter(b => b.status === 'confirmed').length,
      cancelled: filteredBookings.filter(b => b.status === 'cancelled').length,
      treated: filteredBookings.filter(b => b.treatmentCompleted).length
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <p className="mt-2 text-gray-600">Loading analytics...</p>
      </div>
    )
  }

  if (!analytics) {
    return <div className="text-center text-gray-600">Failed to load analytics</div>
  }

  const filteredPerformance = getFilteredPerformance()
  const filteredBookings = getFilteredBookings()
  const filteredStats = calculateFilteredStats()

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">📊 System Analytics</h2>

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Professional Type</label>
            <select
              value={professionalType}
              onChange={(e) => {
                setProfessionalType(e.target.value)
                setSelectedProfessional('all')
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Professionals</option>
              <option value="pharmacist">💊 Pharmacists</option>
              <option value="doctor">🩺 Doctors</option>
              <option value="nutritionist">🥗 Nutritionists</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last Year</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Specific Professional</label>
            <select
              value={selectedProfessional}
              onChange={(e) => setSelectedProfessional(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              {filteredPerformance.map((p, idx) => (
                <option key={idx} value={p.name}>
                  {p.name} ({p.type === 'pharmacist' ? '💊' : p.type === 'doctor' ? '🩺' : '🥗'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg shadow-lg">
          <p className="text-blue-600 text-sm font-medium">Total Bookings</p>
          <p className="text-4xl font-bold text-blue-700 mt-2">{filteredStats.total}</p>
          <p className="text-xs text-blue-500 mt-1">
            {dateRange === 'all' ? 'All time' : dateRange === 'today' ? 'Today' : `Last ${dateRange}`}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg shadow-lg">
          <p className="text-green-600 text-sm font-medium">Completed</p>
          <p className="text-4xl font-bold text-green-700 mt-2">{filteredStats.completed}</p>
          <p className="text-xs text-green-500 mt-1">
            {filteredStats.total > 0 ? Math.round((filteredStats.completed / filteredStats.total) * 100) : 0}% completion rate
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg shadow-lg">
          <p className="text-purple-600 text-sm font-medium">Active</p>
          <p className="text-4xl font-bold text-purple-700 mt-2">{filteredStats.active}</p>
          <p className="text-xs text-purple-500 mt-1">Currently ongoing</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg shadow-lg">
          <p className="text-red-600 text-sm font-medium">Cancelled</p>
          <p className="text-4xl font-bold text-red-700 mt-2">{filteredStats.cancelled}</p>
          <p className="text-xs text-red-500 mt-1">
            {filteredStats.total > 0 ? Math.round((filteredStats.cancelled / filteredStats.total) * 100) : 0}% cancellation rate
          </p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg shadow-lg">
          <p className="text-yellow-600 text-sm font-medium">Treated Patients</p>
          <p className="text-4xl font-bold text-yellow-700 mt-2">{filteredStats.treated}</p>
          <p className="text-xs text-yellow-500 mt-1">Treatment completed</p>
        </div>
      </div>

      {/* Professional Performance */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Professional Performance</h3>
          <span className="text-sm text-gray-600">
            Showing {filteredPerformance.length} {professionalType === 'all' ? 'professionals' : `${professionalType}s`}
          </span>
        </div>
        <div className="bg-white border rounded-lg overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Professional</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Total</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Completed</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Cancelled</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Treated</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {filteredPerformance.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                      No performance data available for selected filters
                    </td>
                  </tr>
                ) : (
                  filteredPerformance.map((professional, index) => {
                    const successRate = professional.totalBookings > 0 
                      ? Math.round((professional.completed / professional.totalBookings) * 100) 
                      : 0
                    
                    return (
                      <tr key={index} className="border-t hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{professional.name}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            professional.type === 'doctor' ? 'bg-red-100 text-red-700' :
                            professional.type === 'nutritionist' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {professional.type === 'doctor' ? '🩺 Doctor' : 
                             professional.type === 'nutritionist' ? '🥗 Nutritionist' : 
                             '💊 Pharmacist'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold">{professional.totalBookings}</td>
                        <td className="px-4 py-3 text-center text-sm text-green-600 font-semibold">{professional.completed}</td>
                        <td className="px-4 py-3 text-center text-sm text-red-600 font-semibold">{professional.cancelled}</td>
                        <td className="px-4 py-3 text-center text-sm text-blue-600 font-semibold">{professional.treated}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  successRate >= 80 ? 'bg-green-500' :
                                  successRate >= 60 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${successRate}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-semibold">{successRate}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Recent Bookings</h3>
          <span className="text-sm text-gray-600">
            Showing {filteredBookings.slice(0, 10).length} of {filteredBookings.length} bookings
          </span>
        </div>
        <div className="space-y-3">
          {filteredBookings.length === 0 ? (
            <div className="bg-white border rounded-lg p-8 text-center">
              <p className="text-gray-500">No bookings found for selected filters</p>
            </div>
          ) : (
            filteredBookings.slice(0, 10).map((booking) => {
              const professionalName = booking.pharmacistId?.userId?.name || 
                                      booking.doctorId?.userId?.name || 
                                      booking.nutritionistId?.userId?.name || 
                                      'Unknown'
              const professionalTypeIcon = booking.pharmacistId ? '💊' : 
                                          booking.doctorId ? '🩺' : 
                                          booking.nutritionistId ? '🥗' : '👤'
              
              return (
                <div key={booking._id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <span className="text-lg mr-2">{professionalTypeIcon}</span>
                        <p className="font-semibold text-gray-900">{booking.patientId?.name}</p>
                      </div>
                      <p className="text-sm text-gray-600">
                        Professional: {professionalName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(booking.slotDate || booking.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })} {booking.slotTime ? `at ${booking.slotTime}` : ''}
                      </p>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap ${
                      booking.status === 'completed' ? 'bg-green-100 text-green-700' :
                      booking.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
        {filteredBookings.length > 10 && (
          <p className="text-sm text-gray-500 text-center mt-4">
            + {filteredBookings.length - 10} more bookings
          </p>
        )}
      </div>
    </div>
  )
}

// Payments Tab Component
function PaymentsTab() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedBookings, setSelectedBookings] = useState([])
  const [message, setMessage] = useState('')
  const [adminRevenue, setAdminRevenue] = useState({
    totalRevenue: 0,
    platformShare: 0,
    pharmacistShare: 0,
    totalBookings: 0
  })

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token')

      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/pharmacist-payments`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setPayments(res.data)
      
      // Calculate admin revenue (100% of patient payments)
      const totalRevenue = res.data.reduce((sum, p) => sum + (p.totalEarned / 0.7), 0) // totalEarned is 70%, so /0.7 for 100%
      const pharmacistShare = res.data.reduce((sum, p) => sum + p.totalEarned, 0)
      const platformShare = totalRevenue - pharmacistShare
      const totalBookings = res.data.reduce((sum, p) => sum + p.completedBookings, 0)

      setAdminRevenue({
        totalRevenue,
        platformShare,
        pharmacistShare,
        totalBookings
      })
      
      setLoading(false)
    } catch (err) {
      console.error('Error fetching payments:', err)
      console.error('Error details:', err.response?.data || err.message)
      setError(err.response?.data?.message || err.message || 'Failed to load payment data')
      setLoading(false)
    }
  }

  const handleMarkAsPaid = async (pharmacistId, bookingIds) => {
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/mark-payment-done`,
        { bookingIds },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setMessage('Payment marked as done successfully!')
      toast.success('Payment marked as done successfully!')
      setSelectedBookings([])
      fetchPayments()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error(err)
      toast.error('Failed to mark payment as done')
    }
  }

  const exportToCSV = () => {
    const headers = ['Pharmacist Name', 'Total Earned', 'Total Paid', 'Outstanding', 'Completed Bookings', 'Unpaid Bookings']
    const rows = payments.map(p => [
      p.name,
      p.totalEarned,
      p.totalPaid,
      p.outstanding,
      p.completedBookings,
      p.unpaidBookings.length
    ])
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pharmacist-payments-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
        <p className="mt-2 text-gray-600">Loading payment data...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">💰 Pharmacist Payment Management</h2>
        <button
          onClick={exportToCSV}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          <p className="font-semibold">Error loading payment data:</p>
          <p>{error}</p>
          <button 
            onClick={fetchPayments}
            className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}
      
      {message && (
        <div className="bg-green-100 text-green-700 p-4 rounded mb-4">
          {message}
        </div>
      )}

      {/* Admin Revenue Overview - Shows 100% of payments */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg shadow-lg mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Platform Revenue Overview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium">Total Revenue (100%)</p>
            <p className="text-3xl font-bold text-blue-600">₹{adminRevenue.totalRevenue}</p>
            <p className="text-xs text-gray-500 mt-1">{adminRevenue.totalBookings} bookings</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium">Platform Share (30%)</p>
            <p className="text-3xl font-bold text-green-600">₹{adminRevenue.platformShare}</p>
            <p className="text-xs text-gray-500 mt-1">Your earnings</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium">Pharmacist Share (70%)</p>
            <p className="text-3xl font-bold text-orange-600">₹{adminRevenue.pharmacistShare}</p>
            <p className="text-xs text-gray-500 mt-1">To be paid out</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium">Per Booking</p>
            <p className="text-3xl font-bold text-purple-600">₹149-₹449</p>
            <p className="text-xs text-gray-500 mt-1">Pharmacist services</p>
          </div>
        </div>

        {/* Revenue Progress Bar - Shows 100% */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-700">Revenue Distribution</p>
            <p className="text-sm text-gray-600">100% Collected</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden flex">
            <div 
              className="bg-gradient-to-r from-green-500 to-green-600 h-8 flex items-center justify-center text-white text-sm font-bold"
              style={{ width: '30%' }}
            >
              Platform: ₹{adminRevenue.platformShare}
            </div>
            <div 
              className="bg-gradient-to-r from-orange-400 to-orange-500 h-8 flex items-center justify-center text-white text-sm font-bold"
              style={{ width: '70%' }}
            >
              Pharmacists: ₹{adminRevenue.pharmacistShare}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Platform Revenue: 30%</span>
            <span>Pharmacist Payouts: 70%</span>
          </div>
        </div>
      </div>

      {/* Pharmacist Payment Management */}
      <h3 className="text-xl font-bold mb-4">Pharmacist Payment Management</h3>
      <div className="space-y-6">
        {payments.map((payment) => (
          <div key={payment.pharmacistId} className="bg-white border rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">{payment.name}</h3>
                <p className="text-sm text-gray-600">{payment.completedBookings} completed bookings</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">₹{payment.totalEarned}</p>
                <p className="text-xs text-gray-500">Total Earned</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-green-50 p-3 rounded">
                <p className="text-xs text-green-600 font-medium">Paid</p>
                <p className="text-xl font-bold text-green-700">₹{payment.totalPaid}</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded">
                <p className="text-xs text-yellow-600 font-medium">Outstanding</p>
                <p className="text-xl font-bold text-yellow-700">₹{payment.outstanding}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-xs text-blue-600 font-medium">Unpaid Bookings</p>
                <p className="text-xl font-bold text-blue-700">{payment.unpaidBookings.length}</p>
              </div>
            </div>

            {payment.unpaidBookings.length > 0 && (
              <div className="border-t pt-4">
                <p className="font-medium mb-2">Unpaid Bookings:</p>
                <div className="space-y-2 mb-3">
                  {payment.unpaidBookings.map((booking) => (
                    <div key={booking.bookingId} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedBookings.includes(booking.bookingId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBookings([...selectedBookings, booking.bookingId])
                            } else {
                              setSelectedBookings(selectedBookings.filter(id => id !== booking.bookingId))
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <div>
                          <p className="text-sm font-medium">{booking.patientName}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(booking.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-green-600">₹{booking.amount}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const bookingIds = payment.unpaidBookings
                      .filter(b => selectedBookings.includes(b.bookingId))
                      .map(b => b.bookingId)
                    if (bookingIds.length > 0) {
                      handleMarkAsPaid(payment.pharmacistId, bookingIds)
                    } else {
                      toast.warning('Please select bookings to mark as paid')
                    }
                  }}
                  disabled={selectedBookings.length === 0}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                  Mark Selected as Paid ({selectedBookings.filter(id => 
                    payment.unpaidBookings.some(b => b.bookingId === id)
                  ).length})
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Reviews Tab Component
function ReviewsTab({ pharmacists, doctors }) {
  const [allReviews, setAllReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProfessional, setSelectedProfessional] = useState('all')
  const [professionalType, setProfessionalType] = useState('all') // 'all', 'pharmacist', 'doctor', 'nutritionist'
  const [nutritionists, setNutritionists] = useState([])

  useEffect(() => {
    fetchNutritionists()
  }, [])

  useEffect(() => {
    if (nutritionists.length > 0 || pharmacists.length > 0 || doctors.length > 0) {
      fetchAllReviews()
    }
  }, [pharmacists, doctors, nutritionists])

  const fetchNutritionists = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/nutritionists`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNutritionists(res.data || [])
    } catch (err) {
      console.error('Error fetching nutritionists:', err)
      setNutritionists([])
    }
  }

  const fetchAllReviews = async () => {
    try {
      // Fetch pharmacist reviews
      const pharmacistReviewsPromises = pharmacists.map(async (pharmacist) => {
        try {
          const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/bookings/reviews/${pharmacist._id}`)
          return {
            professional: pharmacist,
            type: 'pharmacist',
            ...res.data
          }
        } catch (err) {
          return {
            professional: pharmacist,
            type: 'pharmacist',
            reviews: [],
            totalReviews: 0,
            averageRating: 0
          }
        }
      })

      // Fetch doctor reviews
      const doctorReviewsPromises = doctors.map(async (doctor) => {
        try {
          const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/bookings/reviews/${doctor._id}?type=doctor`)
          return {
            professional: doctor,
            type: 'doctor',
            ...res.data
          }
        } catch (err) {
          return {
            professional: doctor,
            type: 'doctor',
            reviews: [],
            totalReviews: 0,
            averageRating: 0
          }
        }
      })

      // Fetch nutritionist reviews
      const nutritionistReviewsPromises = nutritionists.map(async (nutritionist) => {
        try {
          const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/bookings/reviews/${nutritionist._id}?type=nutritionist`)
          return {
            professional: nutritionist,
            type: 'nutritionist',
            ...res.data
          }
        } catch (err) {
          return {
            professional: nutritionist,
            type: 'nutritionist',
            reviews: [],
            totalReviews: 0,
            averageRating: 0
          }
        }
      })

      const [pharmacistResults, doctorResults, nutritionistResults] = await Promise.all([
        Promise.all(pharmacistReviewsPromises),
        Promise.all(doctorReviewsPromises),
        Promise.all(nutritionistReviewsPromises)
      ])

      const allResults = [...pharmacistResults, ...doctorResults, ...nutritionistResults]
      setAllReviews(allResults)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching reviews:', err)
      setLoading(false)
    }
  }

  const filteredReviews = allReviews.filter(r => {
    const typeMatch = professionalType === 'all' || r.type === professionalType
    const professionalMatch = selectedProfessional === 'all' || r.professional._id === selectedProfessional
    return typeMatch && professionalMatch
  })

  const totalReviewsCount = filteredReviews.reduce((sum, r) => sum + r.totalReviews, 0)
  const overallAverage = filteredReviews.length > 0 && totalReviewsCount > 0
    ? filteredReviews.reduce((sum, r) => sum + (r.averageRating * r.totalReviews), 0) / totalReviewsCount
    : 0

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        <p className="mt-2 text-gray-600">Loading reviews...</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">All Reviews & Feedback</h2>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Professional Type</label>
          <select
            value={professionalType}
            onChange={(e) => {
              setProfessionalType(e.target.value)
              setSelectedProfessional('all')
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Professionals</option>
            <option value="pharmacist">Pharmacists Only</option>
            <option value="doctor">Doctors Only</option>
            <option value="nutritionist">Nutritionists Only</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Specific Professional</label>
          <select
            value={selectedProfessional}
            onChange={(e) => setSelectedProfessional(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            {filteredReviews.map(r => (
              <option key={r.professional._id} value={r.professional._id}>
                {r.professional.userId?.name || r.professional.name} ({r.type === 'pharmacist' ? '💊' : r.type === 'doctor' ? '🩺' : '🥗'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm font-medium">Overall Average Rating</p>
          <div className="flex items-center mt-2">
            <p className="text-4xl font-bold text-yellow-600 mr-3">
              {overallAverage.toFixed(1)}
            </p>
            <div className="flex">
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} className="text-2xl">
                  {star <= Math.round(overallAverage) ? '⭐' : '☆'}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm font-medium">Total Reviews</p>
          <p className="text-4xl font-bold text-blue-600 mt-2">{totalReviewsCount}</p>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm font-medium">Active Professionals</p>
          <p className="text-4xl font-bold text-green-600 mt-2">
            {filteredReviews.filter(r => r.totalReviews > 0).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">with reviews</p>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm font-medium">Satisfaction Rate</p>
          <p className="text-4xl font-bold text-purple-600 mt-2">
            {totalReviewsCount > 0 ? Math.round((overallAverage / 5) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-500 mt-1">overall satisfaction</p>
        </div>
      </div>

      {/* Professional Reviews */}
      {filteredReviews.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-600">No reviews found for the selected filters</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredReviews.map((item) => (
            <div key={item.professional._id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Professional Header */}
              <div className={`p-4 text-white ${
                item.type === 'doctor' 
                  ? 'bg-gradient-to-r from-red-500 to-pink-500' 
                  : item.type === 'nutritionist'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : 'bg-gradient-to-r from-orange-500 to-yellow-500'
              }`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">
                      {item.type === 'doctor' ? 'Dr. ' : ''}{item.professional.userId?.name}
                    </h3>
                    <p className="text-sm opacity-90">
                      {item.type === 'doctor' ? '🩺 Doctor' : item.type === 'nutritionist' ? '🥗 Nutritionist' : '💊 Pharmacist'} • {item.professional.specialization || item.professional.designation}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end">
                      <span className="text-3xl font-bold mr-2">{item.averageRating.toFixed(1)}</span>
                      <div className="flex flex-col">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(star => (
                            <span key={star} className="text-lg">
                              {star <= Math.round(item.averageRating) ? '⭐' : '☆'}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs">{item.totalReviews} reviews</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reviews List */}
              <div className="p-4">
                {item.reviews.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No reviews yet</p>
                ) : (
                  <div className="space-y-3">
                    {item.reviews.slice(0, 5).map((review) => (
                      <div key={review._id} className={`border-l-4 pl-4 py-2 bg-gray-50 rounded ${
                        item.type === 'doctor' ? 'border-red-400' : item.type === 'nutritionist' ? 'border-emerald-400' : 'border-orange-400'
                      }`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-gray-800">
                              {review.patientId?.name || 'Anonymous'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(review.review.submittedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map(star => (
                              <span key={star} className="text-sm">
                                {star <= review.review.rating ? '⭐' : '☆'}
                              </span>
                            ))}
                            <span className="ml-1 text-sm font-bold text-gray-700">
                              {review.review.rating}/5
                            </span>
                          </div>
                        </div>
                        {review.review.feedback && (
                          <p className="text-sm text-gray-700 italic">"{review.review.feedback}"</p>
                        )}
                      </div>
                    ))}
                    {item.reviews.length > 5 && (
                      <p className="text-sm text-gray-500 text-center pt-2">
                        + {item.reviews.length - 5} more reviews
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Complaints Tab Component
function ComplaintsTab({ complaints, loading, onComplaintClick, onRefresh }) {
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredComplaints = complaints.filter(complaint => {
    const matchesStatus = filterStatus === 'all' || complaint.status === filterStatus
    const matchesPriority = filterPriority === 'all' || complaint.priority === filterPriority
    const matchesCategory = filterCategory === 'all' || complaint.category === filterCategory
    const matchesSearch = searchTerm === '' || 
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesPriority && matchesCategory && matchesSearch
  })

  const getStatusStats = () => {
    const stats = complaints.reduce((acc, complaint) => {
      acc[complaint.status] = (acc[complaint.status] || 0) + 1
      return acc
    }, {})
    return stats
  }

  const stats = getStatusStats()

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Complaints Management</h2>
        <button
          onClick={onRefresh}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-yellow-600 text-sm font-medium">Open</p>
          <p className="text-3xl font-bold text-yellow-700">{stats.open || 0}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-blue-600 text-sm font-medium">In Progress</p>
          <p className="text-3xl font-bold text-blue-700">{stats.in_progress || 0}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-green-600 text-sm font-medium">Resolved</p>
          <p className="text-3xl font-bold text-green-700">{stats.resolved || 0}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="text-gray-600 text-sm font-medium">Total</p>
          <p className="text-3xl font-bold text-gray-700">{complaints.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search complaints..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="technical_issue">Technical Issue</option>
              <option value="service_quality">Service Quality</option>
              <option value="billing">Billing</option>
              <option value="pharmacist_behavior">Pharmacist Behavior</option>
              <option value="appointment_issue">Appointment Issue</option>
              <option value="platform_bug">Platform Bug</option>
              <option value="privacy_concern">Privacy Concern</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Complaints List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading complaints...</p>
        </div>
      ) : (
        <div>
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredComplaints.length} of {complaints.length} complaints
          </div>
          <ComplaintList
            complaints={filteredComplaints}
            onComplaintClick={onComplaintClick}
            onRefresh={onRefresh}
          />
        </div>
      )}
    </div>
  )
}
// Website Management Tab Component
function WebsiteTab() {
  const [activeSubTab, setActiveSubTab] = useState('settings')
  const [websiteSettings, setWebsiteSettings] = useState(null)
  const [faqs, setFaqs] = useState([])
  const [customerServices, setCustomerServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // FAQ Form State
  const [faqForm, setFaqForm] = useState({
    question: '',
    answer: '',
    category: 'general',
    order: 0
  })
  const [editingFaq, setEditingFaq] = useState(null)

  // Customer Service Form State
  const [serviceForm, setServiceForm] = useState({
    title: '',
    description: '',
    icon: '📞',
    contactMethod: 'phone',
    contactValue: '',
    workingHours: '24/7',
    order: 0
  })
  const [editingService, setEditingService] = useState(null)

  // Legal Pages State
  const [legalPages, setLegalPages] = useState([])
  const [legalForm, setLegalForm] = useState({
    title: '',
    content: '',
    version: '1.0'
  })
  const [editingLegalPage, setEditingLegalPage] = useState(null)

  useEffect(() => {
    fetchWebsiteData()
  }, [])

  const fetchWebsiteData = async () => {
    try {
      const token = localStorage.getItem('token')
      const [settingsRes, faqsRes, servicesRes, legalRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/website/settings`),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/website/faqs?active=false`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/website/customer-service?active=false`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/website/admin/legal`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      
      setWebsiteSettings(settingsRes.data)
      setFaqs(faqsRes.data)
      setCustomerServices(servicesRes.data)
      setLegalPages(legalRes.data)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching website data:', err)
      setLoading(false)
    }
  }

  const updateWebsiteSettings = async (updates) => {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/website/settings`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      // Update state with the returned settings
      const updatedSettings = res.data.settings || res.data
      setWebsiteSettings(updatedSettings)
      
      // Log for debugging
      console.log('Updated settings:', updatedSettings)
      if (updatedSettings.professionalTiles?.tiles) {
        console.log('Professional tiles count:', updatedSettings.professionalTiles.tiles.length)
      }
      
      toast.success('Settings updated successfully')
    } catch (err) {
      console.error('Error updating settings:', err)
      toast.error('Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const handleFaqSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      if (editingFaq) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/website/faqs/${editingFaq._id}`,
          faqForm,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        toast.success('FAQ updated successfully')
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/website/faqs`,
          faqForm,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        toast.success('FAQ created successfully')
      }
      setFaqForm({ question: '', answer: '', category: 'general', order: 0 })
      setEditingFaq(null)
      fetchWebsiteData()
    } catch (err) {
      console.error('Error saving FAQ:', err)
      toast.error('Failed to save FAQ')
    } finally {
      setSaving(false)
    }
  }

  const handleServiceSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      if (editingService) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/website/customer-service/${editingService._id}`,
          serviceForm,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        toast.success('Service updated successfully')
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/website/customer-service`,
          serviceForm,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        toast.success('Service created successfully')
      }
      setServiceForm({
        title: '', description: '', icon: '📞', contactMethod: 'phone',
        contactValue: '', workingHours: '24/7', order: 0
      })
      setEditingService(null)
      fetchWebsiteData()
    } catch (err) {
      console.error('Error saving service:', err)
      toast.error('Failed to save service')
    } finally {
      setSaving(false)
    }
  }

  const deleteFaq = async (id) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) return
    
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/website/faqs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('FAQ deleted successfully')
      fetchWebsiteData()
    } catch (err) {
      console.error('Error deleting FAQ:', err)
      toast.error('Failed to delete FAQ')
    }
  }

  const deleteService = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return
    
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/website/customer-service/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Service deleted successfully')
      fetchWebsiteData()
    } catch (err) {
      console.error('Error deleting service:', err)
      toast.error('Failed to delete service')
    }
  }

  const handleLegalPageSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/website/admin/legal/${editingLegalPage}`,
        legalForm,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Legal page updated successfully')
      setLegalForm({ title: '', content: '', version: '1.0' })
      setEditingLegalPage(null)
      fetchWebsiteData()
    } catch (err) {
      console.error('Error saving legal page:', err)
      toast.error('Failed to save legal page')
    } finally {
      setSaving(false)
    }
  }

  const toggleLegalPageStatus = async (pageType) => {
    try {
      const token = localStorage.getItem('token')
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/website/admin/legal/${pageType}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Legal page status updated successfully')
      fetchWebsiteData()
    } catch (err) {
      console.error('Error toggling legal page status:', err)
      toast.error('Failed to update legal page status')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <p className="mt-2 text-gray-600">Loading website data...</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Website Management</h2>

      {/* Sub Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('settings')}
            className={`py-2 px-4 font-medium text-sm whitespace-nowrap ${
              activeSubTab === 'settings'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ⚙️ Settings
          </button>
          <button
            onClick={() => setActiveSubTab('hero')}
            className={`py-2 px-4 font-medium text-sm whitespace-nowrap ${
              activeSubTab === 'hero'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🎯 Hero Section
          </button>
          <button
            onClick={() => setActiveSubTab('slides')}
            className={`py-2 px-4 font-medium text-sm whitespace-nowrap ${
              activeSubTab === 'slides'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🎬 Slides ({websiteSettings?.heroSection?.slides?.length || 0})
          </button>
          <button
            onClick={() => setActiveSubTab('tiles')}
            className={`py-2 px-4 font-medium text-sm whitespace-nowrap ${
              activeSubTab === 'tiles'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🏥 Professional Tiles ({websiteSettings?.professionalTiles?.tiles?.length || 0})
          </button>
          <button
            onClick={() => setActiveSubTab('faqs')}
            className={`py-2 px-4 font-medium text-sm whitespace-nowrap ${
              activeSubTab === 'faqs'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ❓ FAQs ({faqs.length})
          </button>
          <button
            onClick={() => setActiveSubTab('services')}
            className={`py-2 px-4 font-medium text-sm whitespace-nowrap ${
              activeSubTab === 'services'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📞 Customer Service ({customerServices.length})
          </button>
          <button
            onClick={() => setActiveSubTab('legal')}
            className={`py-2 px-4 font-medium text-sm whitespace-nowrap ${
              activeSubTab === 'legal'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📄 Legal Pages ({legalPages.length})
          </button>
        </nav>
      </div>

      {/* Website Settings */}
      {activeSubTab === 'settings' && websiteSettings && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Website Name</label>
                <input
                  type="text"
                  value={websiteSettings.websiteName}
                  onChange={(e) => setWebsiteSettings({...websiteSettings, websiteName: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Website Description</label>
                <input
                  type="text"
                  value={websiteSettings.websiteDescription}
                  onChange={(e) => setWebsiteSettings({...websiteSettings, websiteDescription: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <button
              onClick={() => updateWebsiteSettings({
                websiteName: websiteSettings.websiteName,
                websiteDescription: websiteSettings.websiteDescription
              })}
              disabled={saving}
              className="mt-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Basic Info'}
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={websiteSettings.contactInfo?.email || ''}
                  onChange={(e) => setWebsiteSettings({
                    ...websiteSettings,
                    contactInfo: {...websiteSettings.contactInfo, email: e.target.value}
                  })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <input
                  type="text"
                  value={websiteSettings.contactInfo?.phone || ''}
                  onChange={(e) => setWebsiteSettings({
                    ...websiteSettings,
                    contactInfo: {...websiteSettings.contactInfo, phone: e.target.value}
                  })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Address</label>
                <input
                  type="text"
                  value={websiteSettings.contactInfo?.address || ''}
                  onChange={(e) => setWebsiteSettings({
                    ...websiteSettings,
                    contactInfo: {...websiteSettings.contactInfo, address: e.target.value}
                  })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Working Hours</label>
                <input
                  type="text"
                  value={websiteSettings.contactInfo?.workingHours || ''}
                  onChange={(e) => setWebsiteSettings({
                    ...websiteSettings,
                    contactInfo: {...websiteSettings.contactInfo, workingHours: e.target.value}
                  })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <button
              onClick={() => updateWebsiteSettings({contactInfo: websiteSettings.contactInfo})}
              disabled={saving}
              className="mt-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Contact Info'}
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      {activeSubTab === 'hero' && websiteSettings && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Hero Section</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                value={websiteSettings.heroSection?.title || ''}
                onChange={(e) => setWebsiteSettings({
                  ...websiteSettings,
                  heroSection: {...websiteSettings.heroSection, title: e.target.value}
                })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Subtitle</label>
              <input
                type="text"
                value={websiteSettings.heroSection?.subtitle || ''}
                onChange={(e) => setWebsiteSettings({
                  ...websiteSettings,
                  heroSection: {...websiteSettings.heroSection, subtitle: e.target.value}
                })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={websiteSettings.heroSection?.description || ''}
                onChange={(e) => setWebsiteSettings({
                  ...websiteSettings,
                  heroSection: {...websiteSettings.heroSection, description: e.target.value}
                })}
                rows={3}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">CTA Button Text</label>
              <input
                type="text"
                value={websiteSettings.heroSection?.ctaText || ''}
                onChange={(e) => setWebsiteSettings({
                  ...websiteSettings,
                  heroSection: {...websiteSettings.heroSection, ctaText: e.target.value}
                })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Hero Background Image Upload */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium mb-2">Hero Background Image</label>
              <p className="text-xs text-gray-500 mb-3">Upload a background image for the hero section (recommended: 1920x1080px)</p>
              <ImageUploader
                currentImage={websiteSettings.heroSection?.backgroundImage}
                onUploadSuccess={(result) => {
                  const url = typeof result === 'string' ? result : result.url
                  setWebsiteSettings({
                    ...websiteSettings,
                    heroSection: {...websiteSettings.heroSection, backgroundImage: url}
                  })
                  toast.success('Background image uploaded successfully')
                }}
                label="Upload Hero Background"
                accept="image/*"
              />
              {websiteSettings.heroSection?.backgroundImage && (
                <div className="mt-3">
                  <img 
                    src={websiteSettings.heroSection.backgroundImage} 
                    alt="Hero Background Preview" 
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                  <button
                    onClick={() => {
                      setWebsiteSettings({
                        ...websiteSettings,
                        heroSection: {...websiteSettings.heroSection, backgroundImage: ''}
                      })
                    }}
                    className="mt-2 text-red-600 text-sm hover:text-red-700"
                  >
                    Remove Background Image
                  </button>
                </div>
              )}
            </div>

            {/* Hero Text Background Image Upload */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium mb-2">Hero Text Background Image</label>
              <p className="text-xs text-gray-500 mb-3">Upload a background image for the hero text area (optional, for overlay effect)</p>
              <ImageUploader
                currentImage={websiteSettings.heroSection?.textBackgroundImage}
                onUploadSuccess={(result) => {
                  const url = typeof result === 'string' ? result : result.url
                  setWebsiteSettings({
                    ...websiteSettings,
                    heroSection: {...websiteSettings.heroSection, textBackgroundImage: url}
                  })
                  toast.success('Text background image uploaded successfully')
                }}
                label="Upload Text Background"
                accept="image/*"
              />
              {websiteSettings.heroSection?.textBackgroundImage && (
                <div className="mt-3">
                  <img 
                    src={websiteSettings.heroSection.textBackgroundImage} 
                    alt="Text Background Preview" 
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <button
                    onClick={() => {
                      setWebsiteSettings({
                        ...websiteSettings,
                        heroSection: {...websiteSettings.heroSection, textBackgroundImage: ''}
                      })
                    }}
                    className="mt-2 text-red-600 text-sm hover:text-red-700"
                  >
                    Remove Text Background Image
                  </button>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => updateWebsiteSettings({heroSection: websiteSettings.heroSection})}
            disabled={saving}
            className="mt-6 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Hero Section'}
          </button>
        </div>
      )}

      {/* Slides Management */}
      {activeSubTab === 'slides' && websiteSettings && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Manage Hero Slides</h3>
              <button
                onClick={() => {
                  const newSlides = [...(websiteSettings.heroSection?.slides || []), {
                    title: '',
                    subtitle: '',
                    description: '',
                    icon: '🩺',
                    features: [],
                    quote: '',
                    isMainSlide: false,
                    order: (websiteSettings.heroSection?.slides?.length || 0)
                  }]
                  setWebsiteSettings({
                    ...websiteSettings,
                    heroSection: {...websiteSettings.heroSection, slides: newSlides}
                  })
                }}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm"
              >
                + Add Slide
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Manage the 5 slides that appear in the hero section. The first slide is typically the main slide with features.
            </p>

            {/* Slides List */}
            <div className="space-y-4">
              {(websiteSettings.heroSection?.slides || []).map((slide, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-gray-700">Slide {index + 1}</h4>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          const newSlides = [...websiteSettings.heroSection.slides]
                          if (index > 0) {
                            [newSlides[index], newSlides[index - 1]] = [newSlides[index - 1], newSlides[index]]
                            setWebsiteSettings({
                              ...websiteSettings,
                              heroSection: {...websiteSettings.heroSection, slides: newSlides}
                            })
                          }
                        }}
                        disabled={index === 0}
                        className="text-gray-600 hover:text-gray-800 disabled:opacity-30"
                        title="Move Up"
                      >
                        ⬆️
                      </button>
                      <button
                        onClick={() => {
                          const newSlides = [...websiteSettings.heroSection.slides]
                          if (index < newSlides.length - 1) {
                            [newSlides[index], newSlides[index + 1]] = [newSlides[index + 1], newSlides[index]]
                            setWebsiteSettings({
                              ...websiteSettings,
                              heroSection: {...websiteSettings.heroSection, slides: newSlides}
                            })
                          }
                        }}
                        disabled={index === websiteSettings.heroSection.slides.length - 1}
                        className="text-gray-600 hover:text-gray-800 disabled:opacity-30"
                        title="Move Down"
                      >
                        ⬇️
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this slide?')) {
                            const newSlides = websiteSettings.heroSection.slides.filter((_, i) => i !== index)
                            setWebsiteSettings({
                              ...websiteSettings,
                              heroSection: {...websiteSettings.heroSection, slides: newSlides}
                            })
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Title</label>
                      <input
                        type="text"
                        value={slide.title || ''}
                        onChange={(e) => {
                          const newSlides = [...websiteSettings.heroSection.slides]
                          newSlides[index].title = e.target.value
                          setWebsiteSettings({
                            ...websiteSettings,
                            heroSection: {...websiteSettings.heroSection, slides: newSlides}
                          })
                        }}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder="Slide title"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Icon/Emoji</label>
                      <input
                        type="text"
                        value={slide.icon || ''}
                        onChange={(e) => {
                          const newSlides = [...websiteSettings.heroSection.slides]
                          newSlides[index].icon = e.target.value
                          setWebsiteSettings({
                            ...websiteSettings,
                            heroSection: {...websiteSettings.heroSection, slides: newSlides}
                          })
                        }}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder="🩺"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Subtitle</label>
                      <input
                        type="text"
                        value={slide.subtitle || ''}
                        onChange={(e) => {
                          const newSlides = [...websiteSettings.heroSection.slides]
                          newSlides[index].subtitle = e.target.value
                          setWebsiteSettings({
                            ...websiteSettings,
                            heroSection: {...websiteSettings.heroSection, slides: newSlides}
                          })
                        }}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder="Slide subtitle"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={slide.description || ''}
                        onChange={(e) => {
                          const newSlides = [...websiteSettings.heroSection.slides]
                          newSlides[index].description = e.target.value
                          setWebsiteSettings({
                            ...websiteSettings,
                            heroSection: {...websiteSettings.heroSection, slides: newSlides}
                          })
                        }}
                        rows={2}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder="Slide description"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Quote (optional)</label>
                      <input
                        type="text"
                        value={slide.quote || ''}
                        onChange={(e) => {
                          const newSlides = [...websiteSettings.heroSection.slides]
                          newSlides[index].quote = e.target.value
                          setWebsiteSettings({
                            ...websiteSettings,
                            heroSection: {...websiteSettings.heroSection, slides: newSlides}
                          })
                        }}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder="Inspirational quote for this slide"
                      />
                    </div>

                    {/* Slide Image Upload */}
                    <div className="md:col-span-2 border-t pt-3 mt-2">
                      <label className="block text-sm font-medium mb-2">Slide Image (Optional)</label>
                      <p className="text-xs text-gray-500 mb-2">Upload an image for this slide. It will be displayed in the hero section.</p>
                      <ImageUploader
                        currentImage={slide.slideImage}
                        onUploadSuccess={(result) => {
                          const url = typeof result === 'string' ? result : result.url
                          const newSlides = [...websiteSettings.heroSection.slides]
                          newSlides[index].slideImage = url
                          setWebsiteSettings({
                            ...websiteSettings,
                            heroSection: {...websiteSettings.heroSection, slides: newSlides}
                          })
                          toast.success('Slide image uploaded successfully')
                        }}
                        label="Upload Slide Image"
                        accept="image/*"
                      />
                      {slide.slideImage && (
                        <div className="mt-2">
                          <img 
                            src={slide.slideImage} 
                            alt="Slide Preview" 
                            className="w-full h-48 object-cover rounded-lg border"
                          />
                          <button
                            onClick={() => {
                              const newSlides = [...websiteSettings.heroSection.slides]
                              newSlides[index].slideImage = ''
                              setWebsiteSettings({
                                ...websiteSettings,
                                heroSection: {...websiteSettings.heroSection, slides: newSlides}
                              })
                            }}
                            className="mt-1 text-red-600 text-sm hover:text-red-700"
                          >
                            Remove Image
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={slide.isMainSlide || false}
                          onChange={(e) => {
                            const newSlides = [...websiteSettings.heroSection.slides]
                            // Uncheck all other slides if this is being checked
                            if (e.target.checked) {
                              newSlides.forEach((s, i) => {
                                s.isMainSlide = i === index
                              })
                            } else {
                              newSlides[index].isMainSlide = false
                            }
                            setWebsiteSettings({
                              ...websiteSettings,
                              heroSection: {...websiteSettings.heroSection, slides: newSlides}
                            })
                          }}
                          className="rounded"
                        />
                        <span className="text-sm font-medium">Main Slide (with features and CTA button)</span>
                      </label>
                    </div>

                    {/* Features for main slide */}
                    {slide.isMainSlide && (
                      <div className="md:col-span-2 border-t pt-3 mt-2">
                        <label className="block text-sm font-medium mb-2">Features (for main slide)</label>
                        <div className="space-y-2">
                          {(slide.features || []).map((feature, fIndex) => (
                            <div key={fIndex} className="flex space-x-2">
                              <input
                                type="text"
                                value={feature.text || ''}
                                onChange={(e) => {
                                  const newSlides = [...websiteSettings.heroSection.slides]
                                  newSlides[index].features[fIndex].text = e.target.value
                                  setWebsiteSettings({
                                    ...websiteSettings,
                                    heroSection: {...websiteSettings.heroSection, slides: newSlides}
                                  })
                                }}
                                className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                placeholder="Feature text"
                              />
                              <button
                                onClick={() => {
                                  const newSlides = [...websiteSettings.heroSection.slides]
                                  newSlides[index].features = newSlides[index].features.filter((_, i) => i !== fIndex)
                                  setWebsiteSettings({
                                    ...websiteSettings,
                                    heroSection: {...websiteSettings.heroSection, slides: newSlides}
                                  })
                                }}
                                className="px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const newSlides = [...websiteSettings.heroSection.slides]
                              if (!newSlides[index].features) newSlides[index].features = []
                              newSlides[index].features.push({ text: '', icon: '✓' })
                              setWebsiteSettings({
                                ...websiteSettings,
                                heroSection: {...websiteSettings.heroSection, slides: newSlides}
                              })
                            }}
                            className="px-3 py-2 bg-purple-100 text-purple-600 rounded hover:bg-purple-200 text-sm"
                          >
                            + Add Feature
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {websiteSettings.heroSection?.slides?.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No slides yet. Click "Add Slide" to create your first slide.
                </div>
              )}
            </div>

            <button
              onClick={() => updateWebsiteSettings({heroSection: websiteSettings.heroSection})}
              disabled={saving}
              className="mt-6 bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save All Slides'}
            </button>
          </div>
        </div>
      )}

      {/* Professional Tiles Management */}
      {activeSubTab === 'tiles' && websiteSettings && (
        <div className="space-y-6">
          {/* Section Settings */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Section Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Section Title</label>
                <input
                  type="text"
                  value={websiteSettings.professionalTiles?.sectionTitle || 'Our Healthcare Professionals'}
                  onChange={(e) => setWebsiteSettings({
                    ...websiteSettings,
                    professionalTiles: {
                      ...websiteSettings.professionalTiles,
                      sectionTitle: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Section Description</label>
                <textarea
                  value={websiteSettings.professionalTiles?.sectionDescription || ''}
                  onChange={(e) => setWebsiteSettings({
                    ...websiteSettings,
                    professionalTiles: {
                      ...websiteSettings.professionalTiles,
                      sectionDescription: e.target.value
                    }
                  })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Tiles Management */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Manage Professional Tiles</h3>
              <button
                onClick={() => {
                  const newTiles = [...(websiteSettings.professionalTiles?.tiles || []), {
                    title: '',
                    description: '',
                    buttonText: 'Consult Now',
                    navigationUrl: '',
                    backgroundImage: '',
                    gradientFrom: 'blue-600',
                    gradientTo: 'indigo-600',
                    icon: 'medical',
                    order: (websiteSettings.professionalTiles?.tiles?.length || 0),
                    isActive: true
                  }]
                  setWebsiteSettings({
                    ...websiteSettings,
                    professionalTiles: {
                      ...websiteSettings.professionalTiles,
                      tiles: newTiles
                    }
                  })
                }}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm"
              >
                + Add Tile
              </button>
            </div>

            {/* Tiles List */}
            <div className="space-y-4">
              {(websiteSettings.professionalTiles?.tiles || []).map((tile, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-gray-700">Tile {index + 1}</h4>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          const newTiles = [...websiteSettings.professionalTiles.tiles]
                          if (index > 0) {
                            [newTiles[index], newTiles[index - 1]] = [newTiles[index - 1], newTiles[index]]
                            setWebsiteSettings({
                              ...websiteSettings,
                              professionalTiles: {...websiteSettings.professionalTiles, tiles: newTiles}
                            })
                          }
                        }}
                        disabled={index === 0}
                        className="text-gray-600 hover:text-gray-800 disabled:opacity-30"
                        title="Move Up"
                      >
                        ⬆️
                      </button>
                      <button
                        onClick={() => {
                          const newTiles = [...websiteSettings.professionalTiles.tiles]
                          if (index < newTiles.length - 1) {
                            [newTiles[index], newTiles[index + 1]] = [newTiles[index + 1], newTiles[index]]
                            setWebsiteSettings({
                              ...websiteSettings,
                              professionalTiles: {...websiteSettings.professionalTiles, tiles: newTiles}
                            })
                          }
                        }}
                        disabled={index === websiteSettings.professionalTiles.tiles.length - 1}
                        className="text-gray-600 hover:text-gray-800 disabled:opacity-30"
                        title="Move Down"
                      >
                        ⬇️
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this tile?')) {
                            const newTiles = websiteSettings.professionalTiles.tiles.filter((_, i) => i !== index)
                            setWebsiteSettings({
                              ...websiteSettings,
                              professionalTiles: {...websiteSettings.professionalTiles, tiles: newTiles}
                            })
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Title</label>
                      <input
                        type="text"
                        value={tile.title || ''}
                        onChange={(e) => {
                          const newTiles = [...websiteSettings.professionalTiles.tiles]
                          newTiles[index].title = e.target.value
                          setWebsiteSettings({
                            ...websiteSettings,
                            professionalTiles: {...websiteSettings.professionalTiles, tiles: newTiles}
                          })
                        }}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder="e.g., Doctors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Button Text</label>
                      <input
                        type="text"
                        value={tile.buttonText || ''}
                        onChange={(e) => {
                          const newTiles = [...websiteSettings.professionalTiles.tiles]
                          newTiles[index].buttonText = e.target.value
                          setWebsiteSettings({
                            ...websiteSettings,
                            professionalTiles: {...websiteSettings.professionalTiles, tiles: newTiles}
                          })
                        }}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder="e.g., Consult Doctors"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={tile.description || ''}
                        onChange={(e) => {
                          const newTiles = [...websiteSettings.professionalTiles.tiles]
                          newTiles[index].description = e.target.value
                          setWebsiteSettings({
                            ...websiteSettings,
                            professionalTiles: {...websiteSettings.professionalTiles, tiles: newTiles}
                          })
                        }}
                        rows={2}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder="Brief description of the service"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Navigation URL</label>
                      <input
                        type="text"
                        value={tile.navigationUrl || ''}
                        onChange={(e) => {
                          const newTiles = [...websiteSettings.professionalTiles.tiles]
                          newTiles[index].navigationUrl = e.target.value
                          setWebsiteSettings({
                            ...websiteSettings,
                            professionalTiles: {...websiteSettings.professionalTiles, tiles: newTiles}
                          })
                        }}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder="/doctors or /pharmacists"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Icon Type</label>
                      <select
                        value={tile.icon || 'medical'}
                        onChange={(e) => {
                          const newTiles = [...websiteSettings.professionalTiles.tiles]
                          newTiles[index].icon = e.target.value
                          setWebsiteSettings({
                            ...websiteSettings,
                            professionalTiles: {...websiteSettings.professionalTiles, tiles: newTiles}
                          })
                        }}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      >
                        <option value="medical">Medical/Doctor</option>
                        <option value="pharmacy">Pharmacy</option>
                        <option value="nutrition">Nutrition/Book</option>
                        <option value="location">Location/Hospital</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Gradient From</label>
                      <input
                        type="text"
                        value={tile.gradientFrom || ''}
                        onChange={(e) => {
                          const newTiles = [...websiteSettings.professionalTiles.tiles]
                          newTiles[index].gradientFrom = e.target.value
                          setWebsiteSettings({
                            ...websiteSettings,
                            professionalTiles: {...websiteSettings.professionalTiles, tiles: newTiles}
                          })
                        }}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder="e.g., blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Gradient To</label>
                      <input
                        type="text"
                        value={tile.gradientTo || ''}
                        onChange={(e) => {
                          const newTiles = [...websiteSettings.professionalTiles.tiles]
                          newTiles[index].gradientTo = e.target.value
                          setWebsiteSettings({
                            ...websiteSettings,
                            professionalTiles: {...websiteSettings.professionalTiles, tiles: newTiles}
                          })
                        }}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder="e.g., indigo-600"
                      />
                    </div>

                    {/* Background Image Upload */}
                    <div className="md:col-span-2 border-t pt-3 mt-2">
                      <label className="block text-sm font-medium mb-2">Background Image (Optional)</label>
                      <p className="text-xs text-gray-500 mb-2">Upload a background image for this tile. If provided, it will overlay the gradient.</p>
                      <ImageUploader
                        currentImage={tile.backgroundImage}
                        onUploadSuccess={(result) => {
                          const url = typeof result === 'string' ? result : result.url
                          const newTiles = [...websiteSettings.professionalTiles.tiles]
                          newTiles[index].backgroundImage = url
                          setWebsiteSettings({
                            ...websiteSettings,
                            professionalTiles: {...websiteSettings.professionalTiles, tiles: newTiles}
                          })
                          toast.success('Tile background image uploaded successfully')
                        }}
                        label="Upload Background"
                        accept="image/*"
                      />
                      {tile.backgroundImage && (
                        <div className="mt-2">
                          <img 
                            src={tile.backgroundImage} 
                            alt="Tile Background Preview" 
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <button
                            onClick={() => {
                              const newTiles = [...websiteSettings.professionalTiles.tiles]
                              newTiles[index].backgroundImage = ''
                              setWebsiteSettings({
                                ...websiteSettings,
                                professionalTiles: {...websiteSettings.professionalTiles, tiles: newTiles}
                              })
                            }}
                            className="mt-1 text-red-600 text-sm hover:text-red-700"
                          >
                            Remove Image
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={tile.isActive !== false}
                          onChange={(e) => {
                            const newTiles = [...websiteSettings.professionalTiles.tiles]
                            newTiles[index].isActive = e.target.checked
                            setWebsiteSettings({
                              ...websiteSettings,
                              professionalTiles: {...websiteSettings.professionalTiles, tiles: newTiles}
                            })
                          }}
                          className="rounded"
                        />
                        <span className="text-sm font-medium">Active (show on homepage)</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}

              {(websiteSettings.professionalTiles?.tiles?.length === 0 || !websiteSettings.professionalTiles?.tiles) && (
                <div className="text-center py-8 text-gray-500">
                  No tiles yet. Click "Add Tile" to create your first professional tile.
                </div>
              )}
            </div>

            <button
              onClick={() => updateWebsiteSettings({professionalTiles: websiteSettings.professionalTiles})}
              disabled={saving}
              className="mt-6 bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Professional Tiles'}
            </button>
          </div>
        </div>
      )}

      {/* FAQs Management */}
      {activeSubTab === 'faqs' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">
              {editingFaq ? 'Edit FAQ' : 'Add New FAQ'}
            </h3>
            <form onSubmit={handleFaqSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Question</label>
                <input
                  type="text"
                  value={faqForm.question}
                  onChange={(e) => setFaqForm({...faqForm, question: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Answer</label>
                <textarea
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm({...faqForm, answer: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <select
                    value={faqForm.category}
                    onChange={(e) => setFaqForm({...faqForm, category: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="general">General</option>
                    <option value="booking">Booking</option>
                    <option value="payment">Payment</option>
                    <option value="consultation">Consultation</option>
                    <option value="technical">Technical</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Order</label>
                  <input
                    type="number"
                    value={faqForm.order}
                    onChange={(e) => setFaqForm({...faqForm, order: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editingFaq ? 'Update FAQ' : 'Add FAQ')}
                </button>
                {editingFaq && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFaq(null)
                      setFaqForm({ question: '', answer: '', category: 'general', order: 0 })
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Existing FAQs</h3>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div key={faq._id} className="border rounded p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">{faq.question}</h4>
                      <p className="text-gray-600 text-sm mt-1">{faq.answer.substring(0, 100)}...</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{faq.category}</span>
                        <span className="text-xs text-gray-500">Order: {faq.order}</span>
                        <span className={`text-xs px-2 py-1 rounded ${faq.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {faq.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => {
                          setEditingFaq(faq)
                          setFaqForm({
                            question: faq.question,
                            answer: faq.answer,
                            category: faq.category,
                            order: faq.order
                          })
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteFaq(faq._id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Customer Services Management */}
      {activeSubTab === 'services' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">
              {editingService ? 'Edit Service' : 'Add New Service'}
            </h3>
            <form onSubmit={handleServiceSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={serviceForm.title}
                    onChange={(e) => setServiceForm({...serviceForm, title: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Icon</label>
                  <input
                    type="text"
                    value={serviceForm.icon}
                    onChange={(e) => setServiceForm({...serviceForm, icon: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="📞"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({...serviceForm, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Contact Method</label>
                  <select
                    value={serviceForm.contactMethod}
                    onChange={(e) => setServiceForm({...serviceForm, contactMethod: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="phone">Phone</option>
                    <option value="email">Email</option>
                    <option value="chat">Chat</option>
                    <option value="form">Form</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Contact Value</label>
                  <input
                    type="text"
                    value={serviceForm.contactValue}
                    onChange={(e) => setServiceForm({...serviceForm, contactValue: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Phone number, email, URL, etc."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Working Hours</label>
                  <input
                    type="text"
                    value={serviceForm.workingHours}
                    onChange={(e) => setServiceForm({...serviceForm, workingHours: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Order</label>
                <input
                  type="number"
                  value={serviceForm.order}
                  onChange={(e) => setServiceForm({...serviceForm, order: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editingService ? 'Update Service' : 'Add Service')}
                </button>
                {editingService && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingService(null)
                      setServiceForm({
                        title: '', description: '', icon: '📞', contactMethod: 'phone',
                        contactValue: '', workingHours: '24/7', order: 0
                      })
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Existing Services</h3>
            <div className="space-y-4">
              {customerServices.map((service) => (
                <div key={service._id} className="border rounded p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-xl mr-2">{service.icon}</span>
                        <h4 className="font-medium">{service.title}</h4>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{service.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Method: {service.contactMethod}</span>
                        <span>Value: {service.contactValue}</span>
                        <span>Hours: {service.workingHours}</span>
                        <span>Order: {service.order}</span>
                        <span className={`px-2 py-1 rounded ${service.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {service.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => {
                          setEditingService(service)
                          setServiceForm({
                            title: service.title,
                            description: service.description,
                            icon: service.icon,
                            contactMethod: service.contactMethod,
                            contactValue: service.contactValue,
                            workingHours: service.workingHours,
                            order: service.order
                          })
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteService(service._id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legal Pages Management */}
      {activeSubTab === 'legal' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">
              {editingLegalPage ? `Edit ${editingLegalPage.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}` : 'Legal Pages Management'}
            </h3>
            
            {editingLegalPage ? (
              <form onSubmit={handleLegalPageSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Page Type</label>
                  <input
                    type="text"
                    value={editingLegalPage.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    disabled
                    className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={legalForm.title}
                    onChange={(e) => setLegalForm({...legalForm, title: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Content</label>
                  <textarea
                    value={legalForm.content}
                    onChange={(e) => setLegalForm({...legalForm, content: e.target.value})}
                    rows={15}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter the legal page content. You can use HTML tags for formatting."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tip: You can use HTML tags like &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, etc. for formatting.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Version</label>
                  <input
                    type="text"
                    value={legalForm.version}
                    onChange={(e) => setLegalForm({...legalForm, version: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., 1.0, 2.1, etc."
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Update Legal Page'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLegalPage(null)
                      setLegalForm({ title: '', content: '', version: '1.0' })
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">Select a legal page below to edit its content.</p>
                <p className="text-sm text-gray-500">
                  Legal pages are automatically created when you first edit them. They will be visible to users once activated.
                </p>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Available Legal Pages</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['privacy-policy', 'terms-and-conditions', 'refund-policy', 'disclaimer'].map((pageType) => {
                const existingPage = legalPages.find(page => page.pageType === pageType)
                return (
                  <div key={pageType} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-lg">
                          {pageType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h4>
                        {existingPage ? (
                          <div className="text-sm text-gray-600 mt-1">
                            <p>Last updated: {new Date(existingPage.lastUpdated).toLocaleDateString()}</p>
                            <p>Version: {existingPage.version}</p>
                            {existingPage.updatedBy && (
                              <p>By: {existingPage.updatedBy.name}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 mt-1">Not created yet</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        {existingPage && (
                          <button
                            onClick={() => toggleLegalPageStatus(pageType)}
                            className={`text-xs px-3 py-1 rounded-full font-medium ${
                              existingPage.isActive 
                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            {existingPage.isActive ? '✓ Active' : '✗ Inactive'}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {existingPage && existingPage.content && (
                      <div className="bg-gray-50 p-3 rounded mb-3">
                        <p className="text-sm text-gray-700">
                          {existingPage.content.substring(0, 150)}...
                        </p>
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingLegalPage(pageType)
                          if (existingPage) {
                            setLegalForm({
                              title: existingPage.title,
                              content: existingPage.content,
                              version: existingPage.version
                            })
                          } else {
                            setLegalForm({
                              title: pageType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                              content: '',
                              version: '1.0'
                            })
                          }
                        }}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        {existingPage ? 'Edit' : 'Create'}
                      </button>
                      {existingPage && (
                        <a
                          href={`/${pageType}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                        >
                          Preview
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// User Management Tab Component
function UserManagementTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [suspensionForm, setSuspensionForm] = useState({
    reason: '',
    notes: ''
  })
  const [showSuspensionModal, setShowSuspensionModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsers(res.data)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching users:', err)
      toast.error('Failed to fetch users')
      setLoading(false)
    }
  }

  const handleSuspendUser = async () => {
    if (!selectedUser || !suspensionForm.reason.trim()) {
      toast.error('Please provide a suspension reason')
      return
    }

    setActionLoading(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/users/${selectedUser._id}/suspend`,
        {
          reason: suspensionForm.reason,
          notes: suspensionForm.notes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      toast.success('User suspended successfully')
      setShowSuspensionModal(false)
      setSuspensionForm({ reason: '', notes: '' })
      setSelectedUser(null)
      fetchUsers()
    } catch (err) {
      console.error('Error suspending user:', err)
      toast.error(err.response?.data?.message || 'Failed to suspend user')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnsuspendUser = async (userId) => {
    if (!window.confirm('Are you sure you want to unsuspend this user?')) return

    setActionLoading(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/users/${userId}/unsuspend`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )

      toast.success('User unsuspended successfully')
      fetchUsers()
    } catch (err) {
      console.error('Error unsuspending user:', err)
      toast.error(err.response?.data?.message || 'Failed to unsuspend user')
    } finally {
      setActionLoading(false)
    }
  }

  const openSuspensionModal = (user) => {
    setSelectedUser(user)
    setShowSuspensionModal(true)
    setSuspensionForm({ reason: '', notes: '' })
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading users...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h2 className="text-xl font-bold">User Management</h2>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="patient">Patients</option>
            <option value="pharmacist">Pharmacists</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Mobile Card View */}
        <div className="md:hidden">
          {filteredUsers.map((user) => (
            <div key={user._id} className="border-b border-gray-200 p-4">
              <div className="flex items-start space-x-3">
                <img
                  className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                  src={user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=48`}
                  alt={user.name}
                  onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=48` }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{user.name}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'pharmacist' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  {user.phone && (
                    <p className="text-xs text-gray-400">{user.phone}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.isSuspended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {user.isSuspended ? 'Suspended' : 'Active'}
                    </span>
                    <div className="flex space-x-2">
                      {user.role !== 'admin' && (
                        <>
                          {user.isSuspended ? (
                            <button
                              onClick={() => handleUnsuspendUser(user._id)}
                              disabled={actionLoading}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50 text-sm"
                            >
                              Unsuspend
                            </button>
                          ) : (
                            <button
                              onClick={() => openSuspensionModal(user)}
                              disabled={actionLoading}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50 text-sm"
                            >
                              Suspend
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => {/* TODO: View user details */}}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                  {user.isSuspended && (
                    <div className="mt-2 text-xs text-gray-500">
                      <div>Since: {new Date(user.suspendedAt).toLocaleDateString()}</div>
                      {user.suspendedBy && (
                        <div>By: {user.suspendedBy.name}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img
                          className="h-10 w-10 rounded-full object-cover"
                          src={user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=40`}
                          alt={user.name}
                          onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=40` }}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        {user.phone && (
                          <div className="text-xs text-gray-400">{user.phone}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'pharmacist' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isSuspended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {user.isSuspended ? 'Suspended' : 'Active'}
                      </span>
                      {user.isSuspended && (
                        <div className="mt-1 text-xs text-gray-500">
                          <div>Since: {new Date(user.suspendedAt).toLocaleDateString()}</div>
                          {user.suspendedBy && (
                            <div>By: {user.suspendedBy.name}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {user.role !== 'admin' && (
                        <>
                          {user.isSuspended ? (
                            <button
                              onClick={() => handleUnsuspendUser(user._id)}
                              disabled={actionLoading}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            >
                              Unsuspend
                            </button>
                          ) : (
                            <button
                              onClick={() => openSuspensionModal(user)}
                              disabled={actionLoading}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              Suspend
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => {/* TODO: View user details */}}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No users found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Suspension Modal */}
      {showSuspensionModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Suspend User
                </h3>
                <button
                  onClick={() => setShowSuspensionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded">
                <div className="flex items-center">
                  <img
                    className="h-10 w-10 rounded-full object-cover"
                    src={selectedUser.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name)}&size=40`}
                    alt={selectedUser.name}
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{selectedUser.name}</div>
                    <div className="text-sm text-gray-500">{selectedUser.email}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Suspension Reason *
                  </label>
                  <select
                    value={suspensionForm.reason}
                    onChange={(e) => setSuspensionForm({...suspensionForm, reason: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  >
                    <option value="">Select a reason...</option>
                    <option value="Violation of Terms of Service">Violation of Terms of Service</option>
                    <option value="Inappropriate Behavior">Inappropriate Behavior</option>
                    <option value="Spam or Abuse">Spam or Abuse</option>
                    <option value="Fraudulent Activity">Fraudulent Activity</option>
                    <option value="Multiple Policy Violations">Multiple Policy Violations</option>
                    <option value="Security Concerns">Security Concerns</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={suspensionForm.notes}
                    onChange={(e) => setSuspensionForm({...suspensionForm, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Additional details about the suspension..."
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
                <button
                  onClick={() => setShowSuspensionModal(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSuspendUser}
                  disabled={actionLoading || !suspensionForm.reason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Suspending...' : 'Suspend User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Subscription Management Tab Component
function SubscriptionManagementTab() {
  const [subscriptions, setSubscriptions] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')

  useEffect(() => {
    fetchSubscriptionData()
  }, [])

  const fetchSubscriptionData = async () => {
    try {
      const token = localStorage.getItem('token')
      const [subscriptionsRes, analyticsRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/subscriptions/admin/all`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/subscriptions/admin/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      
      setSubscriptions(subscriptionsRes.data.subscriptions)
      setAnalytics(analyticsRes.data.analytics)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching subscription data:', err)
      toast.error('Failed to load subscription data')
      setLoading(false)
    }
  }

  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = subscription.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subscription.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subscription.planName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || subscription.status === statusFilter
    const matchesPlan = planFilter === 'all' || subscription.planType === planFilter
    return matchesSearch && matchesStatus && matchesPlan
  })

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <p className="mt-2 text-gray-600">Loading subscription data...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h2 className="text-2xl font-bold">💳 Subscription Management</h2>
        <button
          onClick={fetchSubscriptionData}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center space-x-2"
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Subscriptions</p>
                <p className="text-4xl font-bold mt-2">{analytics.totalSubscriptions}</p>
              </div>
              <div className="bg-white bg-opacity-20 p-3 rounded-full">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-lg shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Active Subscriptions</p>
                <p className="text-4xl font-bold mt-2">{analytics.activeSubscriptions}</p>
              </div>
              <div className="bg-white bg-opacity-20 p-3 rounded-full">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Revenue</p>
                <p className="text-4xl font-bold mt-2">₹{(analytics.revenue?.totalRecurring || analytics.revenue?.total || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white bg-opacity-20 p-3 rounded-full">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-6 rounded-lg shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Conversion Rate</p>
                <p className="text-4xl font-bold mt-2">
                  {analytics.totalSubscriptions > 0 
                    ? Math.round((analytics.activeSubscriptions / analytics.totalSubscriptions) * 100)
                    : 0}%
                </p>
              </div>
              <div className="bg-white bg-opacity-20 p-3 rounded-full">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Breakdown */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Plan Distribution</h3>
            <div className="space-y-3">
              {[
                { label: "Women's Care", key: 'womensCare', color: 'bg-pink-500' },
                { label: 'Chronic Care',  key: 'chronic',    color: 'bg-blue-500' },
                { label: 'Fat to Fit',    key: 'fatToFit',   color: 'bg-purple-500' },
                { label: 'Essential',     key: 'essential',  color: 'bg-teal-500' },
                { label: 'Family',        key: 'family',     color: 'bg-orange-500' },
              ].map(({ label, key, color }) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-gray-600">{label}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`${color} h-2 rounded-full`}
                        style={{ width: `${analytics.activeSubscriptions > 0 ? ((analytics.planBreakdown[key] || 0) / analytics.activeSubscriptions) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="font-semibold">{analytics.planBreakdown[key] || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Billing Cycle Distribution</h3>
            <div className="space-y-3">
              {[
                { label: '3 Months',  key: 'threeMonths',  color: 'bg-green-500' },
                { label: '6 Months',  key: 'sixMonths',    color: 'bg-yellow-500' },
                { label: '12 Months', key: 'twelveMonths', color: 'bg-orange-500' },
              ].map(({ label, key, color }) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-gray-600">{label}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`${color} h-2 rounded-full`}
                        style={{ width: `${analytics.activeSubscriptions > 0 ? ((analytics.billingBreakdown[key] || 0) / analytics.activeSubscriptions) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="font-semibold">{analytics.billingBreakdown[key] || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search subscriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type</label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Plans</option>
              <option value="womensCare">Women's Care</option>
              <option value="chronic">Chronic Care</option>
              <option value="fatToFit">Fat to Fit</option>
              <option value="essential">Essential</option>
              <option value="family">Family</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setPlanFilter('all')
              }}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Subscriptions List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium">
            Subscriptions ({filteredSubscriptions.length} of {subscriptions.length})
          </h3>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {filteredSubscriptions.map((subscription) => (
            <div key={subscription._id} className="border-b border-gray-200 p-4">
              <div className="flex items-start space-x-3">
                <img
                  className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                  src={subscription.userId?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(subscription.userId?.name || 'User')}&size=48`}
                  alt={subscription.userId?.name}
                  onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(subscription.userId?.name || 'User')}&size=48` }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {subscription.userId?.name}
                    </h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                      subscription.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      subscription.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {subscription.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{subscription.userId?.email}</p>
                  <div className="mt-2">
                    <p className="text-sm font-medium text-purple-600">{subscription.planName}</p>
                    <p className="text-xs text-gray-500">
                      ₹{subscription.price}/{subscription.billingCycle}
                    </p>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div>Sessions: {subscription.sessionsUsed}/{subscription.sessionsLimit}</div>
                    {subscription.doctorConsultationsLimit > 0 && (
                      <div>Doctor: {subscription.doctorConsultationsUsed}/{subscription.doctorConsultationsLimit}</div>
                    )}
                    {subscription.nutritionistConsultationsLimit > 0 && (
                      <div>Nutritionist: {subscription.nutritionistConsultationsUsed}/{subscription.nutritionistConsultationsLimit}</div>
                    )}
                    <div>Started: {new Date(subscription.startDate).toLocaleDateString()}</div>
                    <div>Next: {new Date(subscription.nextBillingDate).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Billing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dates
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubscriptions.map((subscription) => (
                <tr key={subscription._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img
                          className="h-10 w-10 rounded-full object-cover"
                          src={subscription.userId?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(subscription.userId?.name || 'User')}&size=40`}
                          alt={subscription.userId?.name}
                          onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(subscription.userId?.name || 'User')}&size=40` }}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {subscription.userId?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {subscription.userId?.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {subscription.planName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {subscription.planType} • {subscription.billingCycle}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                      subscription.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      subscription.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {subscription.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>Sessions: {subscription.sessionsUsed}/{subscription.sessionsLimit}</div>
                    {subscription.doctorConsultationsLimit > 0 && (
                      <div className="text-xs text-gray-500">
                        Doctor: {subscription.doctorConsultationsUsed}/{subscription.doctorConsultationsLimit}
                      </div>
                    )}
                    {subscription.nutritionistConsultationsLimit > 0 && (
                      <div className="text-xs text-gray-500">
                        Nutritionist: {subscription.nutritionistConsultationsUsed}/{subscription.nutritionistConsultationsLimit}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>₹{subscription.price}</div>
                    <div className="text-xs text-gray-500">per {subscription.billingCycle}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>Started: {new Date(subscription.startDate).toLocaleDateString()}</div>
                    <div>Next: {new Date(subscription.nextBillingDate).toLocaleDateString()}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSubscriptions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No subscriptions found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Add Doctor Tab Component
function AddDoctorTab({ onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    specialization: '',
    qualification: '',
    experience: '',
    description: '',
    photo: '',
    consultationFee: '500',
    licenseNumber: ''
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [generatedCredentials, setGeneratedCredentials] = useState(null)

  const handleImageUpload = (data) => {
    setFormData(prev => ({...prev, photo: data.url}))
    setMessage('Profile picture uploaded successfully!')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')

    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/doctors`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setMessage('Doctor created successfully!')
      setGeneratedCredentials({
        email: formData.email,
        password: formData.password
      })
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        specialization: '',
        qualification: '',
        experience: '',
        description: '',
        photo: '',
        consultationFee: '500',
        licenseNumber: ''
      })
      
      onSuccess()
    } catch (err) {
      console.error('Error creating doctor:', err)
      setError(err.response?.data?.message || 'Failed to create doctor')
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Add New Doctor</h2>
      
      {message && (
        <div className="bg-green-100 text-green-700 p-4 rounded mb-4">
          {message}
          {generatedCredentials && (
            <div className="mt-2 p-3 bg-white rounded">
              <p className="font-semibold">Login Credentials:</p>
              <p>Email: <code className="bg-gray-100 px-2 py-1 rounded">{generatedCredentials.email}</code></p>
              <p>Password: <code className="bg-gray-100 px-2 py-1 rounded">{generatedCredentials.password}</code></p>
              <p className="text-sm text-gray-600 mt-2">⚠️ Save these credentials! They won't be shown again.</p>
            </div>
          )}
        </div>
      )}
      
      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Profile Picture Upload */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <ImageUploader 
            onUploadSuccess={handleImageUpload}
            uploadType="prescription"
            currentImage={formData.photo}
            label="Profile Picture (Optional)"
          />
          {formData.photo && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
              <p className="text-green-700 font-medium">✓ Profile picture ready</p>
              <p className="text-xs text-gray-600 truncate">{formData.photo}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">Name *</label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Email/Username *</label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Password *</label>
            <input
              type="password"
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Phone</label>
            <input
              type="tel"
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Specialization *</label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="e.g., Cardiology, Dermatology"
              value={formData.specialization}
              onChange={(e) => setFormData({...formData, specialization: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Qualification *</label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="e.g., MBBS, MD"
              value={formData.qualification}
              onChange={(e) => setFormData({...formData, qualification: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Experience (Years) *</label>
            <input
              type="number"
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.experience}
              onChange={(e) => setFormData({...formData, experience: e.target.value})}
              required
              min="0"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">License Number *</label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Medical License Number"
              value={formData.licenseNumber}
              onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Consultation Fee (₹)</label>
            <input
              type="number"
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.consultationFee}
              onChange={(e) => setFormData({...formData, consultationFee: e.target.value})}
              min="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Description</label>
          <textarea
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="Brief description about the doctor..."
            rows="3"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Create Doctor
        </button>
      </form>
    </div>
  )
}

// Manage Doctors Tab Component
function ManageDoctorsTab({ onUpdate }) {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingDoctor, setEditingDoctor] = useState(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    fetchDoctors()
  }, [])

  const fetchDoctors = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/doctors`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setDoctors(res.data)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching doctors:', err)
      setLoading(false)
    }
  }

  const handleToggleStatus = async (doctorId, currentAdminDisabled) => {
    try {
      const token = localStorage.getItem('token')
      const newAdminDisabled = !currentAdminDisabled
      
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/doctors/${doctorId}/status`,
        { adminDisabled: newAdminDisabled },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      fetchDoctors()
      toast.success(`Doctor bookings ${newAdminDisabled ? 'disabled' : 'enabled'} successfully`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to update booking status')
    }
  }

  const handleToggleCoreTeam = async (doctorId, current) => {
    try {
      const token = localStorage.getItem('token')
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/doctors/${doctorId}/core-team`,
        { coreTeam: !current },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchDoctors()
      toast.success(`Doctor ${!current ? 'added to' : 'removed from'} Core Team`)
    } catch (err) {
      toast.error('Failed to update core team status')
    }
  }

  const handleEdit = (doctor) => {
    setEditingDoctor(doctor._id)
    setEditForm({
      specialization: doctor.specialization,
      qualification: doctor.qualification,
      experience: doctor.experience,
      description: doctor.description || '',
      status: doctor.status,
      photo: doctor.photo || '',
      consultationFee: doctor.consultationFee,
      licenseNumber: doctor.licenseNumber
    })
  }

  const handlePhotoUpload = (data) => {
    setEditForm(prev => ({...prev, photo: data.url}))
  }

  const handleSaveEdit = async (doctorId) => {
    try {
      const token = localStorage.getItem('token')
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/doctors/${doctorId}`,
        editForm,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setEditingDoctor(null)
      fetchDoctors()
      toast.success('Doctor updated successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to update doctor')
    }
  }

  const handleDelete = async (doctorId, name) => {
    if (!window.confirm(`Are you sure you want to delete Dr. ${name}?`)) return
    
    try {
      const token = localStorage.getItem('token')
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/doctors/${doctorId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      fetchDoctors()
      toast.success('Doctor deleted successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete doctor')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading doctors...</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Manage Doctors</h2>
      
      <div className="space-y-6">
        {doctors.map(doctor => (
          <div key={doctor._id} className="bg-white border rounded-lg p-4">
            {editingDoctor === doctor._id ? (
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ImageUploader 
                    onUploadSuccess={handlePhotoUpload}
                    uploadType="prescription"
                    currentImage={editForm.photo}
                    label="Update Profile Picture"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Specialization"
                    value={editForm.specialization}
                    onChange={(e) => setEditForm({...editForm, specialization: e.target.value})}
                  />
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Qualification"
                    value={editForm.qualification}
                    onChange={(e) => setEditForm({...editForm, qualification: e.target.value})}
                  />
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Experience (Years)"
                    value={editForm.experience}
                    onChange={(e) => setEditForm({...editForm, experience: e.target.value})}
                  />
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Consultation Fee"
                    value={editForm.consultationFee}
                    onChange={(e) => setEditForm({...editForm, consultationFee: e.target.value})}
                  />
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded"
                    placeholder="License Number"
                    value={editForm.licenseNumber}
                    onChange={(e) => setEditForm({...editForm, licenseNumber: e.target.value})}
                  />
                </div>
                <textarea
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Description"
                  rows="2"
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleSaveEdit(doctor._id)}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingDoctor(null)}
                    className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-start space-x-3">
                    <img 
                      src={doctor.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.userId?.name || 'Doctor')}&size=80`}
                      alt={doctor.userId?.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                      onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.userId?.name || 'Doctor')}&size=80` }}
                    />
                    <div>
                      <h3 className="font-semibold text-lg">Dr. {doctor.userId?.name}</h3>
                      <p className="text-sm text-gray-600">{doctor.userId?.email}</p>
                      <p className="text-sm text-blue-600">{doctor.specialization}</p>
                      <p className="text-sm text-gray-500">{doctor.qualification} • {doctor.experience} years exp</p>
                      <p className="text-sm text-green-600">₹{doctor.consultationFee} consultation fee</p>
                      {doctor.description && (
                        <p className="text-sm text-gray-500 mt-1">{doctor.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-wrap gap-2">
                    <button
                      onClick={() => handleToggleStatus(doctor._id, doctor.adminDisabled)}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        doctor.adminDisabled
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {doctor.adminDisabled ? '🔴 Bookings Disabled' : '🟢 Bookings Enabled'}
                    </button>
                    <button
                      onClick={() => handleToggleCoreTeam(doctor._id, doctor.coreTeam)}
                      className={`px-3 py-1 rounded text-sm font-medium border ${
                        doctor.coreTeam
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                          : 'bg-gray-100 text-gray-500 border-gray-300'
                      }`}
                    >
                      {doctor.coreTeam ? '⭐ Core Team' : '☆ Core Team'}
                    </button>
                  </div>
                </div>
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={() => handleEdit(doctor)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(doctor._id, doctor.userId?.name)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {doctors.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No doctors found. Add some doctors to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Doctor Payments Tab Component
function DoctorPaymentsTab() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedBookings, setSelectedBookings] = useState([])
  const [message, setMessage] = useState('')
  const [adminRevenue, setAdminRevenue] = useState({
    totalRevenue: 0,
    platformShare: 0,
    doctorShare: 0,
    totalBookings: 0
  })

  useEffect(() => {
    fetchDoctorPayments()
  }, [])

  const fetchDoctorPayments = async () => {
    try {
      const token = localStorage.getItem('token')

      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/doctor-payments`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setPayments(res.data)
      
      // Calculate admin revenue (100% of patient payments)
      const totalRevenue = res.data.reduce((sum, p) => sum + (p.totalEarned / 0.7), 0) // totalEarned is 70%, so /0.7 for 100%
      const doctorShare = res.data.reduce((sum, p) => sum + p.totalEarned, 0)
      const platformShare = totalRevenue - doctorShare
      const totalBookings = res.data.reduce((sum, p) => sum + p.completedBookings, 0)

      setAdminRevenue({
        totalRevenue,
        platformShare,
        doctorShare,
        totalBookings
      })
      
      setLoading(false)
    } catch (err) {
      console.error('Error fetching doctor payments:', err)
      console.error('Error details:', err.response?.data || err.message)
      setError(err.response?.data?.message || err.message || 'Failed to load doctor payment data')
      setLoading(false)
    }
  }

  const handleMarkAsPaid = async (doctorId, bookingIds) => {
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/mark-doctor-payment-done`,
        { bookingIds },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setMessage('Doctor payment marked as done successfully!')
      toast.success('Doctor payment marked as done successfully!')
      setSelectedBookings([])
      fetchDoctorPayments()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error(err)
      toast.error('Failed to mark doctor payment as done')
    }
  }

  const exportToCSV = () => {
    const headers = ['Doctor Name', 'Total Earned', 'Total Paid', 'Outstanding', 'Completed Consultations', 'Unpaid Bookings']
    const rows = payments.map(p => [
      p.name,
      p.totalEarned,
      p.totalPaid,
      p.outstanding,
      p.completedBookings,
      p.unpaidBookings.length
    ])
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `doctor-payments-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
        <p className="mt-2 text-gray-600">Loading doctor payment data...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">💰 Doctor Payment Management</h2>
        <button
          onClick={exportToCSV}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          <p className="font-semibold">Error loading doctor payment data:</p>
          <p>{error}</p>
          <button 
            onClick={fetchDoctorPayments}
            className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}
      
      {message && (
        <div className="bg-green-100 text-green-700 p-4 rounded mb-4">
          {message}
        </div>
      )}

      {/* Admin Revenue Overview - Shows 100% of payments */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg shadow-lg mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Platform Revenue Overview (Doctors)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium">Total Revenue (100%)</p>
            <p className="text-3xl font-bold text-blue-600">₹{adminRevenue.totalRevenue}</p>
            <p className="text-xs text-gray-500 mt-1">{adminRevenue.totalBookings} consultations</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium">Platform Share (30%)</p>
            <p className="text-3xl font-bold text-green-600">₹{adminRevenue.platformShare}</p>
            <p className="text-xs text-gray-500 mt-1">Your earnings</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium">Doctor Share (70%)</p>
            <p className="text-3xl font-bold text-orange-600">₹{adminRevenue.doctorShare}</p>
            <p className="text-xs text-gray-500 mt-1">To be paid out</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium">Per Consultation</p>
            <p className="text-3xl font-bold text-purple-600">Dynamic</p>
            <p className="text-xs text-gray-500 mt-1">Based on doctor's fee</p>
          </div>
        </div>

        {/* Revenue Progress Bar - Shows 100% */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-700">Revenue Distribution</p>
            <p className="text-sm text-gray-600">100% Collected</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden flex">
            <div 
              className="bg-gradient-to-r from-green-500 to-green-600 h-8 flex items-center justify-center text-white text-sm font-bold"
              style={{ width: '30%' }}
            >
              Platform: ₹{adminRevenue.platformShare}
            </div>
            <div 
              className="bg-gradient-to-r from-orange-400 to-orange-500 h-8 flex items-center justify-center text-white text-sm font-bold"
              style={{ width: '70%' }}
            >
              Doctors: ₹{adminRevenue.doctorShare}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Platform Revenue: 30%</span>
            <span>Doctor Payouts: 70%</span>
          </div>
        </div>
      </div>

      {/* Doctor Payment Management */}
      <h3 className="text-xl font-bold mb-4">Doctor Payment Management</h3>
      <div className="space-y-6">
        {payments.map((payment) => (
          <div key={payment.doctorId} className="bg-white border rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">Dr. {payment.name}</h3>
                <p className="text-sm text-gray-600">{payment.email}</p>
                <p className="text-sm text-gray-600">{payment.completedBookings} completed consultations</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">₹{payment.totalEarned}</p>
                <p className="text-xs text-gray-500">Total Earned</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-green-50 p-3 rounded">
                <p className="text-xs text-green-600 font-medium">Paid</p>
                <p className="text-xl font-bold text-green-700">₹{payment.totalPaid}</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded">
                <p className="text-xs text-yellow-600 font-medium">Outstanding</p>
                <p className="text-xl font-bold text-yellow-700">₹{payment.outstanding}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-xs text-blue-600 font-medium">Unpaid Consultations</p>
                <p className="text-xl font-bold text-blue-700">{payment.unpaidBookings.length}</p>
              </div>
            </div>

            {payment.unpaidBookings.length > 0 && (
              <div className="border-t pt-4">
                <p className="font-medium mb-2">Unpaid Consultations:</p>
                <div className="space-y-2 mb-3">
                  {payment.unpaidBookings.map((booking) => (
                    <div key={booking.bookingId} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedBookings.includes(booking.bookingId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBookings([...selectedBookings, booking.bookingId])
                            } else {
                              setSelectedBookings(selectedBookings.filter(id => id !== booking.bookingId))
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <div>
                          <p className="text-sm font-medium">{booking.patientName}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(booking.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-green-600">₹{booking.amount}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const bookingIds = payment.unpaidBookings
                      .filter(b => selectedBookings.includes(b.bookingId))
                      .map(b => b.bookingId)
                    if (bookingIds.length > 0) {
                      handleMarkAsPaid(payment.doctorId, bookingIds)
                    } else {
                      toast.warning('Please select consultations to mark as paid')
                    }
                  }}
                  disabled={selectedBookings.length === 0}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                  Mark Selected as Paid ({selectedBookings.filter(id => 
                    payment.unpaidBookings.some(b => b.bookingId === id)
                  ).length})
                </button>
              </div>
            )}
          </div>
        ))}
        
        {payments.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500">No doctor payment data found.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Add Nutritionist Tab Component
function AddNutritionistTab({ onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    specialization: '',
    qualification: '',
    experience: '',
    description: '',
    photo: '',
    consultationFee: '500',
    licenseNumber: ''
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [generatedCredentials, setGeneratedCredentials] = useState(null)

  const handleImageUpload = (data) => {
    setFormData(prev => ({...prev, photo: data.url}))
    setMessage('Profile picture uploaded successfully!')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')

    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/nutritionists`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setMessage('Nutritionist created successfully!')
      setGeneratedCredentials({
        email: formData.email,
        password: formData.password
      })
      
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        specialization: '',
        qualification: '',
        experience: '',
        description: '',
        photo: '',
        consultationFee: '500',
        licenseNumber: ''
      })
      
      onSuccess()
    } catch (err) {
      console.error('Error creating nutritionist:', err)
      setError(err.response?.data?.message || 'Failed to create nutritionist')
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Add New Nutritionist</h2>
      
      {message && (
        <div className="bg-green-100 text-green-700 p-4 rounded mb-4">
          {message}
          {generatedCredentials && (
            <div className="mt-2 p-3 bg-white rounded">
              <p className="font-semibold">Login Credentials:</p>
              <p>Email: <code className="bg-gray-100 px-2 py-1 rounded">{generatedCredentials.email}</code></p>
              <p>Password: <code className="bg-gray-100 px-2 py-1 rounded">{generatedCredentials.password}</code></p>
              <p className="text-sm text-gray-600 mt-2">⚠️ Save these credentials! They won't be shown again.</p>
            </div>
          )}
        </div>
      )}
      
      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <ImageUploader 
            onUploadSuccess={handleImageUpload}
            uploadType="prescription"
            currentImage={formData.photo}
            label="Profile Picture (Optional)"
          />
          {formData.photo && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
              <p className="text-green-700 font-medium">✓ Profile picture ready</p>
              <p className="text-xs text-gray-600 truncate">{formData.photo}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">Name *</label>
            <input type="text" className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Email/Username *</label>
            <input type="text" className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Password *</label>
            <input type="password" className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required minLength={6} />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Phone</label>
            <input type="tel" className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Specialization *</label>
            <input type="text" className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600" placeholder="e.g., Clinical Nutrition" value={formData.specialization} onChange={(e) => setFormData({...formData, specialization: e.target.value})} required />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Qualification *</label>
            <input type="text" className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600" placeholder="e.g., MSc Nutrition" value={formData.qualification} onChange={(e) => setFormData({...formData, qualification: e.target.value})} required />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Experience (Years) *</label>
            <input type="number" className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600" value={formData.experience} onChange={(e) => setFormData({...formData, experience: e.target.value})} required min="0" />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">License Number *</label>
            <input type="text" className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600" placeholder="Dietician License" value={formData.licenseNumber} onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})} required />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Consultation Fee (₹)</label>
            <input type="number" className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600" value={formData.consultationFee} onChange={(e) => setFormData({...formData, consultationFee: e.target.value})} min="0" />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Description</label>
          <textarea className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600" placeholder="Brief description..." rows="3" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
        </div>

        <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">Create Nutritionist</button>
      </form>
    </div>
  )
}

// Manage Nutritionists Tab Component  
function ManageNutritionistsTab({ onUpdate }) {
  const [nutritionists, setNutritionists] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingNutritionist, setEditingNutritionist] = useState(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    fetchNutritionists()
  }, [])

  const fetchNutritionists = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/nutritionists`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNutritionists(res.data)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching nutritionists:', err)
      setLoading(false)
    }
  }

  const handleToggleCoreTeam = async (nutritionistId, current) => {
    try {
      const token = localStorage.getItem('token')
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/nutritionists/${nutritionistId}/core-team`,
        { coreTeam: !current },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchNutritionists()
      toast.success(`Nutritionist ${!current ? 'added to' : 'removed from'} Core Team`)
    } catch (err) {
      toast.error('Failed to update core team status')
    }
  }

  const handleToggleStatus = async (nutritionistId, currentAdminDisabled) => {
    try {
      const token = localStorage.getItem('token')
      const newAdminDisabled = !currentAdminDisabled
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/admin/nutritionists/${nutritionistId}/status`, { adminDisabled: newAdminDisabled }, { headers: { Authorization: `Bearer ${token}` } })
      fetchNutritionists()
      toast.success(`Nutritionist bookings ${newAdminDisabled ? 'disabled' : 'enabled'} successfully`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to update booking status')
    }
  }

  const handleEdit = (nutritionist) => {
    setEditingNutritionist(nutritionist._id)
    setEditForm({
      specialization: nutritionist.specialization,
      qualification: nutritionist.qualification,
      experience: nutritionist.experience,
      description: nutritionist.description || '',
      status: nutritionist.status,
      photo: nutritionist.photo || '',
      consultationFee: nutritionist.consultationFee,
      licenseNumber: nutritionist.licenseNumber
    })
  }

  const handlePhotoUpload = (data) => {
    setEditForm(prev => ({...prev, photo: data.url}))
  }

  const handleSaveEdit = async (nutritionistId) => {
    try {
      const token = localStorage.getItem('token')
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/admin/nutritionists/${nutritionistId}`, editForm, { headers: { Authorization: `Bearer ${token}` } })
      setEditingNutritionist(null)
      fetchNutritionists()
      toast.success('Nutritionist updated successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to update nutritionist')
    }
  }

  const handleDelete = async (nutritionistId, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/admin/nutritionists/${nutritionistId}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchNutritionists()
      toast.success('Nutritionist deleted successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete nutritionist')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <p className="mt-2 text-gray-600">Loading nutritionists...</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Manage Nutritionists</h2>
      <div className="space-y-6">
        {nutritionists.map(nutritionist => (
          <div key={nutritionist._id} className="bg-white border rounded-lg p-4">
            {editingNutritionist === nutritionist._id ? (
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ImageUploader onUploadSuccess={handlePhotoUpload} uploadType="prescription" currentImage={editForm.photo} label="Update Profile Picture" />
                </div>
                <input type="text" className="w-full px-3 py-2 border rounded" placeholder="Specialization" value={editForm.specialization} onChange={(e) => setEditForm({...editForm, specialization: e.target.value})} />
                <input type="text" className="w-full px-3 py-2 border rounded" placeholder="Qualification" value={editForm.qualification} onChange={(e) => setEditForm({...editForm, qualification: e.target.value})} />
                <input type="number" className="w-full px-3 py-2 border rounded" placeholder="Experience" value={editForm.experience} onChange={(e) => setEditForm({...editForm, experience: e.target.value})} />
                <input type="number" className="w-full px-3 py-2 border rounded" placeholder="Fee" value={editForm.consultationFee} onChange={(e) => setEditForm({...editForm, consultationFee: e.target.value})} />
                <input type="text" className="w-full px-3 py-2 border rounded" placeholder="License" value={editForm.licenseNumber} onChange={(e) => setEditForm({...editForm, licenseNumber: e.target.value})} />
                <textarea className="w-full px-3 py-2 border rounded" placeholder="Description" rows="2" value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} />
                <div className="flex space-x-2">
                  <button onClick={() => handleSaveEdit(nutritionist._id)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Save</button>
                  <button onClick={() => setEditingNutritionist(null)} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500">Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-start space-x-3">
                    <img src={nutritionist.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(nutritionist.userId?.name || 'User')}&size=80&background=10b981&color=fff`} alt={nutritionist.userId?.name} className="w-16 h-16 rounded-full object-cover border-2 border-green-200" onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nutritionist.userId?.name || 'User')}&size=80&background=10b981&color=fff` }} />
                    <div>
                      <h3 className="font-semibold text-lg">{nutritionist.userId?.name}</h3>
                      <p className="text-sm text-gray-600">{nutritionist.userId?.email}</p>
                      <p className="text-sm text-green-600">{nutritionist.specialization}</p>
                      <p className="text-sm text-gray-500">{nutritionist.qualification} • {nutritionist.experience} years</p>
                      <p className="text-sm text-gray-700 mt-1">Fee: ₹{nutritionist.consultationFee}</p>
                      {nutritionist.description && <p className="text-sm text-gray-500 mt-1">{nutritionist.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-wrap gap-2">
                    <button onClick={() => handleToggleStatus(nutritionist._id, nutritionist.adminDisabled)} className={`px-3 py-1 rounded text-sm font-medium ${nutritionist.adminDisabled ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{nutritionist.adminDisabled ? '🔴 Bookings Disabled' : '🟢 Bookings Enabled'}</button>
                    <button
                      onClick={() => handleToggleCoreTeam(nutritionist._id, nutritionist.coreTeam)}
                      className={`px-3 py-1 rounded text-sm font-medium border ${nutritionist.coreTeam ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}
                    >
                      {nutritionist.coreTeam ? '⭐ Core Team' : '☆ Core Team'}
                    </button>
                  </div>
                </div>
                <div className="flex space-x-2 mt-3">
                  <button onClick={() => handleEdit(nutritionist)} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">Edit</button>
                  <button onClick={() => handleDelete(nutritionist._id, nutritionist.userId?.name)} className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {nutritionists.length === 0 && <div className="text-center py-8"><p className="text-gray-500">No nutritionists found.</p></div>}
      </div>
    </div>
  )
}

// Nutritionist Payments Tab Component
function NutritionistPaymentsTab() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedBookings, setSelectedBookings] = useState([])
  const [message, setMessage] = useState('')
  const [adminRevenue, setAdminRevenue] = useState({ totalRevenue: 0, platformShare: 0, nutritionistShare: 0, totalBookings: 0 })

  useEffect(() => {
    fetchNutritionistPayments()
  }, [])

  const fetchNutritionistPayments = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/nutritionist-payments`, { headers: { Authorization: `Bearer ${token}` } })
      setPayments(res.data)
      const totalRevenue = res.data.reduce((sum, p) => sum + (p.totalEarned / 0.7), 0)
      const nutritionistShare = res.data.reduce((sum, p) => sum + p.totalEarned, 0)
      const platformShare = totalRevenue - nutritionistShare
      const totalBookings = res.data.reduce((sum, p) => sum + p.completedBookings, 0)
      setAdminRevenue({ totalRevenue, platformShare, nutritionistShare, totalBookings })
      setLoading(false)
    } catch (err) {
      console.error('Error fetching nutritionist payments:', err)
      setError(err.response?.data?.message || 'Failed to load payment data')
      setLoading(false)
    }
  }

  const handleMarkAsPaid = async (nutritionistId, bookingIds) => {
    try {
      const token = localStorage.getItem('token')
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/mark-nutritionist-payment-done`, { bookingIds }, { headers: { Authorization: `Bearer ${token}` } })
      setMessage('Payment marked as done!')
      toast.success('Payment marked as done!')
      setSelectedBookings([])
      fetchNutritionistPayments()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error(err)
      toast.error('Failed to mark payment')
    }
  }

  const exportToCSV = () => {
    const headers = ['Nutritionist Name', 'Total Earned', 'Total Paid', 'Outstanding', 'Completed Consultations', 'Unpaid Bookings']
    const rows = payments.map(p => [
      p.name,
      p.totalEarned,
      p.totalPaid,
      p.outstanding,
      p.completedBookings,
      p.unpaidBookings.length
    ])
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nutritionist-payments-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) return (<div className="text-center py-8"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div><p className="mt-2 text-gray-600">Loading...</p></div>)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">💰 Nutritionist Payment Management</h2>
        <button
          onClick={exportToCSV}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>
      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4"><p>{error}</p><button onClick={fetchNutritionistPayments} className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Retry</button></div>}
      {message && <div className="bg-green-100 text-green-700 p-4 rounded mb-4">{message}</div>}
      <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg shadow-lg mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Platform Revenue (Nutritionists)</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow"><p className="text-gray-600 text-sm font-medium">Total Revenue</p><p className="text-3xl font-bold text-green-600">₹{adminRevenue.totalRevenue}</p><p className="text-xs text-gray-500 mt-1">{adminRevenue.totalBookings} consultations</p></div>
          <div className="bg-white p-4 rounded-lg shadow"><p className="text-gray-600 text-sm font-medium">Platform Share (30%)</p><p className="text-3xl font-bold text-teal-600">₹{adminRevenue.platformShare}</p></div>
          <div className="bg-white p-4 rounded-lg shadow"><p className="text-gray-600 text-sm font-medium">Nutritionist Share (70%)</p><p className="text-3xl font-bold text-orange-600">₹{adminRevenue.nutritionistShare}</p></div>
          <div className="bg-white p-4 rounded-lg shadow"><p className="text-gray-600 text-sm font-medium">Per Consultation</p><p className="text-3xl font-bold text-purple-600">Dynamic</p></div>
        </div>
      </div>
      <h3 className="text-xl font-bold mb-4">Payment Management</h3>
      <div className="space-y-6">
        {payments.map((payment) => (
          <div key={payment.nutritionistId} className="bg-white border rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div><h3 className="text-lg font-bold">{payment.name}</h3><p className="text-sm text-gray-600">{payment.email}</p><p className="text-sm text-gray-600">{payment.completedBookings} consultations</p></div>
              <div className="text-right"><p className="text-2xl font-bold text-green-600">₹{payment.totalEarned}</p><p className="text-xs text-gray-500">Total Earned</p></div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-green-50 p-3 rounded"><p className="text-xs text-green-600 font-medium">Paid</p><p className="text-xl font-bold text-green-700">₹{payment.totalPaid}</p></div>
              <div className="bg-yellow-50 p-3 rounded"><p className="text-xs text-yellow-600 font-medium">Outstanding</p><p className="text-xl font-bold text-yellow-700">₹{payment.outstanding}</p></div>
              <div className="bg-blue-50 p-3 rounded"><p className="text-xs text-blue-600 font-medium">Unpaid</p><p className="text-xl font-bold text-blue-700">{payment.unpaidBookings.length}</p></div>
            </div>
            {payment.unpaidBookings.length > 0 && (
              <div className="border-t pt-4">
                <p className="font-medium mb-2">Unpaid Consultations:</p>
                <div className="space-y-2 mb-3">
                  {payment.unpaidBookings.map((booking) => (
                    <div key={booking.bookingId} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" checked={selectedBookings.includes(booking.bookingId)} onChange={(e) => { if (e.target.checked) { setSelectedBookings([...selectedBookings, booking.bookingId]) } else { setSelectedBookings(selectedBookings.filter(id => id !== booking.bookingId)) } }} className="w-4 h-4" />
                        <div><p className="text-sm font-medium">{booking.patientName}</p><p className="text-xs text-gray-500">{new Date(booking.date).toLocaleDateString()}</p></div>
                      </div>
                      <p className="text-sm font-bold text-green-600">₹{booking.amount}</p>
                    </div>
                  ))}
                </div>
                <button onClick={() => { const bookingIds = payment.unpaidBookings.filter(b => selectedBookings.includes(b.bookingId)).map(b => b.bookingId); if (bookingIds.length > 0) { handleMarkAsPaid(payment.nutritionistId, bookingIds) } else { toast.warning('Please select consultations') } }} disabled={selectedBookings.length === 0} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400">Mark Selected as Paid ({selectedBookings.filter(id => payment.unpaidBookings.some(b => b.bookingId === id)).length})</button>
              </div>
            )}
          </div>
        ))}
        {payments.length === 0 && <div className="text-center py-8"><p className="text-gray-500">No payment data found.</p></div>}
      </div>
    </div>
  )
}

// Incentives Tab Component
function IncentivesTab() {
  const [pharmacists, setPharmacists] = useState([])
  const [doctors, setDoctors] = useState([])
  const [nutritionists, setNutritionists] = useState([])
  const [incentives, setIncentives] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ professionalType: 'pharmacist', professionalId: '', amount: '', reason: '' })
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    Promise.all([
      axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/pharmacists`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/doctors`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/nutritionists`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/incentives`, { headers: { Authorization: `Bearer ${token}` } }),
    ]).then(([p, d, n, i]) => {
      setPharmacists(p.data)
      setDoctors(d.data)
      setNutritionists(n.data)
      setIncentives(i.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const professionalsForType = () => {
    if (form.professionalType === 'pharmacist') return pharmacists
    if (form.professionalType === 'doctor') return doctors
    return nutritionists
  }

  const handleSend = async () => {
    if (!form.professionalId || !form.amount || !form.reason) {
      toast.error('Please fill all fields')
      return
    }
    setSending(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/incentive`, {
        professionalId: form.professionalId,
        professionalType: form.professionalType,
        amount: Number(form.amount),
        reason: form.reason,
      }, { headers: { Authorization: `Bearer ${token}` } })
      toast.success('Incentive sent successfully!')
      setForm(prev => ({ ...prev, professionalId: '', amount: '', reason: '' }))
      // Refresh incentives list
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/incentives`, { headers: { Authorization: `Bearer ${token}` } })
      setIncentives(res.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send incentive')
    } finally {
      setSending(false)
    }
  }

  if (loading) return (
    <div className="text-center py-8">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
    </div>
  )

  const totalSent = incentives.reduce((s, i) => s + i.amount, 0)

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold mb-6">🎁 Incentive Payments</h2>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-sm text-emerald-700 font-medium">Total Incentives Sent</p>
          <p className="text-3xl font-bold text-emerald-700 mt-1">₹{totalSent.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-sm text-blue-700 font-medium">Total Transactions</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">{incentives.length}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
          <p className="text-sm text-purple-700 font-medium">Avg. Incentive</p>
          <p className="text-3xl font-bold text-purple-700 mt-1">₹{incentives.length > 0 ? Math.round(totalSent / incentives.length).toLocaleString() : 0}</p>
        </div>
      </div>

      {/* Send Incentive Form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Send Incentive / Bonus</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Professional Type</label>
            <select
              value={form.professionalType}
              onChange={(e) => setForm({ ...form, professionalType: e.target.value, professionalId: '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            >
              <option value="pharmacist">Pharmacist</option>
              <option value="doctor">Doctor</option>
              <option value="nutritionist">Nutritionist</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Professional</label>
            <select
              value={form.professionalId}
              onChange={(e) => setForm({ ...form, professionalId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            >
              <option value="">-- Select --</option>
              {professionalsForType().map(p => (
                <option key={p._id} value={p._id}>{p.userId?.name} ({p.userId?.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
            <input
              type="number"
              min="1"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="e.g. 500"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input
              type="text"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Performance bonus, Extra sessions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleSend}
          disabled={sending}
          className="mt-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          {sending ? 'Sending...' : '🎁 Send Incentive'}
        </button>
      </div>

      {/* History */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Incentive History</h3>
        </div>
        {incentives.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">No incentives sent yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {incentives.map(inc => (
              <div key={inc._id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{inc.professionalUserId?.name}</p>
                  <p className="text-xs text-gray-500">{inc.professionalUserId?.email} · {inc.professionalType}</p>
                  <p className="text-xs text-gray-600 mt-0.5 italic">"{inc.reason}"</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-emerald-600">₹{inc.amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{new Date(inc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  <p className="text-xs text-gray-400">by {inc.paidBy?.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Subscription Bookings Tab Component
function SubscriptionBookingsTab() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    const fetch = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/subscription-bookings`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setBookings(res.data)
      } catch (err) {
        toast.error('Failed to load subscription bookings')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const getProfessional = (b) => {
    if (b.pharmacistId) return { name: b.pharmacistId?.userId?.name, email: b.pharmacistId?.userId?.email, type: 'Pharmacist', emoji: '💊' }
    if (b.doctorId)     return { name: b.doctorId?.userId?.name,     email: b.doctorId?.userId?.email,     type: 'Doctor',      emoji: '🩺' }
    if (b.nutritionistId) return { name: b.nutritionistId?.userId?.name, email: b.nutritionistId?.userId?.email, type: 'Nutritionist', emoji: '🥗' }
    return { name: 'Unknown', email: '', type: 'Unknown', emoji: '❓' }
  }

  const filtered = bookings.filter(b => {
    const prof = getProfessional(b)
    const q = search.toLowerCase()
    const matchSearch = !q ||
      b.patientId?.name?.toLowerCase().includes(q) ||
      b.patientId?.email?.toLowerCase().includes(q) ||
      prof.name?.toLowerCase().includes(q)
    const matchType = typeFilter === 'all' || b.providerType === typeFilter
    return matchSearch && matchType
  })

  if (loading) return (
    <div className="text-center py-8">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div>
          <h2 className="text-2xl font-bold">💳 Subscription Bookings</h2>
          <p className="text-sm text-gray-500 mt-1">Patients booked via subscription plan and their designated professionals</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold bg-blue-50 text-blue-700 px-4 py-2 rounded-xl">
          Total: {bookings.length}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search patient or professional..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="all">All Types</option>
          <option value="pharmacist">Pharmacist</option>
          <option value="doctor">Doctor</option>
          <option value="nutritionist">Nutritionist</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No subscription bookings found.</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Patient', 'Professional', 'Type', 'Status', 'Booked On'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(b => {
                  const prof = getProfessional(b)
                  return (
                    <tr key={b._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={b.patientId?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.patientId?.name || 'P')}&size=36&background=3b82f6&color=fff`}
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                            alt=""
                            onError={e => { e.target.src = `https://ui-avatars.com/api/?name=P&size=36` }}
                          />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{b.patientId?.name}</p>
                            <p className="text-xs text-gray-400">{b.patientId?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-semibold text-gray-900">{prof.name}</p>
                        <p className="text-xs text-gray-400">{prof.email}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                          {prof.emoji} {prof.type}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          b.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map(b => {
              const prof = getProfessional(b)
              return (
                <div key={b._id} className="p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={b.patientId?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.patientId?.name || 'P')}&size=40&background=3b82f6&color=fff`}
                      className="w-10 h-10 rounded-full object-cover"
                      alt=""
                      onError={e => { e.target.src = `https://ui-avatars.com/api/?name=P&size=40` }}
                    />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{b.patientId?.name}</p>
                      <p className="text-xs text-gray-400">{b.patientId?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{prof.emoji} {prof.name} <span className="text-xs text-gray-400">({prof.type})</span></span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      b.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                      'bg-red-100 text-red-600'
                    }`}>{b.status}</span>
                  </div>
                  <p className="text-xs text-gray-400">{new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Medical Forms Tab Component
function MedicalFormsTab() {
  const [medicalForms, setMedicalForms] = useState([])
  const [pendingForms, setPendingForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSubTab, setActiveSubTab] = useState('pending')
  const [pharmacists, setPharmacists] = useState([])
  const [doctors, setDoctors] = useState([])
  const [assignmentLoading, setAssignmentLoading] = useState(null)

  useEffect(() => {
    fetchMedicalForms()
    fetchProfessionals()
  }, [])

  const fetchMedicalForms = async () => {
    try {
      const token = localStorage.getItem('token')
      
      // Fetch pending forms
      const pendingRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/medical-forms/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPendingForms(pendingRes.data)

      // Fetch all forms
      const allRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/medical-forms/all`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMedicalForms(allRes.data.medicalForms || [])
      
      setLoading(false)
    } catch (error) {
      console.error('Error fetching medical forms:', error)
      setLoading(false)
    }
  }

  const fetchProfessionals = async () => {
    try {
      const token = localStorage.getItem('token')
      
      const [pharmacistsRes, doctorsRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/pharmacists`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/doctors`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      
      setPharmacists(pharmacistsRes.data)
      setDoctors(doctorsRes.data)
    } catch (error) {
      console.error('Error fetching professionals:', error)
    }
  }

  const handleAssignForm = async (formId, professionalId, professionalType) => {
    setAssignmentLoading(formId)
    try {
      const token = localStorage.getItem('token')
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/medical-forms/${formId}/assign`, {
        professionalId,
        professionalType
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast.success(`Medical form assigned to ${professionalType} successfully!`)
      fetchMedicalForms()
    } catch (error) {
      console.error('Error assigning form:', error)
      toast.error(error.response?.data?.message || 'Failed to assign medical form')
    } finally {
      setAssignmentLoading(null)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'assigned':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'paid':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending Assignment'
      case 'assigned':
        return 'Under Review'
      case 'completed':
        return 'Awaiting Payment'
      case 'paid':
        return 'Completed'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        <p className="mt-2 text-gray-600">Loading medical forms...</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">📋 Medical Forms Management</h2>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm font-medium">Pending Assignment</p>
          <p className="text-3xl font-bold text-yellow-600">{pendingForms.length}</p>
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm font-medium">Under Review</p>
          <p className="text-3xl font-bold text-blue-600">
            {medicalForms.filter(f => f.status === 'assigned').length}
          </p>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm font-medium">Completed</p>
          <p className="text-3xl font-bold text-green-600">
            {medicalForms.filter(f => f.status === 'completed').length}
          </p>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm font-medium">Total Forms</p>
          <p className="text-3xl font-bold text-purple-600">{medicalForms.length}</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveSubTab('pending')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeSubTab === 'pending'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending Assignment ({pendingForms.length})
          </button>
          <button
            onClick={() => setActiveSubTab('all')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeSubTab === 'all'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Forms ({medicalForms.length})
          </button>
        </nav>
      </div>

      {/* Pending Forms Tab */}
      {activeSubTab === 'pending' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Forms Awaiting Assignment</h3>
          {pendingForms.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No pending forms</h3>
              <p className="mt-1 text-sm text-gray-500">All medical forms have been assigned to professionals.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingForms.map((form) => (
                <div key={form._id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{form.patientName}</h4>
                      <p className="text-sm text-gray-600">
                        Age: {form.age} | Sex: {form.sex}
                      </p>
                      <p className="text-sm text-gray-500">
                        Submitted: {new Date(form.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Patient: {form.patientId?.name} ({form.patientId?.email})
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(form.status)}`}>
                      {getStatusText(form.status)}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Prescription Details:</strong>
                    </p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                      {form.prescriptionDetails}
                    </p>
                    {form.additionalNotes && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-700 mb-1">
                          <strong>Additional Notes:</strong>
                        </p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                          {form.additionalNotes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      {form.prescriptionUrl && (
                        <button
                          onClick={() => window.open(form.prescriptionUrl, '_blank')}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          📄 View Prescription
                        </button>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      {/* Assign to Pharmacist */}
                      <div className="relative">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignForm(form._id, e.target.value, 'pharmacist')
                              e.target.value = ''
                            }
                          }}
                          disabled={assignmentLoading === form._id}
                          className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                        >
                          <option value="">Assign to Pharmacist</option>
                          {pharmacists.map((pharmacist) => (
                            <option key={pharmacist._id} value={pharmacist._id}>
                              {pharmacist.userId?.name} - {pharmacist.designation}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Assign to Doctor */}
                      <div className="relative">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignForm(form._id, e.target.value, 'doctor')
                              e.target.value = ''
                            }
                          }}
                          disabled={assignmentLoading === form._id}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                          <option value="">Assign to Doctor</option>
                          {doctors.map((doctor) => (
                            <option key={doctor._id} value={doctor._id}>
                              {doctor.userId?.name} - {doctor.specialization}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {assignmentLoading === form._id && (
                    <div className="mt-3 text-center">
                      <div className="inline-flex items-center text-sm text-gray-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Assigning form...
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Forms Tab */}
      {activeSubTab === 'all' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">All Medical Forms</h3>
          {medicalForms.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No medical forms</h3>
              <p className="mt-1 text-sm text-gray-500">No medical forms have been submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {medicalForms.map((form) => (
                <div key={form._id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{form.patientName}</h4>
                      <p className="text-sm text-gray-600">
                        Age: {form.age} | Sex: {form.sex}
                      </p>
                      <p className="text-sm text-gray-500">
                        Submitted: {new Date(form.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Patient: {form.patientId?.name} ({form.patientId?.email})
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(form.status)}`}>
                      {getStatusText(form.status)}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Prescription Details:</strong>
                    </p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                      {form.prescriptionDetails}
                    </p>
                    {form.additionalNotes && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-700 mb-1">
                          <strong>Additional Notes:</strong>
                        </p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                          {form.additionalNotes}
                        </p>
                      </div>
                    )}
                  </div>

                  {form.assignedTo && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Assigned to:</strong> {form.assignedTo.name} ({form.assignedType})
                      </p>
                      {form.assignedAt && (
                        <p className="text-sm text-blue-600">
                          Assigned on: {new Date(form.assignedAt).toLocaleDateString()}
                        </p>
                      )}
                      {form.assignedBy && (
                        <p className="text-sm text-blue-600">
                          Assigned by: {form.assignedBy.name}
                        </p>
                      )}
                    </div>
                  )}

                  {form.status === 'completed' && (
                    <div className="mb-4 p-3 bg-green-50 rounded-md">
                      <p className="text-sm text-green-800">
                        <strong>Result Completed!</strong> Awaiting patient payment.
                      </p>
                      {form.resultNotes && (
                        <p className="text-sm text-green-700 mt-1">
                          <strong>Result Notes:</strong> {form.resultNotes}
                        </p>
                      )}
                      <p className="text-sm text-green-600 mt-1">
                        Payment Required: ₹{form.paymentAmount}
                      </p>
                    </div>
                  )}

                  {form.status === 'paid' && (
                    <div className="mb-4 p-3 bg-purple-50 rounded-md">
                      <p className="text-sm text-purple-800">
                        <strong>Payment Completed!</strong> Form processing complete.
                      </p>
                      {form.resultNotes && (
                        <p className="text-sm text-purple-700 mt-1">
                          <strong>Result Notes:</strong> {form.resultNotes}
                        </p>
                      )}
                      <p className="text-sm text-purple-600 mt-1">
                        Paid: ₹{form.paymentAmount} on {new Date(form.paidAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      {form.prescriptionUrl && (
                        <button
                          onClick={() => window.open(form.prescriptionUrl, '_blank')}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          📄 View Prescription
                        </button>
                      )}
                      {form.resultPdfUrl && (
                        <button
                          onClick={() => window.open(form.resultPdfUrl, '_blank')}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          📋 View Result
                        </button>
                      )}
                    </div>

                    {form.status === 'pending' && (
                      <div className="flex space-x-2">
                        {/* Assign to Pharmacist */}
                        <div className="relative">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignForm(form._id, e.target.value, 'pharmacist')
                                e.target.value = ''
                              }
                            }}
                            disabled={assignmentLoading === form._id}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                          >
                            <option value="">Assign to Pharmacist</option>
                            {pharmacists.map((pharmacist) => (
                              <option key={pharmacist._id} value={pharmacist._id}>
                                {pharmacist.userId?.name} - {pharmacist.designation}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Assign to Doctor */}
                        <div className="relative">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignForm(form._id, e.target.value, 'doctor')
                                e.target.value = ''
                              }
                            }}
                            disabled={assignmentLoading === form._id}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                          >
                            <option value="">Assign to Doctor</option>
                            {doctors.map((doctor) => (
                              <option key={doctor._id} value={doctor._id}>
                                {doctor.userId?.name} - {doctor.specialization}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {assignmentLoading === form._id && (
                    <div className="mt-3 text-center">
                      <div className="inline-flex items-center text-sm text-gray-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Assigning form...
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


// Manage Hospitals Tab Component
function ManageHospitalsTab({ onUpdate }) {
  const [hospitals, setHospitals] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingHospital, setEditingHospital] = useState(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    fetchHospitals()
  }, [])

  const fetchHospitals = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/hospitals`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setHospitals(res.data)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching hospitals:', err)
      setLoading(false)
    }
  }

  const handleVerifyToggle = async (hospitalId, currentStatus) => {
    try {
      const token = localStorage.getItem('token')
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/hospitals/${hospitalId}/verify`,
        { isVerified: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchHospitals()
      toast.success('Hospital verification status updated')
    } catch (err) {
      console.error('Error updating verification:', err)
      toast.error('Failed to update verification status')
    }
  }

  const handleEdit = (hospital) => {
    setEditingHospital(hospital._id)
    setEditForm({
      hospitalName: hospital.hospitalName,
      address: hospital.address,
      city: hospital.city,
      state: hospital.state,
      pincode: hospital.pincode,
      contactNumber: hospital.contactNumber,
      emergencyNumber: hospital.emergencyNumber || '',
      totalBeds: hospital.totalBeds,
      availableBeds: hospital.availableBeds,
      icuBeds: hospital.icuBeds,
      availableIcuBeds: hospital.availableIcuBeds
    })
  }

  const handleUpdate = async (hospitalId) => {
    try {
      const token = localStorage.getItem('token')
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/hospitals/${hospitalId}`,
        editForm,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setEditingHospital(null)
      fetchHospitals()
      toast.success('Hospital updated successfully')
    } catch (err) {
      console.error('Error updating hospital:', err)
      toast.error('Failed to update hospital')
    }
  }

  const handleDelete = async (hospitalId) => {
    if (!confirm('Are you sure you want to delete this hospital?')) return

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/admin/hospitals/${hospitalId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchHospitals()
      toast.success('Hospital deleted successfully')
    } catch (err) {
      console.error('Error deleting hospital:', err)
      toast.error('Failed to delete hospital')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading hospitals...</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Manage Hospitals</h2>
      <div className="space-y-6">
        {hospitals.map(hospital => (
          <div key={hospital._id} className="bg-white border rounded-lg p-4">
            {editingHospital === hospital._id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editForm.hospitalName}
                  onChange={(e) => setEditForm({ ...editForm, hospitalName: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Hospital Name"
                />
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Address"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="px-3 py-2 border rounded"
                    placeholder="City"
                  />
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="px-3 py-2 border rounded"
                    placeholder="State"
                  />
                  <input
                    type="text"
                    value={editForm.pincode}
                    onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })}
                    className="px-3 py-2 border rounded"
                    placeholder="Pincode"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={editForm.contactNumber}
                    onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
                    className="px-3 py-2 border rounded"
                    placeholder="Contact Number"
                  />
                  <input
                    type="text"
                    value={editForm.emergencyNumber}
                    onChange={(e) => setEditForm({ ...editForm, emergencyNumber: e.target.value })}
                    className="px-3 py-2 border rounded"
                    placeholder="Emergency Number"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="number"
                    value={editForm.totalBeds}
                    onChange={(e) => setEditForm({ ...editForm, totalBeds: parseInt(e.target.value) })}
                    className="px-3 py-2 border rounded"
                    placeholder="Total Beds"
                  />
                  <input
                    type="number"
                    value={editForm.availableBeds}
                    onChange={(e) => setEditForm({ ...editForm, availableBeds: parseInt(e.target.value) })}
                    className="px-3 py-2 border rounded"
                    placeholder="Available Beds"
                  />
                  <input
                    type="number"
                    value={editForm.icuBeds}
                    onChange={(e) => setEditForm({ ...editForm, icuBeds: parseInt(e.target.value) })}
                    className="px-3 py-2 border rounded"
                    placeholder="ICU Beds"
                  />
                  <input
                    type="number"
                    value={editForm.availableIcuBeds}
                    onChange={(e) => setEditForm({ ...editForm, availableIcuBeds: parseInt(e.target.value) })}
                    className="px-3 py-2 border rounded"
                    placeholder="Available ICU"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleUpdate(hospital._id)}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingHospital(null)}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{hospital.hospitalName}</h3>
                    <p className="text-sm text-gray-600">{hospital.registrationNumber}</p>
                    <p className="text-sm text-gray-600">{hospital.address}, {hospital.city}, {hospital.state} - {hospital.pincode}</p>
                    <p className="text-sm text-gray-600">📞 {hospital.contactNumber}</p>
                    {hospital.emergencyNumber && (
                      <p className="text-sm text-gray-600">🚨 {hospital.emergencyNumber}</p>
                    )}
                    <p className="text-sm text-gray-600">📧 {hospital.email}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    hospital.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {hospital.isVerified ? '✓ Verified' : 'Pending Verification'}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 my-3 text-sm">
                  <div className="bg-green-50 p-2 rounded">
                    <span className="text-gray-600">Beds:</span>
                    <span className="font-semibold ml-1">{hospital.availableBeds}/{hospital.totalBeds}</span>
                  </div>
                  <div className="bg-red-50 p-2 rounded">
                    <span className="text-gray-600">ICU:</span>
                    <span className="font-semibold ml-1">{hospital.availableIcuBeds}/{hospital.icuBeds}</span>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-semibold ml-1">{hospital.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="bg-purple-50 p-2 rounded">
                    <span className="text-gray-600">User:</span>
                    <span className="font-semibold ml-1">{hospital.userId?.name}</span>
                  </div>
                </div>
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={() => handleEdit(hospital)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleVerifyToggle(hospital._id, hospital.isVerified)}
                    className={`px-3 py-1 rounded text-sm ${
                      hospital.isVerified
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {hospital.isVerified ? 'Unverify' : 'Verify'}
                  </button>
                  <button
                    onClick={() => handleDelete(hospital._id)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {hospitals.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No hospitals found.</p>
          </div>
        )}
      </div>
    </div>
  )
}


// Add Hospital Tab Component
function AddHospitalTab({ onHospitalAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    hospitalName: '',
    registrationNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    latitude: '',
    longitude: '',
    contactNumber: '',
    emergencyNumber: '',
    totalBeds: '',
    availableBeds: '',
    icuBeds: '',
    availableIcuBeds: '',
    specializations: '',
    facilities: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const detectLocation = () => {
    setDetectingLocation(true);
    setMessage('Detecting location...');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          });
          setMessage('Location detected successfully!');
          setDetectingLocation(false);
        },
        (error) => {
          setError('Failed to detect location. Please enter manually.');
          setDetectingLocation(false);
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
      setDetectingLocation(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      const hospitalData = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        totalBeds: parseInt(formData.totalBeds) || 0,
        availableBeds: parseInt(formData.availableBeds) || 0,
        icuBeds: parseInt(formData.icuBeds) || 0,
        availableIcuBeds: parseInt(formData.availableIcuBeds) || 0,
        specializations: formData.specializations 
          ? formData.specializations.split(',').map(s => s.trim()).filter(s => s)
          : [],
        facilities: formData.facilities 
          ? formData.facilities.split(',').map(f => f.trim()).filter(f => f)
          : []
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/hospitals`,
        hospitalData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success(`Hospital created successfully! Login - Email: ${response.data.credentials.email}`);
      
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        hospitalName: '',
        registrationNumber: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        latitude: '',
        longitude: '',
        contactNumber: '',
        emergencyNumber: '',
        totalBeds: '',
        availableBeds: '',
        icuBeds: '',
        availableIcuBeds: '',
        specializations: '',
        facilities: ''
      });

      if (onHospitalAdded) {
        onHospitalAdded();
      }
    } catch (err) {
      console.error('Error creating hospital:', err);
      toast.error(err.response?.data?.message || 'Failed to create hospital');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Add New Hospital</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">User Account Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength="6" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Hospital Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hospital Name *</label>
              <input type="text" name="hospitalName" value={formData.hospitalName} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Registration Number *</label>
              <input type="text" name="registrationNumber" value={formData.registrationNumber} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
              <textarea name="address" value={formData.address} onChange={handleChange} required rows="2" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
              <input type="text" name="state" value={formData.state} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pincode *</label>
              <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
              <input type="tel" name="contactNumber" value={formData.contactNumber} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Number</label>
              <input type="tel" name="emergencyNumber" value={formData.emergencyNumber} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">GPS Location</h3>
            <button type="button" onClick={detectLocation} disabled={detectingLocation} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400">
              {detectingLocation ? 'Detecting...' : '📍 Detect Location'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
              <input type="number" step="any" name="latitude" value={formData.latitude} onChange={handleChange} placeholder="e.g., 28.7041" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
              <input type="number" step="any" name="longitude" value={formData.longitude} onChange={handleChange} placeholder="e.g., 77.1025" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">GPS coordinates for location-based query matching (50km radius)</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Bed Capacity</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Beds</label>
              <input type="number" name="totalBeds" value={formData.totalBeds} onChange={handleChange} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Available Beds</label>
              <input type="number" name="availableBeds" value={formData.availableBeds} onChange={handleChange} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ICU Beds</label>
              <input type="number" name="icuBeds" value={formData.icuBeds} onChange={handleChange} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Available ICU</label>
              <input type="number" name="availableIcuBeds" value={formData.availableIcuBeds} onChange={handleChange} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Specializations (comma-separated)</label>
              <input type="text" name="specializations" value={formData.specializations} onChange={handleChange} placeholder="e.g., Cardiology, Neurology, Orthopedics" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Facilities (comma-separated)</label>
              <input type="text" name="facilities" value={formData.facilities} onChange={handleChange} placeholder="e.g., Emergency, ICU, Pharmacy, Laboratory" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button type="button" onClick={() => { if (confirm('Reset form?')) { setFormData({ name: '', email: '', password: '', phone: '', hospitalName: '', registrationNumber: '', address: '', city: '', state: '', pincode: '', latitude: '', longitude: '', contactNumber: '', emergencyNumber: '', totalBeds: '', availableBeds: '', icuBeds: '', availableIcuBeds: '', specializations: '', facilities: '' }); } }} className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
            Reset
          </button>
          <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">
            {loading ? 'Creating...' : 'Create Hospital'}
          </button>
        </div>
      </form>
    </div>
  );
}


// Live Chat Tab Component
function LiveChatTab() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const SOCKET_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace('/api', '');

  useEffect(() => {
    fetchChats();
    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedChat && selectedChat.messages) {
      scrollToBottom();
    }
  }, [selectedChat]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      });
    }
  };

  const connectSocket = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Admin CS Socket connected');
    });

    socketRef.current.on('customer-service-message', (data) => {
      console.log('📨 New CS message notification:', data);
      fetchChats(); // Refresh chat list
      
      // If viewing this chat, update it
      if (selectedChat && selectedChat.sessionId === data.sessionId) {
        fetchChatDetails(data.sessionId);
      }
    });

    socketRef.current.on('new-cs-message', (message) => {
      console.log('📨 New CS message in current chat:', message);
      if (selectedChat) {
        setSelectedChat(prev => ({
          ...prev,
          messages: [...prev.messages, message]
        }));
      }
    });
  };

  const fetchChats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/customer-service-chat/admin/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChats(res.data);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatDetails = async (sessionId) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/customer-service-chat/session/${sessionId}`);
      setSelectedChat(res.data);
      
      // Join socket room
      if (socketRef.current) {
        socketRef.current.emit('join-cs-session', sessionId);
      }
      
      // Mark messages as read
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/customer-service-chat/session/${sessionId}/read`,
        { sender: 'admin' }
      );
    } catch (error) {
      console.error('Error fetching chat details:', error);
    }
  };

  const handleAssignChat = async (sessionId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/customer-service-chat/admin/chats/${sessionId}/assign`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchChats();
      fetchChatDetails(sessionId);
    } catch (error) {
      console.error('Error assigning chat:', error);
      alert('Failed to assign chat');
    }
  };

  const handleCloseChat = async (sessionId) => {
    if (!confirm('Are you sure you want to close this chat?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/customer-service-chat/admin/chats/${sessionId}/close`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchChats();
      setSelectedChat(null);
    } catch (error) {
      console.error('Error closing chat:', error);
      alert('Failed to close chat');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !selectedChat) return;

    setSending(true);
    const messageText = newMessage;
    setNewMessage('');

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/customer-service-chat/session/${selectedChat.sessionId}/message`,
        { message: messageText, sender: 'admin' }
      );
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getUnreadCount = (chat) => {
    return chat.messages.filter(m => m.sender === 'user' && !m.isRead).length;
  };

  return (
    <div className="h-[calc(100vh-300px)]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Live Chat Management</h2>
        <button
          onClick={fetchChats}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
        {/* Chat List */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-gray-50 p-4 border-b">
            <h3 className="font-semibold">Active Chats ({chats.length})</h3>
          </div>
          <div className="overflow-y-auto h-[calc(100%-60px)]">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : chats.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No active chats</p>
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat._id}
                  onClick={() => fetchChatDetails(chat.sessionId)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                    selectedChat?.sessionId === chat.sessionId ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{chat.userName}</p>
                      {chat.userEmail && (
                        <p className="text-xs text-gray-500">{chat.userEmail}</p>
                      )}
                    </div>
                    {getUnreadCount(chat) > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {getUnreadCount(chat)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded ${
                      chat.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                      chat.status === 'active' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {chat.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(chat.lastMessageAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow flex flex-col">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-t-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg">{selectedChat.userName}</h3>
                    {selectedChat.userEmail && (
                      <p className="text-sm text-purple-100">{selectedChat.userEmail}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    {selectedChat.status === 'waiting' && (
                      <button
                        onClick={() => handleAssignChat(selectedChat.sessionId)}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                      >
                        Assign to Me
                      </button>
                    )}
                    {selectedChat.status !== 'closed' && (
                      <button
                        onClick={() => handleCloseChat(selectedChat.sessionId)}
                        className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                      >
                        Close Chat
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {selectedChat.messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p>No messages yet</p>
                  </div>
                ) : (
                  selectedChat.messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2 rounded-lg ${
                          msg.sender === 'admin'
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p className={`text-xs mt-1 ${msg.sender === 'admin' ? 'text-purple-100' : 'text-gray-500'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              {selectedChat.status !== 'closed' ? (
                <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled={sending}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || !newMessage.trim()}
                      className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400"
                    >
                      Send
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 border-t border-gray-200 bg-red-50 rounded-b-lg text-center">
                  <p className="text-sm text-red-700">This chat has been closed</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>Select a chat to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
