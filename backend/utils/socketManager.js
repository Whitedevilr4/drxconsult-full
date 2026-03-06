const jwt = require('jsonwebtoken');

// Store connected users with their socket IDs
const connectedUsers = new Map(); // userId -> socketId

const initializeSocket = (io) => {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        console.error('❌ No token provided');
        return next(new Error('Authentication error: No token'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      console.error('❌ Socket authentication failed:', err.message);
      next(new Error('Authentication error: ' + err.message));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected (${socket.userRole})`);
    console.log(`Socket ID: ${socket.id}`);
    
    // Store user connection
    connectedUsers.set(socket.userId, socket.id);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Join role-specific room
    if (socket.userRole === 'hospital') {
      socket.join('hospitals');
    } else if (socket.userRole === 'admin') {
      socket.join('admins');
    }

    // Handle joining customer service chat session
    socket.on('join-cs-session', (sessionId) => {
      console.log(`📥 User joining customer service session: ${sessionId}`);
      socket.join(`cs-session:${sessionId}`);
      console.log(`✅ User joined CS session: ${sessionId}`);
    });

    // Handle leaving customer service chat session
    socket.on('leave-cs-session', (sessionId) => {
      socket.leave(`cs-session:${sessionId}`);
      console.log(`User left CS session: ${sessionId}`);
    });

    // Test event handler
    socket.on('test-event', (data) => {
      console.log('🧪 Test event received:', data);
    });

    // Handle joining query chat room
    socket.on('join-query-chat', (queryId) => {
      console.log(`📥 User joining query chat: ${queryId}`);
      socket.join(`query:${queryId}`);
      console.log(`✅ User joined query chat: ${queryId}`);
      
      // Verify room membership
      const room = io.sockets.adapter.rooms.get(`query:${queryId}`);
      console.log(`Room query:${queryId} now has ${room ? room.size : 0} members:`, room ? Array.from(room) : []);
      
      // Send confirmation back to client
      socket.emit('joined-room', { queryId, success: true });
    });

    // Handle leaving query chat room
    socket.on('leave-query-chat', (queryId) => {
      socket.leave(`query:${queryId}`);
      console.log(`User left query chat: ${queryId}`);
    });

    // Handle chat message
    socket.on('send-message', async (data) => {
      const { queryId, message, senderType } = data;
      
      console.log(`📤 Broadcasting message to query:${queryId}`);
      
      // Broadcast to all users in the query chat room (including sender)
      io.to(`query:${queryId}`).emit('new-message', {
        queryId,
        message,
        senderType,
        senderId: socket.userId,
        timestamp: new Date()
      });
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { queryId, isTyping } = data;
      
      // Broadcast to all OTHER users in the room (not including sender)
      socket.to(`query:${queryId}`).emit('user-typing', {
        queryId,
        userId: socket.userId,
        isTyping
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected`);
      connectedUsers.delete(socket.userId);
    });
  });

  return io;
};

// Emit new query notification to nearby hospitals
const notifyNearbyHospitals = (io, hospitalUserIds, queryData) => {
  hospitalUserIds.forEach(userId => {
    io.to(`user:${userId}`).emit('new-query', queryData);
  });
};

// Emit query acceptance notification to user
const notifyQueryAccepted = (io, userId, queryData) => {
  console.log('📨 Notifying user of query acceptance');
  
  // Check if user is in the room
  const room = io.sockets.adapter.rooms.get(`user:${userId}`);
  if (room) {
    console.log(`✅ User has ${room.size} socket(s) in room`);
  } else {
    console.log(`⚠️ User not in room (offline or not connected)`);
  }
  
  io.to(`user:${userId}`).emit('query-accepted', queryData);
  console.log('✅ query-accepted event emitted');
};

// Emit query rejection notification to user
const notifyQueryRejected = (io, userId, queryData) => {
  io.to(`user:${userId}`).emit('query-rejected', queryData);
};

// Emit booking notification to professional
const notifyBookingCreated = (io, professionalUserId, bookingData) => {
  console.log('📅 Notifying professional of new booking');
  
  const room = io.sockets.adapter.rooms.get(`user:${professionalUserId}`);
  if (room) {
    console.log(`✅ Professional has ${room.size} socket(s) in room`);
  } else {
    console.log(`⚠️ Professional not in room (offline)`);
  }
  
  io.to(`user:${professionalUserId}`).emit('booking-created', bookingData);
  console.log('✅ booking-created event emitted');
};

// Emit booking notification to patient
const notifyBookingConfirmedToPatient = (io, patientUserId, bookingData) => {
  console.log('📅 Notifying patient of booking confirmation');
  io.to(`user:${patientUserId}`).emit('booking-confirmed', bookingData);
};

// Check if user is online
const isUserOnline = (userId) => {
  return connectedUsers.has(userId);
};

// Get socket ID for user
const getUserSocketId = (userId) => {
  return connectedUsers.get(userId);
};

module.exports = {
  initializeSocket,
  notifyNearbyHospitals,
  notifyQueryAccepted,
  notifyQueryRejected,
  notifyBookingCreated,
  notifyBookingConfirmedToPatient,
  isUserOnline,
  getUserSocketId
};
