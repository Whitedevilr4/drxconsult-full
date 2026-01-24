const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Pharmacist = require('../models/Pharmacist');
const MedicalHistory = require('../models/MedicalHistory');
const { auth, isAdmin } = require('../middleware/auth');
const { sendUserSuspensionEmail, sendUserUnsuspensionEmail } = require('../utils/emailService');

const router = express.Router();

// Get all users (admin only)
router.get('/users', auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('suspendedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get user details (admin only)
router.get('/users/:id', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('suspendedBy', 'name email');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get additional info based on role
    let additionalInfo = {};
    if (user.role === 'pharmacist') {
      const pharmacist = await Pharmacist.findOne({ userId: user._id });
      additionalInfo.pharmacistProfile = pharmacist;
    }

    // Get user's medical history if patient
    if (user.role === 'patient') {
      const medicalHistory = await MedicalHistory.findOne({ patientId: user._id });
      additionalInfo.medicalHistory = medicalHistory;
    }

    res.json({
      user,
      ...additionalInfo
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Suspend user (admin only)
router.post('/users/:id/suspend', [
  auth,
  isAdmin,
  body('reason').notEmpty().withMessage('Suspension reason is required'),
  body('notes').optional()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { reason, notes } = req.body;
    const userId = req.params.id;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already suspended
    if (user.isSuspended) {
      return res.status(400).json({ message: 'User is already suspended' });
    }

    // Don't allow suspending other admins
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot suspend admin users' });
    }

    // Update user suspension status
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        isSuspended: true,
        suspendedAt: new Date(),
        suspendedBy: req.user.userId,
        suspensionReason: reason,
        suspensionNotes: notes || ''
      },
      { new: true }
    ).populate('suspendedBy', 'name');

    // Get admin name for email
    const admin = await User.findById(req.user.userId).select('name');
    
    // Send suspension email
    try {
      await sendUserSuspensionEmail(user.email, user.name, reason, admin.name);
    } catch (emailError) {
      console.error('Failed to send suspension email:', emailError);
      // Don't fail the suspension if email fails
    }

    res.json({
      message: 'User suspended successfully',
      user: updatedUser
    });
  } catch (err) {
    console.error('Error suspending user:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Unsuspend user (admin only)
router.post('/users/:id/unsuspend', auth, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is suspended
    if (!user.isSuspended) {
      return res.status(400).json({ message: 'User is not suspended' });
    }

    // Update user suspension status
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        isSuspended: false,
        suspendedAt: null,
        suspendedBy: null,
        suspensionReason: null,
        suspensionNotes: null
      },
      { new: true }
    );

    // Get admin name for email
    const admin = await User.findById(req.user.userId).select('name');
    
    // Send unsuspension email
    try {
      await sendUserUnsuspensionEmail(user.email, user.name, admin.name);
    } catch (emailError) {
      console.error('Failed to send unsuspension email:', emailError);
      // Don't fail the unsuspension if email fails
    }

    res.json({
      message: 'User unsuspended successfully',
      user: updatedUser
    });
  } catch (err) {
    console.error('Error unsuspending user:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get user activity/stats (admin only)
router.get('/users/:id/activity', auth, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select('name email role');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let activity = {
      user: user,
      stats: {}
    };

    if (user.role === 'patient') {
      const Booking = require('../models/Booking');
      const bookings = await Booking.find({ patientId: userId });
      
      activity.stats = {
        totalBookings: bookings.length,
        completedBookings: bookings.filter(b => b.status === 'completed').length,
        cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
        totalSpent: bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
        recentBookings: bookings.slice(-5).reverse()
      };
    } else if (user.role === 'pharmacist') {
      const Booking = require('../models/Booking');
      const pharmacist = await Pharmacist.findOne({ userId: userId });
      
      if (pharmacist) {
        const bookings = await Booking.find({ pharmacistId: pharmacist._id });
        
        activity.stats = {
          totalConsultations: bookings.length,
          completedConsultations: bookings.filter(b => b.status === 'completed').length,
          totalEarned: bookings.reduce((sum, b) => sum + (b.pharmacistShare || 0), 0),
          recentConsultations: bookings.slice(-5).reverse()
        };
      }
    }

    res.json(activity);
  } catch (err) {
    console.error('Error fetching user activity:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all pharmacists (admin only)
router.get('/pharmacists', auth, isAdmin, async (req, res) => {
  try {
    const pharmacists = await Pharmacist.find().populate('userId', 'name email');
    res.json(pharmacists);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create new pharmacist (admin only)
router.post('/pharmacists', [
  auth,
  isAdmin,
  body('name').notEmpty(),
  body('email').notEmpty(),
  body('password').isLength({ min: 6 }),
  body('designation').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, password, phone, designation, photo, description } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user account
    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      role: 'pharmacist'
    });
    await user.save();

    // Create pharmacist profile with uploaded photo or default
    const pharmacistPhoto = photo && photo.trim() !== '' 
      ? photo 
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=3498db&color=fff&bold=true`;
    
    const pharmacist = new Pharmacist({
      userId: user._id,
      designation,
      description: description || '',
      photo: pharmacistPhoto,
      totalPatientsCounselled: 0,
      availableSlots: []
    });
    await pharmacist.save();

    res.status(201).json({
      message: 'Pharmacist created successfully',
      user: { id: user._id, name: user.name, email: user.email },
      pharmacist
    });
  } catch (err) {
    console.error('Error creating pharmacist:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Upload test result for a patient (admin only)
router.post('/upload-test-result', [
  auth,
  isAdmin,
  body('patientId').notEmpty(),
  body('reportUrl').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { patientId, reportUrl, reportType } = req.body;

    // Find or create medical history
    let history = await MedicalHistory.findOne({ patientId });
    
    if (!history) {
      history = new MedicalHistory({
        patientId,
        documents: [],
        details: {}
      });
    }

    // Add the test result
    if (reportType === 'assessment') {
      history.assessmentReport = reportUrl;
    } else {
      history.documents.push(reportUrl);
    }
    
    history.updatedAt = Date.now();
    await history.save();

    res.json({
      message: 'Test result uploaded successfully',
      history
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all patients (admin only)
router.get('/patients', auth, isAdmin, async (req, res) => {
  try {
    const patients = await User.find({ role: 'patient' }).select('-password');
    res.json(patients);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get patient medical history (admin only)
router.get('/patients/:id/medical-history', auth, isAdmin, async (req, res) => {
  try {
    const history = await MedicalHistory.findOne({ patientId: req.params.id });
    res.json(history || {});
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update pharmacist details (admin only)
router.put('/pharmacists/:id', auth, isAdmin, async (req, res) => {
  try {
    const { designation, description, status, photo } = req.body;
    
    const pharmacist = await Pharmacist.findById(req.params.id);
    if (!pharmacist) {
      return res.status(404).json({ message: 'Pharmacist not found' });
    }

    if (designation) pharmacist.designation = designation;
    if (description !== undefined) pharmacist.description = description;
    if (status) pharmacist.status = status;
    if (photo) pharmacist.photo = photo;

    await pharmacist.save();

    res.json({
      message: 'Pharmacist updated successfully',
      pharmacist
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Toggle pharmacist status (admin only)
router.patch('/pharmacists/:id/status', auth, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    
    const pharmacist = await Pharmacist.findById(req.params.id);
    if (!pharmacist) {
      return res.status(404).json({ message: 'Pharmacist not found' });
    }

    pharmacist.status = status;
    await pharmacist.save();

    res.json({
      message: `Pharmacist status updated to ${status}`,
      pharmacist
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete pharmacist (admin only)
router.delete('/pharmacists/:id', auth, isAdmin, async (req, res) => {
  try {
    const pharmacist = await Pharmacist.findById(req.params.id);
    if (!pharmacist) {
      return res.status(404).json({ message: 'Pharmacist not found' });
    }

    await User.findByIdAndDelete(pharmacist.userId);
    await Pharmacist.findByIdAndDelete(req.params.id);

    res.json({ message: 'Pharmacist deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all self-assessments (admin only)
router.get('/self-assessments', auth, isAdmin, async (req, res) => {
  try {
    const assessments = await MedicalHistory.find({ 'selfAssessment.submitted': true })
      .populate('patientId', 'name email')
      .populate('assignedPharmacist');
    res.json(assessments);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Assign pharmacist to patient self-assessment (admin only)
router.post('/assign-pharmacist', auth, isAdmin, async (req, res) => {
  try {
    const { patientId, pharmacistId } = req.body;
    
    const history = await MedicalHistory.findOne({ patientId });
    if (!history) {
      return res.status(404).json({ message: 'Medical history not found' });
    }
    
    history.assignedPharmacist = pharmacistId;
    history.assignedAt = new Date();
    history.assignedBy = req.user.userId;
    history.updatedAt = Date.now();
    
    await history.save();
    
    const populated = await MedicalHistory.findById(history._id)
      .populate('assignedPharmacist')
      .populate('patientId', 'name email');
    
    res.json({ 
      message: 'Pharmacist assigned successfully',
      history: populated
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get pharmacist payments (admin only)
router.get('/pharmacist-payments', auth, isAdmin, async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    
    const bookings = await Booking.find({ status: 'completed' })
      .populate({
        path: 'pharmacistId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('patientId', 'name email');
    
    // Calculate payment stats per pharmacist
    const paymentStats = {};
    
    bookings.forEach(booking => {
      const pharmacistId = booking.pharmacistId?._id?.toString();
      const pharmacistName = booking.pharmacistId?.userId?.name || 'Unknown';
      
      if (!paymentStats[pharmacistId]) {
        paymentStats[pharmacistId] = {
          pharmacistId,
          name: pharmacistName,
          totalEarned: 0,
          totalPaid: 0,
          outstanding: 0,
          completedBookings: 0,
          unpaidBookings: []
        };
      }
      
      paymentStats[pharmacistId].totalEarned += booking.pharmacistShare || 0;
      paymentStats[pharmacistId].completedBookings++;
      
      if (booking.pharmacistPaid) {
        paymentStats[pharmacistId].totalPaid += booking.pharmacistShare || 0;
      } else {
        paymentStats[pharmacistId].outstanding += booking.pharmacistShare || 0;
        paymentStats[pharmacistId].unpaidBookings.push({
          bookingId: booking._id,
          patientName: booking.patientId?.name,
          date: booking.slotDate,
          amount: booking.pharmacistShare
        });
      }
    });
    
    res.json(Object.values(paymentStats));
  } catch (err) {
    console.error('Error fetching pharmacist payments:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Mark pharmacist payment as done (admin only)
router.post('/mark-payment-done', auth, isAdmin, async (req, res) => {
  try {
    const { bookingIds } = req.body;
    const Booking = require('../models/Booking');
    const { notifyPaymentApproved } = require('../utils/notificationHelper');
    
    if (!bookingIds || !Array.isArray(bookingIds)) {
      return res.status(400).json({ message: 'Booking IDs array required' });
    }
    
    // Get bookings before updating to calculate total amount and get pharmacist info
    const bookings = await Booking.find({ _id: { $in: bookingIds } })
      .populate({
        path: 'pharmacistId',
        populate: { path: 'userId', select: 'name' }
      });
    
    // Calculate total amount and group by pharmacist
    const pharmacistPayments = {};
    bookings.forEach(booking => {
      const pharmacistId = booking.pharmacistId?._id?.toString();
      const pharmacistUserId = booking.pharmacistId?.userId?._id?.toString();
      const pharmacistName = booking.pharmacistId?.userId?.name || 'Pharmacist';
      
      if (!pharmacistPayments[pharmacistId]) {
        pharmacistPayments[pharmacistId] = {
          pharmacistUserId,
          pharmacistName,
          totalAmount: 0,
          bookingCount: 0
        };
      }
      
      pharmacistPayments[pharmacistId].totalAmount += booking.pharmacistShare || 0;
      pharmacistPayments[pharmacistId].bookingCount++;
    });
    
    // Update bookings
    const result = await Booking.updateMany(
      { _id: { $in: bookingIds }, status: 'completed' },
      { 
        $set: { 
          pharmacistPaid: true,
          paidAt: new Date(),
          paidBy: req.user.userId
        }
      }
    );
    
    // Send notifications to each pharmacist
    for (const payment of Object.values(pharmacistPayments)) {
      if (payment.pharmacistUserId) {
        await notifyPaymentApproved({
          pharmacistUserId: payment.pharmacistUserId,
          pharmacistName: payment.pharmacistName,
          amount: payment.totalAmount,
          bookingCount: payment.bookingCount
        });
      }
    }
    
    res.json({ 
      message: `${result.modifiedCount} payment(s) marked as done`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error('Error marking payment as done:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get admin analytics (admin only)
router.get('/analytics', auth, isAdmin, async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    
    // Get all bookings with pharmacist and patient info
    const bookings = await Booking.find()
      .populate('patientId', 'name email')
      .populate({
        path: 'pharmacistId',
        populate: { path: 'userId', select: 'name email' }
      });
    
    // Calculate statistics
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
    const activeBookings = bookings.filter(b => b.status === 'confirmed').length;
    const treatedPatients = bookings.filter(b => b.treatmentStatus === 'treated').length;
    
    // Pharmacist performance
    const pharmacistStats = {};
    bookings.forEach(booking => {
      const pharmacistId = booking.pharmacistId?._id?.toString();
      const pharmacistName = booking.pharmacistId?.userId?.name || 'Unknown';
      
      if (!pharmacistStats[pharmacistId]) {
        pharmacistStats[pharmacistId] = {
          name: pharmacistName,
          totalBookings: 0,
          completed: 0,
          cancelled: 0,
          treated: 0
        };
      }
      
      pharmacistStats[pharmacistId].totalBookings++;
      if (booking.status === 'completed') pharmacistStats[pharmacistId].completed++;
      if (booking.status === 'cancelled') pharmacistStats[pharmacistId].cancelled++;
      if (booking.treatmentStatus === 'treated') pharmacistStats[pharmacistId].treated++;
    });
    
    res.json({
      overview: {
        totalBookings,
        completedBookings,
        cancelledBookings,
        activeBookings,
        treatedPatients
      },
      pharmacistPerformance: Object.values(pharmacistStats),
      recentBookings: bookings.slice(-10).reverse()
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;