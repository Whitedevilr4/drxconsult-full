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

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    // MongoDB connected successfully
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pharmacists', require('./routes/pharmacists'));
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

app.get('/', (req, res) => {
  res.json({ message: 'Patient Counselling API' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {

  // Test Supabase connection
  const supabaseTest = await testSupabaseConnection();
  if (supabaseTest.success) {
    // Initialize storage buckets
    await initializeStorageBuckets();
  }
  
  // Run cleanup on server start
  cleanupExpiredSlots()
    .then(count => {
      if (count > 0) {
        // Cleanup completed
      }
    })
    .catch(err => console.error('Initial cleanup error:', err));
  
  // Initial OTP cleanup
  cleanupExpiredOTPs()
    .then(count => {
      if (count > 0) {
        // OTP cleanup completed
      }
    })
    .catch(err => console.error('Initial OTP cleanup error:', err));
  
  // Schedule cleanup to run every hour
  setInterval(() => {
    cleanupExpiredSlots();
    cleanupExpiredOTPs();
  }, 60 * 60 * 1000); // 1 hour
});
