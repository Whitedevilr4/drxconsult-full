const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { auth } = require('../middleware/auth');
const { withSlotCleanup } = require('../utils/slotCleanup');

// Get all doctors
router.get('/', async (req, res) => {
  try {
    const doctors = await Doctor.find()
      .populate('userId', 'name email phone profilePicture')
      .sort({ createdAt: -1 });
    
    // Simple cleanup - just filter expired slots in memory
    const cleanedDoctors = await withSlotCleanup(doctors, 'doctor');
    
    // Calculate rating and session statistics for each doctor
    const doctorsWithStats = await Promise.all(cleanedDoctors.map(async (doctor) => {
      try {
        // Get all completed bookings for this doctor
        const completedBookings = await Booking.find({ 
          doctorId: doctor._id, 
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
        const doctorObj = doctor.toObject();
        doctorObj.averageRating = Math.round(averageRating * 10) / 10; // Round to 1 decimal
        doctorObj.totalReviews = totalReviews;
        doctorObj.completedSessions = completedBookings.length;
        
        return doctorObj;
      } catch (statsError) {
        console.error(`Error fetching stats for doctor ${doctor._id}:`, statsError);
        // Return doctor without stats if stats query fails
        const doctorObj = doctor.toObject();
        doctorObj.averageRating = 0;
        doctorObj.totalReviews = 0;
        doctorObj.completedSessions = 0;
        return doctorObj;
      }
    }));
    
    res.json(doctorsWithStats);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get doctor's bookings (for doctor dashboard) - MUST come before /:id route
router.get('/my-bookings', auth, async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user.userId });
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    const bookings = await Booking.find({ 
      doctorId: doctor._id 
    })
    .populate('patientId', 'name email phone')
    .sort({ slotDate: -1 });

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching doctor bookings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get doctor's payment stats - MUST come before /:id route
router.get('/payment-stats', auth, async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user.userId });
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    const completedBookings = await Booking.find({ 
      doctorId: doctor._id,
      status: 'completed'
    });

    const totalEarned = completedBookings.reduce((sum, booking) => {
      return sum + (booking.doctorShare || 250);
    }, 0);

    const paidBookings = completedBookings.filter(booking => booking.doctorPaid);
    const totalPaid = paidBookings.reduce((sum, booking) => {
      return sum + (booking.doctorShare || 250);
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

// Update doctor slots - MUST come before /:id route
router.put('/slots', auth, async (req, res) => {
  try {
    const { slots } = req.body;
    
    // Find doctor by user ID
    const doctor = await Doctor.findOne({ userId: req.user.userId });
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    // Update slots
    doctor.availableSlots = slots;
    await doctor.save();

    res.json({ message: 'Slots updated successfully', slots: doctor.availableSlots });
  } catch (error) {
    console.error('Error updating doctor slots:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get doctor by ID - MUST come after specific routes
router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('userId', 'name email phone profilePicture');
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.json(doctor);
  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update doctor profile
router.put('/:id', auth, async (req, res) => {
  try {
    const { specialization, qualification, experience, description, photo, consultationFee, licenseNumber } = req.body;
    
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      {
        specialization,
        qualification,
        experience,
        description,
        photo,
        consultationFee,
        licenseNumber,
        updatedAt: Date.now()
      },
      { new: true }
    ).populate('userId', 'name email phone');

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json(doctor);
  } catch (error) {
    console.error('Error updating doctor:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update doctor status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: Date.now() },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json({ message: 'Status updated successfully', doctor });
  } catch (error) {
    console.error('Error updating doctor status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete doctor
router.delete('/:id', auth, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Update user role back to patient
    await User.findByIdAndUpdate(doctor.userId, { role: 'patient' });
    
    // Delete doctor profile
    await Doctor.findByIdAndDelete(req.params.id);

    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
