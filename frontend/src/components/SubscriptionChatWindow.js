import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
import CallModal from '@/components/CallModal'

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace('/api', '')

export default function SubscriptionChatWindow({ bookingId, currentUserId, otherUserId, otherName, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isChatOpen, setIsChatOpen] = useState(true)
  const [chatExpiry, setChatExpiry] = useState(null)
  const [isCancelled, setIsCancelled] = useState(false)

  // Call state
  const [activeCall, setActiveCall] = useState(null)
  // { type: 'outgoing'|'incoming', callType: 'audio'|'video', offer?, callerName? }

  const socketRef = useRef(null)
  const bottomRef = useRef(null)

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/chat`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (Array.isArray(res.data)) {
        setMessages(res.data)
      } else {
        setMessages(res.data.messages || [])
        setIsChatOpen(res.data.isChatOpen ?? true)
        setChatExpiry(res.data.chatExpiry ? new Date(res.data.chatExpiry) : null)
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setIsCancelled(true)
        setIsChatOpen(false)
      }
      console.error('Error fetching messages:', err)
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    fetchMessages()

    const token = localStorage.getItem('token')
    const socket = io(SOCKET_URL, { auth: { token } })
    socketRef.current = socket

    socket.emit('join-booking-chat', bookingId)

    socket.on('new-booking-message', (msg) => {
      setMessages(prev => {
        if (prev.find(m => m._id === msg._id)) return prev
        return [...prev, msg]
      })
    })

    // Incoming call offer — listen on global socket (user:<id> room)
    // Filter by bookingId and ignore own events
    const globalSocket = window.io
    const handleCallOffer = ({ from, offer, callType, callerName, bookingId: bid }) => {
      if (bid !== bookingId) return          // not for this chat
      if (from === currentUserId) return     // ignore own echo
      setActiveCall({ type: 'incoming', callType, offer, callerName: callerName || otherName, from })
    }
    if (globalSocket) globalSocket.on('call-offer', handleCallOffer)

    return () => {
      socket.emit('leave-booking-chat', bookingId)
      socket.disconnect()
      if (globalSocket) globalSocket.off('call-offer', handleCallOffer)
    }
  }, [bookingId, fetchMessages, otherName])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Re-check expiry every minute
  useEffect(() => {
    if (!chatExpiry) return
    const interval = setInterval(() => {
      setIsChatOpen(new Date() < chatExpiry)
    }, 60000)
    return () => clearInterval(interval)
  }, [chatExpiry])

  const sendMessage = async () => {
    if (!input.trim() || sending || !isChatOpen) return
    setSending(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/chat`,
        { message: input.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setMessages(prev => {
        if (prev.find(m => m._id === res.data._id)) return prev
        return [...prev, res.data]
      })
      setInput('')
    } catch (err) {
      console.error('Error sending message:', err)
    } finally {
      setSending(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const startCall = () => {
    alert('🚧 Feature coming soon!')
  }

  // Cancelled bookings: close the window — no chat access
  if (isCancelled) {
    onClose()
    return null
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50" style={{ height: '480px' }}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 rounded-t-2xl ${isChatOpen ? 'bg-blue-600' : 'bg-gray-500'}`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isChatOpen ? 'bg-green-400' : 'bg-gray-300'}`}></div>
            <span className="text-white font-semibold text-sm truncate">{otherName || 'Chat'}</span>
            {!isChatOpen && <span className="text-xs text-gray-200 flex-shrink-0">(closed)</span>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            {/* Audio call button */}
            {isChatOpen && otherUserId && (
              <button
                onClick={() => startCall('audio')}
                title="Voice call"
                className="text-white hover:text-green-300 transition-colors px-1 text-base"
              >
                📞
              </button>
            )}
            {/* Video call button */}
            {isChatOpen && otherUserId && (
              <button
                onClick={() => startCall('video')}
                title="Video call"
                className="text-white hover:text-green-300 transition-colors px-1 text-base"
              >
                🎥
              </button>
            )}
            <button onClick={onClose} className="text-white hover:text-blue-200 text-lg leading-none ml-1">✕</button>
          </div>
        </div>

        {/* Expiry notice */}
        {!isChatOpen && (
          <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-700 text-center">
            Chat closed — 48 hours after consultation has ended. Messages are view-only.
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gray-50">
          {loading ? (
            <div className="text-center text-gray-400 text-sm mt-8">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 text-sm mt-8">No messages yet. Say hello!</div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId?._id === currentUserId || msg.senderId === currentUserId
              return (
                <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                  }`}>
                    {!isMe && (
                      <p className="text-xs font-semibold text-blue-600 mb-0.5">{msg.senderId?.name}</p>
                    )}
                    <p className="break-words">{msg.message}</p>
                    <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {isChatOpen ? (
          <div className="px-3 py-2 border-t border-gray-200 flex gap-2 items-end">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message..."
              className="flex-1 resize-none px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 max-h-24"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors flex-shrink-0"
            >
              {sending ? '...' : '➤'}
            </button>
          </div>
        ) : (
          <div className="px-3 py-2 border-t border-gray-200 text-center text-xs text-gray-400">
            🔒 Chat is read-only
          </div>
        )}
      </div>

      {/* Call modal */}
      {activeCall && (
        <CallModal
          bookingId={bookingId}
          currentUserId={currentUserId}
          remoteUserId={activeCall.from || otherUserId}
          remoteName={otherName}
          callType={activeCall.callType}
          incoming={activeCall.type === 'incoming'}
          incomingOffer={activeCall.offer || null}
          callerName={activeCall.callerName || otherName}
          onClose={() => setActiveCall(null)}
        />
      )}
    </>
  )
}
