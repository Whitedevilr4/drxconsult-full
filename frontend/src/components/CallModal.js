import { useEffect, useRef, useState, useCallback } from 'react'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
}

export default function CallModal({
  bookingId,
  currentUserId,
  remoteUserId,
  remoteName,
  callType = 'audio',
  incoming = false,
  incomingOffer = null,
  callerName = '',
  onClose
}) {
  const [status, setStatus] = useState(incoming ? 'incoming' : 'calling')
  const [isMuted, setIsMuted] = useState(false)
  const [isCamOff, setIsCamOff] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')

  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const timerRef = useRef(null)
  const iceCandidateQueue = useRef([])
  const statusRef = useRef(incoming ? 'incoming' : 'calling')

  // Keep statusRef in sync so callbacks don't use stale status
  const setStatusSafe = (s) => {
    statusRef.current = s
    setStatus(s)
  }

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current)
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    pcRef.current?.close()
    pcRef.current = null
    iceCandidateQueue.current = []
  }, [])

  const endCall = useCallback((notify = true) => {
    // Prevent double-firing
    if (['ended', 'rejected'].includes(statusRef.current)) return
    if (notify && window.io) {
      window.io.emit('call-end', { to: remoteUserId, bookingId })
    }
    cleanup()
    setStatusSafe('ended')
    setTimeout(onClose, 1200)
  }, [remoteUserId, bookingId, cleanup, onClose])

  const rejectCall = useCallback(() => {
    if (window.io) window.io.emit('call-reject', { to: remoteUserId, bookingId })
    cleanup()
    onClose()
  }, [remoteUserId, bookingId, cleanup, onClose])

  const initPC = useCallback(async () => {
    const constraints = callType === 'video'
      ? { audio: true, video: { width: 640, height: 480, facingMode: 'user' } }
      : { audio: true, video: false }

    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    localStreamRef.current = stream
    if (localVideoRef.current) localVideoRef.current.srcObject = stream

    const pc = new RTCPeerConnection(ICE_SERVERS)
    pcRef.current = pc

    stream.getTracks().forEach(t => pc.addTrack(t, stream))

    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0]
      }
    }

    pc.onicecandidate = (e) => {
      if (e.candidate && window.io) {
        window.io.emit('call-ice-candidate', { to: remoteUserId, candidate: e.candidate, bookingId })
      }
    }

    pc.onconnectionstatechange = () => {
      console.log('[Call] connection state:', pc.connectionState)
      if (pc.connectionState === 'connected') {
        setStatusSafe('active')
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
      }
      if (pc.connectionState === 'failed') endCall(false)
    }

    return pc
  }, [callType, remoteUserId, bookingId, endCall])

  const drainIceQueue = useCallback(async () => {
    const pc = pcRef.current
    if (!pc || !iceCandidateQueue.current.length) return
    for (const c of iceCandidateQueue.current) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)) } catch {}
    }
    iceCandidateQueue.current = []
  }, [])

  // ── Outgoing: create offer ───────────────────────────────────────────────
  useEffect(() => {
    if (incoming) return
    let cancelled = false

    ;(async () => {
      try {
        const pc = await initPC()
        if (cancelled || !pcRef.current) return

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: callType === 'video'
        })
        await pc.setLocalDescription(offer)

        if (!window.io) { setError('Socket not ready. Please refresh.'); return }

        console.log('[Call] emitting call-offer to', remoteUserId)
        window.io.emit('call-offer', {
          to: remoteUserId,
          offer: pc.localDescription,
          bookingId,
          callType,
          callerName: ''
        })
      } catch (err) {
        if (cancelled) return
        console.error('[Call] outgoing error:', err)
        setError(err.name === 'NotAllowedError'
          ? 'Microphone/camera permission denied.'
          : err.message || 'Call setup failed.')
        setTimeout(onClose, 2500)
      }
    })()

    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Accept incoming ──────────────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    try {
      setStatusSafe('connecting')
      const pc = await initPC()
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer))
      await drainIceQueue()
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      if (window.io) {
        window.io.emit('call-answer', { to: remoteUserId, answer: pc.localDescription, bookingId })
      }
    } catch (err) {
      console.error('[Call] accept error:', err)
      setError(err.name === 'NotAllowedError'
        ? 'Microphone/camera permission denied.'
        : err.message || 'Could not connect.')
      setTimeout(onClose, 2500)
    }
  }, [initPC, incomingOffer, remoteUserId, bookingId, drainIceQueue, onClose])

  // ── Signaling listeners ──────────────────────────────────────────────────
  useEffect(() => {
    // Poll until window.io is available (it may not be ready at mount)
    let socket = window.io
    let pollTimer = null

    const attach = (s) => {
      const onAnswer = ({ answer, from }) => {
        // Only process if it's from the expected remote user
        if (from && from !== remoteUserId) return
        const pc = pcRef.current
        if (!pc || pc.signalingState !== 'have-local-offer') return
        pc.setRemoteDescription(new RTCSessionDescription(answer))
          .then(() => drainIceQueue())
          .catch(e => console.error('[Call] setRemoteDescription error:', e))
      }

      const onIce = ({ candidate, from }) => {
        if (from && from !== remoteUserId) return
        const pc = pcRef.current
        if (!pc || !candidate) return
        if (pc.remoteDescription) {
          pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
        } else {
          iceCandidateQueue.current.push(candidate)
        }
      }

      const onEnd = ({ from }) => {
        if (from && from !== remoteUserId) return
        endCall(false)
      }

      const onReject = ({ from }) => {
        if (from && from !== remoteUserId) return
        cleanup()
        setStatusSafe('rejected')
        setTimeout(onClose, 1500)
      }

      s.on('call-answer', onAnswer)
      s.on('call-ice-candidate', onIce)
      s.on('call-end', onEnd)
      s.on('call-reject', onReject)

      return () => {
        s.off('call-answer', onAnswer)
        s.off('call-ice-candidate', onIce)
        s.off('call-end', onEnd)
        s.off('call-reject', onReject)
      }
    }

    if (socket) {
      return attach(socket)
    }

    // window.io not ready yet — poll every 100ms
    let detach = () => {}
    pollTimer = setInterval(() => {
      if (window.io) {
        clearInterval(pollTimer)
        detach = attach(window.io)
      }
    }, 100)

    return () => {
      clearInterval(pollTimer)
      detach()
    }
  }, [remoteUserId, endCall, cleanup, onClose, drainIceQueue])

  useEffect(() => () => cleanup(), [cleanup])

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setIsMuted(m => !m)
  }

  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    setIsCamOff(c => !c)
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const displayName = incoming ? (callerName || remoteName) : remoteName

  const statusText = {
    calling: 'Calling…',
    incoming: callType === 'video' ? 'Incoming video call' : 'Incoming voice call',
    connecting: 'Connecting…',
    active: fmt(duration),
    ended: 'Call ended',
    rejected: 'Call declined'
  }[status] || ''

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Remote video */}
        {callType === 'video' && (
          <div className="relative bg-black" style={{ height: 240 }}>
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <video ref={localVideoRef} autoPlay playsInline muted
              className="absolute bottom-2 right-2 w-24 rounded-lg object-cover border-2 border-white/30"
              style={{ height: 68 }} />
          </div>
        )}

        {/* Audio avatar + hidden remote audio */}
        {callType === 'audio' && (
          <div className="flex flex-col items-center pt-10 pb-2">
            <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-3xl mb-3 shadow-lg">
              {displayName?.[0]?.toUpperCase() || '?'}
            </div>
            <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
          </div>
        )}

        {/* Name + status */}
        <div className="px-4 py-3 text-center">
          <p className="text-white font-semibold text-base">{displayName}</p>
          <p className={`text-sm mt-0.5 ${status === 'active' ? 'text-green-400' : status === 'rejected' ? 'text-red-400' : 'text-gray-400'}`}>
            {error || statusText}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 px-6 pb-6">
          {status === 'incoming' && (
            <>
              <button onClick={rejectCall}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-2xl shadow-lg transition-colors"
                title="Decline">📵</button>
              <button onClick={acceptCall}
                className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-2xl shadow-lg transition-colors"
                title="Accept">📞</button>
            </>
          )}

          {['calling', 'connecting', 'active'].includes(status) && (
            <>
              <button onClick={toggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow transition-colors ${isMuted ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'} text-white`}
                title={isMuted ? 'Unmute' : 'Mute'}>
                {isMuted ? '🔇' : '🎙️'}
              </button>
              {callType === 'video' && (
                <button onClick={toggleCam}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow transition-colors ${isCamOff ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'} text-white`}
                  title={isCamOff ? 'Camera on' : 'Camera off'}>
                  {isCamOff ? '📷' : '🎥'}
                </button>
              )}
              <button onClick={() => endCall(true)}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-2xl shadow-lg transition-colors text-white"
                title="End call">📵</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
