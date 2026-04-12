/**
 * socketEmitter.js
 *
 * When SOCKET_SERVER_URL is set (separate socket server deployment),
 * events are forwarded via HTTP POST to the socket server's /emit endpoint.
 * Otherwise falls back to using the local `io` instance directly.
 */

const https = require('https');
const http = require('http');

const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL;
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

/**
 * Emit an event to a room.
 * @param {object|null} io - local Socket.IO instance (null when using remote)
 * @param {string} room
 * @param {string} event
 * @param {object} data
 */
const emitToRoom = (io, room, event, data) => {
  if (SOCKET_SERVER_URL) {
    // Forward to standalone socket server
    const body = JSON.stringify({ room, event, data });
    const url = new URL('/emit', SOCKET_SERVER_URL);
    const lib = url.protocol === 'https:' ? https : http;

    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'x-internal-secret': INTERNAL_SECRET
        }
      },
      (res) => {
        if (res.statusCode !== 200) {
          console.error(`⚠️ Socket emit failed: ${res.statusCode} for ${event} -> ${room}`);
        }
      }
    );

    req.on('error', (err) => {
      console.error('⚠️ Socket server HTTP emit error:', err.message);
    });

    req.write(body);
    req.end();
  } else if (io) {
    // Use local io instance
    io.to(room).emit(event, data);
  } else {
    console.warn('⚠️ No io instance and no SOCKET_SERVER_URL configured');
  }
};

// ── Convenience wrappers matching socketManager.js API ────────────────────────

const notifyNearbyHospitals = (io, hospitalUserIds, queryData) => {
  hospitalUserIds.forEach(userId => emitToRoom(io, `user:${userId}`, 'new-query', queryData));
};

const notifyQueryAccepted = (io, userId, queryData) => {
  emitToRoom(io, `user:${userId}`, 'query-accepted', queryData);
};

const notifyQueryRejected = (io, userId, queryData) => {
  emitToRoom(io, `user:${userId}`, 'query-rejected', queryData);
};

const notifyBookingCreated = (io, professionalUserId, bookingData) => {
  emitToRoom(io, `user:${professionalUserId}`, 'booking-created', bookingData);
};

const notifyBookingConfirmedToPatient = (io, patientUserId, bookingData) => {
  emitToRoom(io, `user:${patientUserId}`, 'booking-confirmed', bookingData);
};

const isUserOnline = () => false; // Not trackable from Vercel side
const getUserSocketId = () => null;

module.exports = {
  emitToRoom,
  notifyNearbyHospitals,
  notifyQueryAccepted,
  notifyQueryRejected,
  notifyBookingCreated,
  notifyBookingConfirmedToPatient,
  isUserOnline,
  getUserSocketId
};
