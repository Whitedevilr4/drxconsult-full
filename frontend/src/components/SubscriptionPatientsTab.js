import { useState } from 'react'
import SubscriptionChatWindow from '@/components/SubscriptionChatWindow'
import PatientHealthDataView from '@/components/PatientHealthDataView'

export default function SubscriptionPatientsTab({ patients, loading, onRefresh, currentUserId }) {
  const [search, setSearch] = useState('')
  const [openChat, setOpenChat] = useState(null)
  const [expandedHealth, setExpandedHealth] = useState(null) // bookingId

  const filtered = patients.filter(b => {
    const name = b.patientId?.name?.toLowerCase() || ''
    const email = b.patientId?.email?.toLowerCase() || ''
    const q = search.toLowerCase()
    return name.includes(q) || email.includes(q)
  })

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
        <p className="mt-3 text-gray-500">Loading subscription patients...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">💳 Subscription Patients</h2>
          <p className="text-sm text-gray-500 mt-1">Patients who booked you through their subscription plan</p>
        </div>
        <button
          onClick={onRefresh}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {patients.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No subscription patients yet</h3>
          <p className="text-gray-500 text-sm">When patients book you through their subscription plan, they'll appear here.</p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
            />
          </div>

          <div className="space-y-3">
            {filtered.map((booking) => {
              const patient = booking.patientId
              const bookedOn = new Date(booking.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
              })
              const isHealthOpen = expandedHealth === booking._id

              return (
                <div key={booking._id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  {/* Patient card row */}
                  <div className="p-4 flex items-center gap-4">
                    <img
                      src={patient?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(patient?.name || 'P')}&size=48&background=f59e0b&color=fff`}
                      alt={patient?.name}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-yellow-200"
                      onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(patient?.name || 'P')}&size=48` }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{patient?.name}</p>
                      <p className="text-sm text-gray-500 truncate">{patient?.email}</p>
                      {patient?.phone && <p className="text-xs text-gray-400">{patient.phone}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        booking.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {booking.status}
                      </span>
                      <p className="text-xs text-gray-400">Booked {bookedOn}</p>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setExpandedHealth(isHealthOpen ? null : booking._id)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                            isHealthOpen
                              ? 'bg-green-600 text-white'
                              : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200'
                          }`}
                        >
                          {isHealthOpen ? '▲ Health' : '▼ Health'}
                        </button>
                        <button
                          onClick={() => setOpenChat({ bookingId: booking._id, name: patient?.name })}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                        >
                          💬 Chat
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Health data dropdown */}
                  {isHealthOpen && (
                    <div className="border-t border-gray-100 px-4 pb-4">
                      <PatientHealthDataView
                        patientId={patient?._id || patient?.id}
                        patientName={patient?.name}
                      />
                    </div>
                  )}
                </div>
              )
            })}
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 py-6 text-sm">No patients match your search.</p>
            )}
          </div>
        </>
      )}

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
