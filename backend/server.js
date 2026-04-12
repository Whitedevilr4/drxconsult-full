const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const { cleanupExpiredSlots } = require('./utils/slotCleanup');
const { cleanupExpiredOTPs } = require('./utils/otpService');
const { testSupabaseConnection, initializeStorageBuckets } = require('./config/supabase');
const medicineScheduler = require('./utils/medicineScheduler');

const app = express();
const server = http.createServer(app);

// When SOCKET_SERVER_URL is set, Socket.IO runs on a separate server (e.g. Railway/Render).
// In that case we skip creating a local io instance and use socketEmitter.js for outbound events.
const USE_SEPARATE_SOCKET_SERVER = !!process.env.SOCKET_SERVER_URL;

let io = null;
if (!USE_SEPARATE_SOCKET_SERVER) {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
}


// Make io accessible to routes
app.set('io', io);

// =====================
// Middleware
// =====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================
// MongoDB connection (OPTIMIZED FOR EXPRESS)
// =====================
const mongooseOptions = {
  serverSelectionTimeoutMS: 8000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10, // Limits connections per server instance
  minPoolSize: 2,
  maxIdleTimeMS: 10000,
  family: 4,
  bufferCommands: false
};

const connectDB = async () => {
  // Check if we are already connected
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
    console.log('✅ MongoDB connected successfully');
    return conn;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    // In standard Express, if DB fails at startup, we usually want to know immediately
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    throw err;
  }
};

// NOTE: The app.use middleware that called connectDB on every request has been REMOVED.
// This prevents connection spikes during high traffic.

// =====================
// Routes
// =====================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pharmacists', require('./routes/pharmacists'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/nutritionists', require('./routes/nutritionists'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/medical-history', require('./routes/medicalHistory'));
app.use('/api/medical-forms', require('./routes/medicalForms'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/uploads-v2', require('./routes/uploads-v2'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/pdf-proxy', require('./routes/pdf-proxy'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/website', require('./routes/website'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/health-trackers', require('./routes/healthTrackers'));
app.use('/api/health-report', require('./routes/healthReport'));
app.use('/api/hospitals', require('./routes/hospitals'));
app.use('/api/hospital-queries', require('./routes/hospitalQueries'));
app.use('/api/hospital-chats', require('./routes/hospitalChats'));
app.use('/api/hospital-bookings', require('./routes/hospitalBookings'));
app.use('/api/customer-service-chat', require('./routes/customerServiceChat'));

app.get('/', (req, res) => {
  res.json({
    message: 'Patient Counselling API',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// =====================
// Error Handlers
// =====================
app.use((err, req, res, next) => {
  console.error('❌ Global error handler:', err);
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(isDevelopment && { stack: err.stack })
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// =====================
// Server Start Sequence
// =====================
const PORT = process.env.PORT || 5000;
if (!USE_SEPARATE_SOCKET_SERVER) {
  const { initializeSocket } = require('./utils/socketManager');
  initializeSocket(io);
  console.log('✅ Local Socket.IO initialized');
} else {
  console.log(`✅ Using separate socket server: ${process.env.SOCKET_SERVER_URL}`);
}

// 🔥 The Fix: Connect to DB FIRST, then start listening
const startServer = async () => {
  try {
    await connectDB();
    
    server.listen(PORT, async () => {
      console.log(`🚀 Server running on port ${PORT}`);

      // Supabase init
      try {
        const supabaseTest = await Promise.race([
          testSupabaseConnection(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
        ]);
        if (supabaseTest.success) {
          await initializeStorageBuckets();
          console.log('✅ Supabase initialized');
        }
      } catch (e) {
        console.warn('⚠️ Supabase skip:', e.message);
      }

      // Initial cleanups
      cleanupExpiredSlots().catch(console.error);
      cleanupExpiredOTPs().catch(console.error);

      // Hourly cleanup (Removed connectDB call here since we are already connected)
      setInterval(() => {
        cleanupExpiredSlots().catch(console.error);
        cleanupExpiredOTPs().catch(console.error);
      }, 60 * 60 * 1000);
      
      // Medicine scheduler
      try {
        medicineScheduler.start();
        console.log('✅ Medicine scheduler started');
      } catch (error) {
        console.error('❌ Scheduler error:', error);
      }

      console.log('✅ Server initialization complete');
    });
  } catch (error) {
    console.error('❌ Critical Startup Error:', error);
    process.exit(1);
  }
};

startServer();
