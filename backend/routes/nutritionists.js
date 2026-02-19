const express = require('express');
const Nutritionist = require('../models/Nutritionist');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all nutritionists (public)
router.get('/', async (req, res) => {
  try {
    const nutritionists = await Nutritionist.find()
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });
    
    // Calculate rating and session statistics for each nutritionist
    const Booking = require('../models/Booking');
    const nutritionistsWithStats = await Promise.all(nutritionists.map(async (nutritionist) => {
      // Get all completed bookings for this nutritionist
      const completedBookings = await Booking.find({ 
        nutritionistId: nutritionist._id, 
        status: 'completed' 
      });
      
      // Calculate rating statistics
      const reviewedBookings = completedBookings.filter(booking => 
        booking.review && booking.review.rating
      );
      
      let averageRating = 0;
      let totalReviews = reviewedBookings.length;
      
      if (totalReviews > 0) {
        const totalRating = reviewedBookings.reduce((sum, booking) => 
          sum + booking.review.rating, 0
        );
        averageRating = totalRating / totalReviews;
      }
      
      // Convert to plain object and add statistics
      const nutritionistObj = nutritionist.toObject();
      nutritionistObj.averageRating = Math.round(averageRating * 10) / 10; // Round to 1 decimal
      nutritionistObj.totalReviews = totalReviews;
      nutritionistObj.completedSessions = completedBookings.length;
      
      return nutritionistObj;
    }));
    
    res.json(nutritionistsWithStats);
  } catch (err) {
    console.error('Error fetching nutritionists:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get nutritionist's bookings (for nutritionist dashboard) - MUST come before /:id route
router.get('/my-bookings', auth, async (req, res) => {
  try {
    const nutritionist = await Nutritionist.findOne({ userId: req.user.userId });
    
    if (!nutritionist) {
      return res.status(404).json({ message: 'Nutritionist profile not found' });
    }

    const Booking = require('../models/Booking');
    const bookings = await Booking.find({ 
      nutritionistId: nutritionist._id 
    })
    .populate('patientId', 'name email phone')
    .sort({ slotDate: -1 });

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching nutritionist bookings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get nutritionist's payment stats - MUST come before /:id route
router.get('/payment-stats', auth, async (req, res) => {
  try {
    const nutritionist = await Nutritionist.findOne({ userId: req.user.userId });
    
    if (!nutritionist) {
      return res.status(404).json({ message: 'Nutritionist profile not found' });
    }

    const Booking = require('../models/Booking');
    const completedBookings = await Booking.find({ 
      nutritionistId: nutritionist._id,
      status: 'completed'
    });

    const totalEarned = completedBookings.reduce((sum, booking) => {
      return sum + (booking.nutritionistShare || 250);
    }, 0);

    const paidBookings = completedBookings.filter(booking => booking.nutritionistPaid);
    const totalPaid = paidBookings.reduce((sum, booking) => {
      return sum + (booking.nutritionistShare || 250);
    }, 0);

    const outstanding = totalEarned - totalPaid;

    const stats = {
      totalEarned,
      totalPaid,
      outstanding,
      completedBookings: completedBookings.length,
      paidBookings: paidBookings.length,
      unpaidBookings: completedBookings.length - paidBookings.length
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update nutritionist slots - MUST come before /:id route
router.put('/slots', auth, async (req, res) => {
  try {
    const { slots } = req.body;
    
    // Find nutritionist by user ID
    const nutritionist = await Nutritionist.findOne({ userId: req.user.userId });
    
    if (!nutritionist) {
      return res.status(404).json({ message: 'Nutritionist profile not found' });
    }

    // Update slots
    nutritionist.availableSlots = slots;
    await nutritionist.save();

    res.json({ message: 'Slots updated successfully', slots: nutritionist.availableSlots });
  } catch (error) {
    console.error('Error updating nutritionist slots:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single nutritionist by ID (public) - MUST come after specific routes
router.get('/:id', async (req, res) => {
  try {
    const nutritionist = await Nutritionist.findById(req.params.id)
      .populate('userId', 'name email phone');
    
    if (!nutritionist) {
      return res.status(404).json({ message: 'Nutritionist not found' });
    }
    
    res.json(nutritionist);
  } catch (err) {
    console.error('Error fetching nutritionist:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create nutritionist profile (admin only)
router.post('/', auth, async (req, res) => {
  try {
    const {
      userId,
      specialization,
      qualification,
      experience,
      description,
      photo,
      consultationFee,
      licenseNumber
    } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if nutritionist profile already exists for this user
    const existingNutritionist = await Nutritionist.findOne({ userId });
    if (existingNutritionist) {
      return res.status(400).json({ message: 'Nutritionist profile already exists for this user' });
    }

    const nutritionist = new Nutritionist({
      userId,
      specialization,
      qualification,
      experience,
      description,
      photo,
      consultationFee: consultationFee || 500,
      licenseNumber
    });

    await nutritionist.save();

    // Update user role to nutritionist if not already
    if (user.role !== 'nutritionist' && user.role !== 'admin') {
      user.role = 'nutritionist';
      await user.save();
    }

    res.status(201).json(nutritionist);
  } catch (err) {
    console.error('Error creating nutritionist:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update nutritionist profile
router.put('/:id', auth, async (req, res) => {
  try {
    const nutritionist = await Nutritionist.findById(req.params.id);
    
    if (!nutritionist) {
      return res.status(404).json({ message: 'Nutritionist not found' });
    }

    // Update fields
    const allowedUpdates = [
      'specialization',
      'qualification',
      'experience',
      'description',
      'photo',
      'status',
      'consultationFee',
      'licenseNumber',
      'isVerified'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        nutritionist[field] = req.body[field];
      }
    });

    await nutritionist.save();
    res.json(nutritionist);
  } catch (err) {
    console.error('Error updating nutritionist:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add time slots
router.post('/:id/slots', auth, async (req, res) => {
  try {
    const nutritionist = await Nutritionist.findById(req.params.id);
    
    if (!nutritionist) {
      return res.status(404).json({ message: 'Nutritionist not found' });
    }

    const { slots } = req.body;
    
    if (!slots || !Array.isArray(slots)) {
      return res.status(400).json({ message: 'Slots array is required' });
    }

    // Add new slots
    slots.forEach(slot => {
      nutritionist.availableSlots.push({
        date: new Date(slot.date),
        startTime: slot.startTime,
        endTime: slot.endTime,
        isBooked: false
      });
    });

    await nutritionist.save();
    res.json(nutritionist);
  } catch (err) {
    console.error('Error adding slots:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete nutritionist
router.delete('/:id', auth, async (req, res) => {
  try {
    const nutritionist = await Nutritionist.findByIdAndDelete(req.params.id);
    
    if (!nutritionist) {
      return res.status(404).json({ message: 'Nutritionist not found' });
    }

    res.json({ message: 'Nutritionist deleted successfully' });
  } catch (err) {
    console.error('Error deleting nutritionist:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
