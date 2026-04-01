const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { cleanupExpiredSlots } = require('./utils/slotCleanup');
const { cleanupExpiredOTPs } = require('./utils/otpService');
const { testSupabaseConnection, initializeStorageBuckets } = require('./config/supabase');
const medicineScheduler = require('./utils/medicineScheduler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});



// Make io accessible to routes
app.set('io', io);
// =====================
// Middleware
// =====================
// Middleware
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// =====================
// MongoDB connection (FIXED, SAME STRUCTURE)
// =====================
const mongooseOptions = {
  serverSelectionTimeoutMS: 8000,
  socketTimeoutMS: 45000,
  maxPoolSize: 1,
  minPoolSize: 0,
  maxIdleTimeMS: 10000,
  family: 4,
  bufferCommands: false
};

// ✅ GLOBAL CACHE (critical fix)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, mongooseOptions)
      .then((mongooseInstance) => {
        console.log('✅ MongoDB connected successfully');
        return mongooseInstance;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    console.error('❌ MongoDB connection error:', err);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    throw err;
  }

  return cached.conn;
};

// =====================
// Ensure DB before routes (FIXED)
// =====================
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// =====================
// Routes (UNCHANGED)
// =====================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pharmacists', require('./routes/pharmacists'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/nutritionists', require('./routes/nutritionists'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/medical-history', require('./routes/medicalHistory'));
app.use('/api/medical-forms', require('./routes/medicalForms')); // New medical forms route
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
// Global error handler (UNCHANGED)
// =====================
app.use((err, req, res, next) => {
  console.error('❌ Global error handler:', err);

  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// =====================
// 404 handler (UNCHANGED)
// =====================
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// =====================
// Server start (STRUCTURE KEPT)
// =====================
const PORT = process.env.PORT || 5000;
// Initialize Socket.IO
const { initializeSocket } = require('./utils/socketManager');
initializeSocket(io);

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Supabase init
  try {
    console.log('🔍 Testing Supabase connection...');
    const supabaseTest = await Promise.race([
      testSupabaseConnection(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabase connection timeout')), 10000)
      )
    ]);

    if (supabaseTest.success) {
      console.log('✅ Supabase connected successfully');
      await initializeStorageBuckets();
    } else {
      console.warn('⚠️ Supabase connection failed:', supabaseTest.error);
    }
  } catch (error) {
    console.warn('⚠️ Supabase initialization error:', error.message);
  }

  // Initial cleanup
  cleanupExpiredSlots().catch(console.error);
  cleanupExpiredOTPs().catch(console.error);

  // Scheduled cleanup (STRUCTURE KEPT)
  setInterval(() => {
    cleanupExpiredSlots();
    cleanupExpiredOTPs();
  }, 60 * 60 * 1000);
  // Initialize medicine scheduler
  try {
    console.log('🏥 Initializing medicine scheduler...');
    medicineScheduler.start();
    console.log('✅ Medicine scheduler started successfully');
  } catch (error) {
    console.error('❌ Medicine scheduler initialization error:', error);
  }

  console.log('✅ Server initialization complete');
});
