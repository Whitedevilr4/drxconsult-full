import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Layout from '@/components/Layout'
import PdfUploader from '@/components/EnhancedUploader'
import ImageUploader from '@/components/EnhancedUploader'
import ComplaintList from '@/components/ComplaintList'
import ComplaintDetail from '@/components/ComplaintDetail'
import { toast } from 'react-toastify'

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [pharmacists, setPharmacists] = useState([])
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Complaints state
  const [complaints, setComplaints] = useState([])
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [complaintsLoading, setComplaintsLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = JSON.parse(localStorage.getItem('user') || '{}')
    
    if (!token || userData.role !== 'admin') {
      router.push('/login')
      return
    }

    fetchData(token)
    fetchComplaints(token)
  }, [])

  const fetchData = async (token) => {
    try {
      const [usersRes, pharmacistsRes, patientsRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/pharmacists`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/patients`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      
      setUsers(usersRes.data)
      setPharmacists(pharmacistsRes.data)
      setPatients(patientsRes.data)
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
                  <option value="add-pharmacist">Add Pharmacist</option>
                  <option value="upload-results">Upload Test Results</option>
                  <option value="analytics">📊 Analytics</option>
                  <option value="payments">💰 Payments</option>
                  <option value="reviews">⭐ Reviews</option>
                  <option value="manage">Manage Pharmacists</option>
                  <option value="complaints">📝 Complaints</option>
                  <option value="website">🌐 Website</option>
                  <option value="users">👥 User Management</option>
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
                  💰 Payments
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
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && <OverviewTab users={users} pharmacists={pharmacists} patients={patients} />}
              {activeTab === 'add-pharmacist' && <AddPharmacistTab onSuccess={() => fetchData(localStorage.getItem('token'))} />}
              {activeTab === 'upload-results' && <UploadResultsTab patients={patients} />}

              {activeTab === 'analytics' && <AnalyticsTab />}
              {activeTab === 'payments' && <PaymentsTab />}
              {activeTab === 'reviews' && <ReviewsTab pharmacists={pharmacists} />}
              {activeTab === 'manage' && <ManageUsersTab users={users} pharmacists={pharmacists} onUpdate={() => fetchData(localStorage.getItem('token'))} />}
              {activeTab === 'complaints' && <ComplaintsTab complaints={complaints} loading={complaintsLoading} onComplaintClick={handleComplaintClick} onRefresh={() => fetchComplaints(localStorage.getItem('token'))} />}
              {activeTab === 'website' && <WebsiteTab />}
              {activeTab === 'users' && <UserManagementTab />}
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
    </Layout>
  )
}

// Overview Tab Component
function OverviewTab({ users, pharmacists, patients }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">System Overview</h2>
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="font-semibold mb-2">Recent Activity</h3>
          <p className="text-gray-600">Total registered users: {users.length}</p>
          <p className="text-gray-600">Active pharmacists: {pharmacists.length}</p>
          <p className="text-gray-600">Registered patients: {patients.length}</p>
        </div>
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

  const handleToggleStatus = async (pharmacistId, currentStatus) => {
    try {
      const token = localStorage.getItem('token')
      const newStatus = currentStatus === 'online' ? 'offline' : 'online'
      
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/pharmacists/${pharmacistId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      onUpdate()
      toast.success('Status updated successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to update status')
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
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleStatus(pharmacist._id, pharmacist.status)}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        pharmacist.status === 'online'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {pharmacist.status === 'online' ? '🟢 Online' : '⚫ Offline'}
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

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">System Analytics</h2>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-blue-600 text-sm font-medium">Total Bookings</p>
          <p className="text-3xl font-bold text-blue-700">{analytics.overview.totalBookings}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-green-600 text-sm font-medium">Completed</p>
          <p className="text-3xl font-bold text-green-700">{analytics.overview.completedBookings}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-purple-600 text-sm font-medium">Active</p>
          <p className="text-3xl font-bold text-purple-700">{analytics.overview.activeBookings}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-red-600 text-sm font-medium">Cancelled</p>
          <p className="text-3xl font-bold text-red-700">{analytics.overview.cancelledBookings}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-yellow-600 text-sm font-medium">Treated Patients</p>
          <p className="text-3xl font-bold text-yellow-700">{analytics.overview.treatedPatients}</p>
        </div>
      </div>

      {/* Pharmacist Performance */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-4">Pharmacist Performance</h3>
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Pharmacist</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Total Bookings</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Completed</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Cancelled</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Treated</th>
              </tr>
            </thead>
            <tbody>
              {analytics.pharmacistPerformance.map((pharmacist, index) => (
                <tr key={index} className="border-t">
                  <td className="px-4 py-3 text-sm font-medium">{pharmacist.name}</td>
                  <td className="px-4 py-3 text-center text-sm">{pharmacist.totalBookings}</td>
                  <td className="px-4 py-3 text-center text-sm text-green-600">{pharmacist.completed}</td>
                  <td className="px-4 py-3 text-center text-sm text-red-600">{pharmacist.cancelled}</td>
                  <td className="px-4 py-3 text-center text-sm text-blue-600">{pharmacist.treated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Bookings */}
      <div>
        <h3 className="text-lg font-bold mb-4">Recent Bookings</h3>
        <div className="space-y-3">
          {analytics.recentBookings.map((booking) => (
            <div key={booking._id} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{booking.patientId?.name}</p>
                  <p className="text-sm text-gray-600">
                    Pharmacist: {booking.pharmacistId?.userId?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(booking.slotDate).toLocaleDateString()} at {booking.slotTime}
                  </p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  booking.status === 'completed' ? 'bg-green-100 text-green-700' :
                  booking.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                  booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {booking.status}
                </span>
              </div>
            </div>
          ))}
        </div>
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
      const totalRevenue = res.data.reduce((sum, p) => sum + (p.totalEarned * 2), 0) // totalEarned is 50%, so *2 for 100%
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
      <h2 className="text-2xl font-bold mb-6">💰 Payment Management</h2>
      
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
            <p className="text-gray-600 text-sm font-medium">Platform Share (50%)</p>
            <p className="text-3xl font-bold text-green-600">₹{adminRevenue.platformShare}</p>
            <p className="text-xs text-gray-500 mt-1">Your earnings</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium">Pharmacist Share (50%)</p>
            <p className="text-3xl font-bold text-orange-600">₹{adminRevenue.pharmacistShare}</p>
            <p className="text-xs text-gray-500 mt-1">To be paid out</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium">Per Booking</p>
            <p className="text-3xl font-bold text-purple-600">₹500</p>
            <p className="text-xs text-gray-500 mt-1">Standard rate</p>
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
              style={{ width: '50%' }}
            >
              Platform: ₹{adminRevenue.platformShare}
            </div>
            <div 
              className="bg-gradient-to-r from-orange-400 to-orange-500 h-8 flex items-center justify-center text-white text-sm font-bold"
              style={{ width: '50%' }}
            >
              Pharmacists: ₹{adminRevenue.pharmacistShare}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Platform Revenue: 50%</span>
            <span>Pharmacist Payouts: 50%</span>
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
function ReviewsTab({ pharmacists }) {
  const [allReviews, setAllReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPharmacist, setSelectedPharmacist] = useState('all')

  useEffect(() => {
    fetchAllReviews()
  }, [pharmacists])

  const fetchAllReviews = async () => {
    try {
      const reviewsPromises = pharmacists.map(async (pharmacist) => {
        try {
          const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/bookings/reviews/${pharmacist._id}`)
          return {
            pharmacist: pharmacist,
            ...res.data
          }
        } catch (err) {
          return {
            pharmacist: pharmacist,
            reviews: [],
            totalReviews: 0,
            averageRating: 0
          }
        }
      })

      const results = await Promise.all(reviewsPromises)
      setAllReviews(results)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching reviews:', err)
      setLoading(false)
    }
  }

  const filteredReviews = selectedPharmacist === 'all' 
    ? allReviews 
    : allReviews.filter(r => r.pharmacist._id === selectedPharmacist)

  const totalReviewsCount = allReviews.reduce((sum, r) => sum + r.totalReviews, 0)
  const overallAverage = allReviews.length > 0
    ? allReviews.reduce((sum, r) => sum + (r.averageRating * r.totalReviews), 0) / totalReviewsCount
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

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
          <p className="text-xs text-gray-500 mt-1">across all pharmacists</p>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm font-medium">Active Pharmacists</p>
          <p className="text-4xl font-bold text-green-600 mt-2">
            {allReviews.filter(r => r.totalReviews > 0).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">with reviews</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Pharmacist:</label>
        <select
          className="w-full md:w-64 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-600"
          value={selectedPharmacist}
          onChange={(e) => setSelectedPharmacist(e.target.value)}
        >
          <option value="all">All Pharmacists ({totalReviewsCount} reviews)</option>
          {allReviews.map((item) => (
            <option key={item.pharmacist._id} value={item.pharmacist._id}>
              {item.pharmacist.userId?.name} ({item.totalReviews} reviews)
            </option>
          ))}
        </select>
      </div>

      {/* Pharmacist Reviews */}
      {filteredReviews.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-600">No reviews found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredReviews.map((item) => (
            <div key={item.pharmacist._id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Pharmacist Header */}
              <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-4 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">{item.pharmacist.userId?.name}</h3>
                    <p className="text-sm opacity-90">{item.pharmacist.designation}</p>
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
                      <div key={review._id} className="border-l-4 border-orange-400 pl-4 py-2 bg-gray-50 rounded">
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
      setWebsiteSettings(res.data.settings)
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
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveSubTab('settings')}
            className={`py-2 px-4 font-medium text-sm ${
              activeSubTab === 'settings'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ⚙️ Settings
          </button>
          <button
            onClick={() => setActiveSubTab('hero')}
            className={`py-2 px-4 font-medium text-sm ${
              activeSubTab === 'hero'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🎯 Hero Section
          </button>
          <button
            onClick={() => setActiveSubTab('faqs')}
            className={`py-2 px-4 font-medium text-sm ${
              activeSubTab === 'faqs'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ❓ FAQs ({faqs.length})
          </button>
          <button
            onClick={() => setActiveSubTab('services')}
            className={`py-2 px-4 font-medium text-sm ${
              activeSubTab === 'services'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📞 Customer Service ({customerServices.length})
          </button>
          <button
            onClick={() => setActiveSubTab('legal')}
            className={`py-2 px-4 font-medium text-sm ${
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
          </div>
          <button
            onClick={() => updateWebsiteSettings({heroSection: websiteSettings.heroSection})}
            disabled={saving}
            className="mt-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Hero Section'}
          </button>
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