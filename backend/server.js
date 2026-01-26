const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { cleanupExpiredSlots } = require('./utils/slotCleanup');
const { cleanupExpiredOTPs } = require('./utils/otpService');
const { testSupabaseConnection, initializeStorageBuckets } = require('./config/supabase');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection with optimized settings for Vercel
const mongooseOptions = {
  serverSelectionTimeoutMS: 8000, // Keep trying to send operations for 8 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 2, // Maintain a minimum of 2 socket connections
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  family: 4 // Use IPv4, skip trying IPv6
};

mongoose.connect(process.env.MONGODB_URI, mongooseOptions)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    // Don't exit in production, let Vercel handle it
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pharmacists', require('./routes/pharmacists'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/medical-history', require('./routes/medicalHistory'));
app.use('/api/uploads', require('./routes/uploads')); // Legacy upload route
app.use('/api/uploads-v2', require('./routes/uploads-v2')); // New upload route with Supabase
app.use('/api/admin', require('./routes/admin'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/pdf-proxy', require('./routes/pdf-proxy'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/website', require('./routes/website'));
app.use('/api/subscriptions', require('./routes/subscriptions'));

app.get('/', (req, res) => {
  res.json({ 
    message: 'Patient Counselling API',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global error handler:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(isDevelopment && { stack: err.stack, details: err })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Test Supabase connection with timeout
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
      // Initialize storage buckets
      await initializeStorageBuckets();
    } else {
      console.warn('⚠️  Supabase connection failed:', supabaseTest.error);
    }
  } catch (error) {
    console.warn('⚠️  Supabase initialization error:', error.message);
  }
  
  // Run cleanup on server start
  cleanupExpiredSlots()
    .then(count => {
      if (count > 0) {
        console.log(`🧹 Cleaned up ${count} expired slots`);
      }
    })
    .catch(err => console.error('Initial cleanup error:', err));
  
  // Initial OTP cleanup
  cleanupExpiredOTPs()
    .then(count => {
      if (count > 0) {
        console.log(`🧹 Cleaned up ${count} expired OTPs`);
      }
    })
    .catch(err => console.error('Initial OTP cleanup error:', err));
  
  // Schedule cleanup to run every hour (disabled for serverless compatibility)
  // Note: In Vercel serverless environment, setInterval doesn't work
  // Cleanup now happens on-demand in route handlers
  // setInterval(() => {
  //   cleanupExpiredSlots();
  //   cleanupExpiredOTPs();
  // }, 60 * 60 * 1000); // 1 hour
  
  console.log('✅ Server initialization complete');
});
