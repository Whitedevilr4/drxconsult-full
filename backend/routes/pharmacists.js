const express = require('express');
const Pharmacist = require('../models/Pharmacist');
const User = require('../models/User');
const { auth, isPharmacist } = require('../middleware/auth');
const { withSlotCleanup } = require('../utils/slotCleanup');

const router = express.Router();

// Get all pharmacists (public)
router.get('/', async (req, res) => {
  try {
    const pharmacists = await Promise.race([
      Pharmacist.find().populate('userId', 'name email').maxTimeMS(5000),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      )
    ]);
    
    // Clean up expired slots automatically (non-blocking)
    const cleanedPharmacists = await withSlotCleanup(pharmacists, 'pharmacist');
    
    // Add rating and completed sessions data
    const Booking = require('../models/Booking');
    const pharmacistsWithStats = await Promise.all(
      cleanedPharmacists.map(async (pharmacist) => {
        try {
          // Get completed bookings with reviews with timeout
          const completedBookings = await Promise.race([
            Booking.find({
              pharmacistId: pharmacist._id,
              status: 'completed'
            }).maxTimeMS(3000),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Booking query timeout')), 3000)
            )
          ]);
          
          const reviewedBookings = completedBookings.filter(b => b.review && b.review.rating);
          
          const averageRating = reviewedBookings.length > 0
            ? reviewedBookings.reduce((sum, b) => sum + b.review.rating, 0) / reviewedBookings.length
            : 0;
          
          const pharmacistObj = pharmacist.toObject();
          pharmacistObj.averageRating = Math.round(averageRating * 10) / 10;
          pharmacistObj.totalReviews = reviewedBookings.length;
          pharmacistObj.completedSessions = completedBookings.length;
          
          return pharmacistObj;
        } catch (statsError) {
          console.error(`Error fetching stats for pharmacist ${pharmacist._id}:`, statsError);
          // Return pharmacist without stats if stats query fails
          const pharmacistObj = pharmacist.toObject();
          pharmacistObj.averageRating = 0;
          pharmacistObj.totalReviews = 0;
          pharmacistObj.completedSessions = 0;
          return pharmacistObj;
        }
      })
    );
    
    res.json(pharmacistsWithStats);
  } catch (err) {
    console.error('Error fetching pharmacists:', err);
    
    if (err.message === 'Database query timeout' || err.name === 'MongooseError') {
      return res.status(503).json({ 
        message: 'Database connection timeout. Please try again.',
        retryable: true 
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Get pharmacist payment stats (pharmacist only) - MUST come before /:id route
router.get('/payment-stats', auth, isPharmacist, async (req, res) => {
  try {
    const pharmacist = await Pharmacist.findOne({ userId: req.user.userId });
    if (!pharmacist) {
      return res.status(404).json({ message: 'Pharmacist profile not found' });
    }

    const Booking = require('../models/Booking');
    const bookings = await Booking.find({ 
      pharmacistId: pharmacist._id,
      status: 'completed'
    }).populate('patientId', 'name email');
    
    const totalEarned = bookings.reduce((sum, b) => sum + (b.pharmacistShare || 0), 0);
    const totalPaid = bookings.filter(b => b.pharmacistPaid).reduce((sum, b) => sum + (b.pharmacistShare || 0), 0);
    const outstanding = totalEarned - totalPaid;
    const completedBookings = bookings.length;
    const paidBookings = bookings.filter(b => b.pharmacistPaid).length;
    const unpaidBookings = bookings.filter(b => !b.pharmacistPaid);
    
    res.json({
      totalEarned,
      totalPaid,
      outstanding,
      completedBookings,
      paidBookings,
      unpaidBookings: unpaidBookings.length,
      unpaidBookingDetails: unpaidBookings.map(b => ({
        bookingId: b._id,
        patientName: b.patientId?.name || 'Unknown',
        date: b.slotDate,
        time: b.slotTime,
        amount: b.pharmacistShare
      })),
      paidBookingDetails: bookings.filter(b => b.pharmacistPaid).map(b => ({
        bookingId: b._id,
        patientName: b.patientId?.name || 'Unknown',
        date: b.slotDate,
        time: b.slotTime,
        amount: b.pharmacistShare,
        paidAt: b.paidAt
      }))
    });
  } catch (err) {
    console.error('Error fetching payment stats:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get pharmacist by ID
router.get('/:id', async (req, res) => {
  try {
    // Validate ObjectId format before proceeding
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid pharmacist ID format' });
    }
    
    // Clean up expired slots first
    await cleanupExpiredSlotsForPharmacist(req.params.id);
    
    const pharmacist = await Pharmacist.findById(req.params.id).populate('userId', 'name email');
    if (!pharmacist) {
      return res.status(404).json({ message: 'Pharmacist not found' });
    }
    
    // Add rating and completed sessions data
    const Booking = require('../models/Booking');
    const completedBookings = await Booking.find({
      pharmacistId: pharmacist._id,
      status: 'completed'
    });
    
    const reviewedBookings = completedBookings.filter(b => b.review && b.review.rating);
    
    const averageRating = reviewedBookings.length > 0
      ? reviewedBookings.reduce((sum, b) => sum + b.review.rating, 0) / reviewedBookings.length
      : 0;
    
    const pharmacistObj = pharmacist.toObject();
    pharmacistObj.averageRating = Math.round(averageRating * 10) / 10;
    pharmacistObj.totalReviews = reviewedBookings.length;
    pharmacistObj.completedSessions = completedBookings.length;
    
    res.json(pharmacistObj);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update available slots (pharmacist only)
router.put('/slots', auth, isPharmacist, async (req, res) => {
  try {
    const pharmacist = await Pharmacist.findOne({ userId: req.user.userId });
    if (!pharmacist) {
      return res.status(404).json({ message: 'Pharmacist profile not found' });
    }

    pharmacist.availableSlots = req.body.slots;
    await pharmacist.save();
    res.json(pharmacist);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
