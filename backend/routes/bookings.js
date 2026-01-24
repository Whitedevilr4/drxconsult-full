const express = require('express');
const Booking = require('../models/Booking');
const Pharmacist = require('../models/Pharmacist');
const User = require('../models/User');
const { auth, isPharmacist } = require('../middleware/auth');
const { createMeetLink } = require('../utils/googleMeet');
const { cleanupExpiredSlotsForPharmacist } = require('../utils/slotCleanup');
const { notifyBookingConfirmed, notifyMeetingLinkAdded, notifyTestResultUploaded } = require('../utils/notificationHelper');
const { 
  sendBookingConfirmationEmail, 
  sendPharmacistBookingNotification, 
  sendMeetingLinkEmail, 
  sendReportSubmittedEmail, 
  sendTestResultEmail 
} = require('../utils/emailService');

const router = express.Router();

// Get available slots for a pharmacist (public)
router.get('/available-slots/:pharmacistId', async (req, res) => {
  try {
    // Clean up expired slots first
    await cleanupExpiredSlotsForPharmacist(req.params.pharmacistId);
    
    const pharmacist = await Pharmacist.findById(req.params.pharmacistId);
    if (!pharmacist) {
      return res.status(404).json({ message: 'Pharmacist not found' });
    }
    
    // Get all active bookings for this pharmacist
    const activeBookings = await Booking.find({
      pharmacistId: req.params.pharmacistId,
      status: { $in: ['confirmed', 'pending'] }
    });
    
    // Create a map of booked slots
    const bookedSlots = new Map();
    activeBookings.forEach(booking => {
      const key = `${booking.slotDate.toISOString()}_${booking.slotTime}`;
      bookedSlots.set(key, true);
    });
    
    // Update slot availability based on actual bookings
    const availableSlots = pharmacist.availableSlots.map(slot => {
      const key = `${slot.date.toISOString()}_${slot.startTime}`;
      return {
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isBooked: bookedSlots.has(key) || slot.isBooked
      };
    });
    
    res.json(availableSlots);
  } catch (err) {
    console.error('Error fetching available slots:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create booking (patient)
router.post('/', auth, async (req, res) => {
  try {
    const { 
      pharmacistId, 
      slotDate, 
      slotTime, 
      paymentId,
      serviceType,
      patientDetails 
    } = req.body;
    
    // Validate required fields
    if (!serviceType || !patientDetails) {
      return res.status(400).json({ message: 'Service type and patient details are required' });
    }
    
    if (!patientDetails.age || !patientDetails.sex || !patientDetails.prescriptionUrl) {
      return res.status(400).json({ message: 'Age, sex, and prescription are required' });
    }
    
    // Validate service type
    if (!['prescription_review', 'full_consultation'].includes(serviceType)) {
      return res.status(400).json({ message: 'Invalid service type' });
    }
    
    // Check if pharmacist exists
    const pharmacist = await Pharmacist.findById(pharmacistId);
    if (!pharmacist) {
      return res.status(404).json({ message: 'Pharmacist not found' });
    }
    
    // Check if there's an active booking for this slot (primary check)
    const bookingDate = new Date(slotDate);
    const startOfDay = new Date(bookingDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(bookingDate.setHours(23, 59, 59, 999));
    
    const existingBooking = await Booking.findOne({
      pharmacistId,
      slotDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      slotTime,
      status: { $in: ['confirmed', 'pending'] }
    });
    
    if (existingBooking) {
      
      return res.status(400).json({ message: 'This slot is already booked. Please select another slot.' });
    }
    
    // Check if slot exists in pharmacist's availableSlots and if it's booked
    const slot = pharmacist.availableSlots.find(s => 
      s.date.toISOString() === new Date(slotDate).toISOString() && s.startTime === slotTime
    );
    if (slot && slot.isBooked) {
      return res.status(400).json({ message: 'This slot is already booked. Please select another slot.' });
    }
    
    // Calculate payment amounts based on service type
    const paymentAmount = serviceType === 'prescription_review' ? 200 : 500;
    const pharmacistShare = serviceType === 'prescription_review' ? 100 : 250;
    
    // Create booking with enhanced details
    const booking = new Booking({
      patientId: req.user.userId,
      pharmacistId,
      slotDate,
      slotTime,
      meetLink: '', // Empty initially
      paymentId,
      status: 'confirmed',
      serviceType,
      patientDetails: {
        age: patientDetails.age,
        sex: patientDetails.sex,
        prescriptionUrl: patientDetails.prescriptionUrl,
        additionalNotes: patientDetails.additionalNotes || ''
      },
      paymentAmount,
      pharmacistShare
    });
    
    await booking.save();
    
    // Mark slot as booked if it exists in the availableSlots array
    if (slot) {
      slot.isBooked = true;
      await pharmacist.save();
    }
    
    // Send notifications
    const patient = await User.findById(req.user.userId);
    const pharmacistUser = await User.findById(pharmacist.userId);
    await notifyBookingConfirmed({
      booking,
      patientName: patient?.name || 'Patient',
      pharmacistName: pharmacistUser?.name || 'Pharmacist'
    });
    
    // Send email notifications with service type info
    if (patient?.email) {
      await sendBookingConfirmationEmail(
        patient.email, 
        booking, 
        patient.name,
        pharmacistUser?.name || 'Pharmacist'
      );
    }
    
    if (pharmacistUser?.email) {
      await sendPharmacistBookingNotification(
        pharmacistUser.email,
        booking,
        patient?.name || 'Patient',
        patient?.email || '',
        patient?.phone || ''
      );
    }
    
    res.status(201).json(booking);
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get user bookings
router.get('/my-bookings', auth, async (req, res) => {
  try {

    let query;
    if (req.user.role === 'patient') {
      query = { patientId: req.user.userId };
    } else if (req.user.role === 'pharmacist') {
      // For pharmacist, first find their pharmacist profile
      const pharmacist = await Pharmacist.findOne({ userId: req.user.userId });
      if (!pharmacist) {
        
        return res.json([]);
      }
      
      query = { pharmacistId: pharmacist._id };
    } else {
      query = { patientId: req.user.userId };
    }
    
    const bookings = await Booking.find(query)
      .populate('patientId', 'name email phone')
      .populate('pharmacistId');

    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Upload counselling report (pharmacist)
router.put('/:id/report', auth, isPharmacist, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    booking.counsellingReport = req.body.reportUrl;
    booking.status = 'completed';
    await booking.save();
    
    // Send email notification to patient
    const patient = await User.findById(booking.patientId);
    const pharmacist = await Pharmacist.findById(booking.pharmacistId);
    const pharmacistUser = await User.findById(pharmacist?.userId);
    
    if (patient?.email) {
      await sendReportSubmittedEmail(
        patient.email,
        booking,
        patient.name,
        pharmacistUser?.name || 'Pharmacist'
      );
    }
    
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Upload test result for booked patient (pharmacist)
router.put('/:id/test-result', auth, isPharmacist, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    const { testResultUrl } = req.body;
    if (!booking.testResults) {
      booking.testResults = [];
    }
    booking.testResults.push(testResultUrl);
    await booking.save();
    
    // Send notifications
    const pharmacist = await Pharmacist.findById(booking.pharmacistId);
    await notifyTestResultUploaded({
      booking,
      pharmacistName: pharmacist?.name || 'Pharmacist'
    });
    
    // Send email notification to patient
    const patient = await User.findById(booking.patientId);
    const pharmacistUser = await User.findById(pharmacist?.userId);
    
    if (patient?.email) {
      await sendTestResultEmail(
        patient.email,
        booking,
        patient.name,
        pharmacistUser?.name || 'Pharmacist'
      );
    }
    
    res.json({
      message: 'Test result uploaded successfully',
      booking
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add meeting link (pharmacist only)
router.patch('/:id/meeting-link', auth, isPharmacist, async (req, res) => {
  try {
    const { meetLink } = req.body;
    
    if (!meetLink || !meetLink.trim()) {
      return res.status(400).json({ message: 'Meeting link is required' });
    }
    
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Verify pharmacist owns this booking
    const pharmacist = await Pharmacist.findOne({ userId: req.user.userId });
    if (!pharmacist || booking.pharmacistId.toString() !== pharmacist._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
    }
    
    booking.meetLink = meetLink.trim();
    await booking.save();
    
    // Send notifications
    const pharmacistUser = await User.findById(pharmacist.userId);
    await notifyMeetingLinkAdded({
      booking,
      pharmacistName: pharmacistUser?.name || 'Pharmacist'
    });
    
    // Send email notification to patient
    const patient = await User.findById(booking.patientId);
    
    if (patient?.email) {
      await sendMeetingLinkEmail(
        patient.email,
        booking,
        patient.name,
        pharmacistUser?.name || 'Pharmacist'
      );
    }
    
    res.json({
      message: 'Meeting link added successfully',
      booking
    });
  } catch (err) {
    console.error('Error adding meeting link:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update treatment status (pharmacist)
router.patch('/:id/treatment-status', auth, isPharmacist, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    booking.treatmentStatus = req.body.treatmentStatus;
    
    // If marked as treated, automatically complete the booking
    if (req.body.treatmentStatus === 'treated') {
      booking.status = 'completed';
    }
    
    await booking.save();
    
    res.json({
      message: booking.status === 'completed' 
        ? 'Treatment completed and booking closed' 
        : 'Treatment status updated',
      booking
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Cancel booking (patient or pharmacist)
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Check if booking is already cancelled or completed
    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }
    
    if (booking.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel a completed booking' });
    }
    
    // Verify user is either the patient or the pharmacist
    const isPatient = booking.patientId.toString() === req.user.userId;
    let isPharmacist = false;
    
    if (req.user.role === 'pharmacist') {
      const pharmacist = await Pharmacist.findOne({ userId: req.user.userId });
      isPharmacist = pharmacist && booking.pharmacistId.toString() === pharmacist._id.toString();
    }
    
    if (!isPatient && !isPharmacist) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }
    
    // Update booking status
    booking.status = 'cancelled';
    await booking.save();
    
    // Free up the slot - IMPORTANT: This makes the slot available again
    const pharmacist = await Pharmacist.findById(booking.pharmacistId);
    if (pharmacist) {
      const slot = pharmacist.availableSlots.find(s => 
        s.date.toISOString() === new Date(booking.slotDate).toISOString() && 
        s.startTime === booking.slotTime
      );
      if (slot) {
        slot.isBooked = false;
        await pharmacist.save();
      }
    }
    
    res.json({
      message: 'Booking cancelled successfully. The slot is now available for other patients.',
      booking
    });
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Reschedule booking (pharmacist only)
router.patch('/:id/reschedule', auth, isPharmacist, async (req, res) => {
  try {
    const { newDate, newTime } = req.body;
    
    if (!newDate || !newTime) {
      return res.status(400).json({ message: 'New date and time are required' });
    }
    
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Verify pharmacist owns this booking
    const pharmacist = await Pharmacist.findOne({ userId: req.user.userId });
    if (!pharmacist || booking.pharmacistId.toString() !== pharmacist._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to reschedule this booking' });
    }
    
    // Free up old slot
    const oldSlot = pharmacist.availableSlots.find(s => 
      s.date.toISOString() === new Date(booking.slotDate).toISOString() && 
      s.startTime === booking.slotTime
    );
    if (oldSlot) oldSlot.isBooked = false;
    
    // Book new slot
    const newSlot = pharmacist.availableSlots.find(s => 
      s.date.toISOString() === new Date(newDate).toISOString() && 
      s.startTime === newTime
    );
    if (newSlot) {
      if (newSlot.isBooked) {
        return res.status(400).json({ message: 'New slot is already booked' });
      }
      newSlot.isBooked = true;
    }
    
    await pharmacist.save();
    
    // Update booking
    booking.slotDate = newDate;
    booking.slotTime = newTime;
    await booking.save();
    
    res.json({
      message: 'Booking rescheduled successfully',
      booking
    });
  } catch (err) {
    console.error('Error rescheduling booking:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Submit review and feedback (patient only)
router.post('/:id/review', auth, async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Verify user is the patient
    if (booking.patientId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to review this booking' });
    }
    
    // Can only review completed bookings
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Can only review completed bookings' });
    }
    
    // Check if already reviewed
    if (booking.review && booking.review.rating) {
      return res.status(400).json({ message: 'You have already reviewed this booking' });
    }
    
    booking.review = {
      rating,
      feedback: feedback || '',
      submittedAt: new Date()
    };
    
    await booking.save();
    
    res.json({
      message: 'Review submitted successfully',
      booking
    });
  } catch (err) {
    console.error('Error submitting review:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get reviews for a pharmacist (public)
router.get('/reviews/:pharmacistId', async (req, res) => {
  try {
    const reviews = await Booking.find({
      pharmacistId: req.params.pharmacistId,
      status: 'completed',
      'review.rating': { $exists: true }
    })
    .populate('patientId', 'name')
    .select('review slotDate')
    .sort({ 'review.submittedAt': -1 });
    
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, b) => sum + b.review.rating, 0) / totalReviews
      : 0;
    
    res.json({
      reviews,
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10
    });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
