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
  serverSelectionTimeoutMS: 5000, // Reduced from 8000 for faster failure
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  maxPoolSize: 5, // Reduced from 10 for serverless
  minPoolSize: 1, // Reduced from 2 for serverless
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  bufferCommands: false // Disable mongoose buffering
  // Removed bufferMaxEntries as it's not supported in newer versions
};

// Initialize MongoDB connection
let isConnected = false;
let connectionPromise = null;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }
  
  // If there's already a connection attempt in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }
  
  connectionPromise = (async () => {
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
      }
      isConnected = true;
      console.log('✅ MongoDB connected successfully');
      return true;
    } catch (err) {
      console.error('❌ MongoDB connection error:', err);
      isConnected = false;
      connectionPromise = null; // Reset promise so we can retry
      throw err;
    }
  })();
  
  return connectionPromise;
};

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
  isConnected = false;
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
  isConnected = false;
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
  isConnected = true;
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
    timestamp: new Date().toISOString(),
    mongodb: isConnected ? 'connected' : 'disconnected'
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

// For Vercel serverless functions, we need to export the app
if (process.env.NODE_ENV === 'production') {
  // Connect to database on first request with better error handling
  app.use(async (req, res, next) => {
    try {
      await Promise.race([
        connectDB(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database connection timeout')), 8000)
        )
      ]);
      next();
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      
      // Return specific error for timeout issues
      if (error.message.includes('timeout') || error.name === 'MongooseError') {
        return res.status(503).json({ 
          message: 'Database connection timeout. Please try again in a moment.',
          retryable: true,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(503).json({ 
        message: 'Database connection failed. Please try again.',
        retryable: true,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  module.exports = app;
} else {
  // Development server
  const PORT = process.env.PORT || 5000;
  
  const startServer = async () => {
    try {
      await connectDB();
      
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
        
        // Schedule cleanup to run every hour
        setInterval(() => {
          cleanupExpiredSlots();
          cleanupExpiredOTPs();
        }, 60 * 60 * 1000); // 1 hour
        
        console.log('✅ Server initialization complete');
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  };
  
  startServer();
}
