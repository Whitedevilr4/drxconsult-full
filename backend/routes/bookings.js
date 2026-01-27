const express = require('express');
const Booking = require('../models/Booking');
const Pharmacist = require('../models/Pharmacist');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const { auth, isPharmacist } = require('../middleware/auth');
const { createMeetLink } = require('../utils/googleMeet');
const { cleanupExpiredSlotsForPharmacist, cleanupExpiredSlotsForDoctor } = require('../utils/slotCleanup');
const { notifyBookingConfirmed, notifyMeetingLinkAdded, notifyTestResultUploaded, notifyReviewSubmitted } = require('../utils/notificationHelper');
const { 
  sendBookingConfirmationEmail, 
  sendPharmacistBookingNotification, 
  sendMeetingLinkEmail, 
  sendReportSubmittedEmail, 
  sendTestResultEmail 
} = require('../utils/emailService');

const router = express.Router();

// Get available slots for a professional (public) - supports both pharmacists and doctors
router.get('/available-slots/:professionalId', async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { type } = req.query; // 'pharmacist' or 'doctor'
    
    let professional;
    let activeBookings;
    
    if (type === 'doctor') {
      // Clean up expired slots for doctor
      await cleanupExpiredSlotsForDoctor(professionalId);
      
      professional = await Doctor.findById(professionalId);
      if (!professional) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      
      // Get all active bookings for this doctor
      activeBookings = await Booking.find({
        doctorId: professionalId,
        status: { $in: ['confirmed', 'pending'] }
      });
    } else {
      // Default to pharmacist for backward compatibility
      await cleanupExpiredSlotsForPharmacist(professionalId);
      
      professional = await Pharmacist.findById(professionalId);
      if (!professional) {
        return res.status(404).json({ message: 'Pharmacist not found' });
      }
      
      // Get all active bookings for this pharmacist
      activeBookings = await Booking.find({
        pharmacistId: professionalId,
        status: { $in: ['confirmed', 'pending'] }
      });
    }
    
    // Create a map of booked slots
    const bookedSlots = new Map();
    activeBookings.forEach(booking => {
      const key = `${booking.slotDate.toISOString()}_${booking.slotTime}`;
      bookedSlots.set(key, true);
    });
    
    // Update slot availability based on actual bookings
    const availableSlots = professional.availableSlots.map(slot => {
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

// Create booking (patient) - supports both pharmacists and doctors
router.post('/', auth, async (req, res) => {
  try {
    const { 
      pharmacistId, 
      doctorId,
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
    
    // Ensure either pharmacistId or doctorId is provided, but not both
    if (!pharmacistId && !doctorId) {
      return res.status(400).json({ message: 'Either pharmacistId or doctorId is required' });
    }
    
    if (pharmacistId && doctorId) {
      return res.status(400).json({ message: 'Cannot book with both pharmacist and doctor' });
    }
    
    let professional;
    let professionalUser;
    let professionalType;
    
    // Check if professional exists
    if (pharmacistId) {
      professional = await Pharmacist.findById(pharmacistId);
      if (!professional) {
        return res.status(404).json({ message: 'Pharmacist not found' });
      }
      professionalUser = await User.findById(professional.userId);
      professionalType = 'pharmacist';
    } else {
      professional = await Doctor.findById(doctorId);
      if (!professional) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      professionalUser = await User.findById(professional.userId);
      professionalType = 'doctor';
    }
    
    // Check if there's an active booking for this slot (primary check)
    const bookingDate = new Date(slotDate);
    const startOfDay = new Date(bookingDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(bookingDate.setHours(23, 59, 59, 999));
    
    const existingBookingQuery = {
      slotDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      slotTime,
      status: { $in: ['confirmed', 'pending'] }
    };
    
    if (pharmacistId) {
      existingBookingQuery.pharmacistId = pharmacistId;
    } else {
      existingBookingQuery.doctorId = doctorId;
    }
    
    const existingBooking = await Booking.findOne(existingBookingQuery);
    
    if (existingBooking) {
      return res.status(400).json({ message: 'This slot is already booked. Please select another slot.' });
    }
    
    // Check if slot exists in professional's availableSlots and if it's booked
    const slot = professional.availableSlots.find(s => 
      s.date.toISOString() === new Date(slotDate).toISOString() && s.startTime === slotTime
    );
    
    if (!slot) {
      return res.status(400).json({ message: 'This slot is not available. Please select another slot.' });
    }
    
    if (slot.isBooked) {
      return res.status(400).json({ message: 'This slot is already booked. Please select another slot.' });
    }
    
    // Check if slot has expired
    const now = new Date();
    const slotDateTime = new Date(slot.date);
    const endTime = slot.endTime;
    
    // Parse end time to check if slot has expired
    let timeMatch = endTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    let hours, minutes;
    
    if (timeMatch) {
      // 12-hour format with AM/PM
      hours = parseInt(timeMatch[1]);
      minutes = parseInt(timeMatch[2]);
      const period = timeMatch[3].toUpperCase();
      
      // Convert to 24-hour format
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
    } else {
      // Try 24-hour format
      timeMatch = endTime.match(/(\d+):(\d+)/);
      if (timeMatch) {
        hours = parseInt(timeMatch[1]);
        minutes = parseInt(timeMatch[2]);
      } else {
        // Invalid time format, allow booking
        hours = 23;
        minutes = 59;
      }
    }
    
    // Set the end time on the slot date
    slotDateTime.setHours(hours, minutes, 0, 0);
    
    // Check if slot has expired
    if (slotDateTime <= now) {
      return res.status(400).json({ message: 'This slot has expired. Please select another available slot.' });
    }
    
    // Calculate payment amounts based on service type
    const paymentAmount = serviceType === 'prescription_review' ? 200 : 500;
    const professionalShare = serviceType === 'prescription_review' ? 100 : 250;
    
    // Create booking with enhanced details
    const bookingData = {
      patientId: req.user.userId,
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
      paymentAmount
    };
    
    // Add professional-specific fields and validate
    if (pharmacistId && doctorId) {
      return res.status(400).json({ message: 'Cannot have both pharmacistId and doctorId' });
    }
    if (!pharmacistId && !doctorId) {
      return res.status(400).json({ message: 'Either pharmacistId or doctorId must be provided' });
    }
    
    if (pharmacistId) {
      bookingData.pharmacistId = pharmacistId;
      bookingData.pharmacistShare = professionalShare;
      bookingData.providerType = 'pharmacist';
    } else {
      bookingData.doctorId = doctorId;
      bookingData.doctorShare = professionalShare;
      bookingData.providerType = 'doctor';
    }
    
    const booking = new Booking(bookingData);
    await booking.save();
    
    // Mark slot as booked if it exists in the availableSlots array
    if (slot) {
      slot.isBooked = true;
      await professional.save();
    }
    
    // Send notifications
    const patient = await User.findById(req.user.userId);
    await notifyBookingConfirmed({
      booking,
      patientName: patient?.name || 'Patient',
      pharmacistName: professionalUser?.name || professionalType
    });
    
    // Send email notifications with service type info
    if (patient?.email) {
      await sendBookingConfirmationEmail(
        patient.email, 
        booking, 
        patient.name,
        professionalUser?.name || professionalType
      );
    }
    
    if (professionalUser?.email) {
      await sendPharmacistBookingNotification(
        professionalUser.email,
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
    } else if (req.user.role === 'doctor') {
      // For doctor, first find their doctor profile
      const doctor = await Doctor.findOne({ userId: req.user.userId });
      if (!doctor) {
        return res.json([]);
      }
      query = { doctorId: doctor._id };
    } else {
      query = { patientId: req.user.userId };
    }
    
    const bookings = await Booking.find(query)
      .populate('patientId', 'name email phone')
      .populate({
        path: 'pharmacistId',
        populate: {
          path: 'userId',
          select: 'name email phone'
        }
      })
      .populate({
        path: 'doctorId',
        populate: {
          path: 'userId',
          select: 'name email phone'
        }
      })
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Upload counselling report (pharmacist or doctor)
router.put('/:id/report', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    let professional = null;
    let professionalUser = null;
    let isAuthorized = false;
    
    // Check if user is the pharmacist for this booking
    if (booking.pharmacistId) {
      const pharmacist = await Pharmacist.findOne({ userId: req.user.userId });
      if (pharmacist && booking.pharmacistId.toString() === pharmacist._id.toString()) {
        professional = pharmacist;
        professionalUser = await User.findById(pharmacist.userId);
        isAuthorized = true;
      }
    }
    
    // Check if user is the doctor for this booking
    if (booking.doctorId && !isAuthorized) {
      const doctor = await Doctor.findOne({ userId: req.user.userId });
      if (doctor && booking.doctorId.toString() === doctor._id.toString()) {
        professional = doctor;
        professionalUser = await User.findById(doctor.userId);
        isAuthorized = true;
      }
    }
    
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
    }
    
    booking.counsellingReport = req.body.reportUrl;
    booking.status = 'completed';
    await booking.save();
    
    // Send email notification to patient
    const patient = await User.findById(booking.patientId);
    
    if (patient?.email) {
      await sendReportSubmittedEmail(
        patient.email,
        booking,
        patient.name,
        professionalUser?.name || (booking.doctorId ? 'Doctor' : 'Pharmacist')
      );
    }
    
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Upload test result for booked patient (pharmacist or doctor)
router.put('/:id/test-result', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    let professional = null;
    let professionalUser = null;
    let isAuthorized = false;
    
    // Check if user is the pharmacist for this booking
    if (booking.pharmacistId) {
      const pharmacist = await Pharmacist.findOne({ userId: req.user.userId });
      if (pharmacist && booking.pharmacistId.toString() === pharmacist._id.toString()) {
        professional = pharmacist;
        professionalUser = await User.findById(pharmacist.userId);
        isAuthorized = true;
      }
    }
    
    // Check if user is the doctor for this booking
    if (booking.doctorId && !isAuthorized) {
      const doctor = await Doctor.findOne({ userId: req.user.userId });
      if (doctor && booking.doctorId.toString() === doctor._id.toString()) {
        professional = doctor;
        professionalUser = await User.findById(doctor.userId);
        isAuthorized = true;
      }
    }
    
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
    }
    
    const { testResultUrl } = req.body;
    if (!booking.testResults) {
      booking.testResults = [];
    }
    booking.testResults.push(testResultUrl);
    await booking.save();
    
    // Send notifications
    await notifyTestResultUploaded({
      booking,
      pharmacistName: professionalUser?.name || (booking.doctorId ? 'Doctor' : 'Pharmacist')
    });
    
    // Send email notification to patient
    const patient = await User.findById(booking.patientId);
    
    if (patient?.email) {
      await sendTestResultEmail(
        patient.email,
        booking,
        patient.name,
        professionalUser?.name || (booking.doctorId ? 'Doctor' : 'Pharmacist')
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

// Add meeting link (pharmacist or doctor)
router.patch('/:id/meeting-link', auth, async (req, res) => {
  try {
    const { meetLink } = req.body;
    
    if (!meetLink || !meetLink.trim()) {
      return res.status(400).json({ message: 'Meeting link is required' });
    }
    
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    let professional = null;
    let professionalUser = null;
    let isAuthorized = false;
    
    // Check if user is the pharmacist for this booking
    if (booking.pharmacistId) {
      const pharmacist = await Pharmacist.findOne({ userId: req.user.userId });
      if (pharmacist && booking.pharmacistId.toString() === pharmacist._id.toString()) {
        professional = pharmacist;
        professionalUser = await User.findById(pharmacist.userId);
        isAuthorized = true;
      }
    }
    
    // Check if user is the doctor for this booking
    if (booking.doctorId && !isAuthorized) {
      const doctor = await Doctor.findOne({ userId: req.user.userId });
      if (doctor && booking.doctorId.toString() === doctor._id.toString()) {
        professional = doctor;
        professionalUser = await User.findById(doctor.userId);
        isAuthorized = true;
      }
    }
    
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
    }
    
    booking.meetLink = meetLink.trim();
    await booking.save();
    
    // Send notifications
    await notifyMeetingLinkAdded({
      booking,
      pharmacistName: professionalUser?.name || (booking.doctorId ? 'Doctor' : 'Pharmacist')
    });
    
    // Send email notification to patient
    const patient = await User.findById(booking.patientId);
    
    if (patient?.email) {
      await sendMeetingLinkEmail(
        patient.email,
        booking,
        patient.name,
        professionalUser?.name || (booking.doctorId ? 'Doctor' : 'Pharmacist')
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

// Update treatment status (pharmacist or doctor)
router.patch('/:id/treatment-status', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    let isAuthorized = false;
    
    // Check if user is the pharmacist for this booking
    if (booking.pharmacistId) {
      const pharmacist = await Pharmacist.findOne({ userId: req.user.userId });
      if (pharmacist && booking.pharmacistId.toString() === pharmacist._id.toString()) {
        isAuthorized = true;
      }
    }
    
    // Check if user is the doctor for this booking
    if (booking.doctorId && !isAuthorized) {
      const doctor = await Doctor.findOne({ userId: req.user.userId });
      if (doctor && booking.doctorId.toString() === doctor._id.toString()) {
        isAuthorized = true;
      }
    }
    
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
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
    
    // Verify user is either the patient, pharmacist, or doctor
    const isPatient = booking.patientId.toString() === req.user.userId;
    let isProfessional = false;
    
    if (req.user.role === 'pharmacist' && booking.pharmacistId) {
      const pharmacist = await Pharmacist.findOne({ userId: req.user.userId });
      isProfessional = pharmacist && booking.pharmacistId.toString() === pharmacist._id.toString();
    } else if (req.user.role === 'doctor' && booking.doctorId) {
      const doctor = await Doctor.findOne({ userId: req.user.userId });
      isProfessional = doctor && booking.doctorId.toString() === doctor._id.toString();
    }
    
    if (!isPatient && !isProfessional) {
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

// Reschedule booking (pharmacist or doctor)
router.patch('/:id/reschedule', auth, async (req, res) => {
  try {
    const { newDate, newTime } = req.body;
    
    if (!newDate || !newTime) {
      return res.status(400).json({ message: 'New date and time are required' });
    }
    
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    let professional = null;
    let isAuthorized = false;
    
    // Check if user is the pharmacist for this booking
    if (booking.pharmacistId) {
      const pharmacist = await Pharmacist.findOne({ userId: req.user.userId });
      if (pharmacist && booking.pharmacistId.toString() === pharmacist._id.toString()) {
        professional = pharmacist;
        isAuthorized = true;
      }
    }
    
    // Check if user is the doctor for this booking
    if (booking.doctorId && !isAuthorized) {
      const doctor = await Doctor.findOne({ userId: req.user.userId });
      if (doctor && booking.doctorId.toString() === doctor._id.toString()) {
        professional = doctor;
        isAuthorized = true;
      }
    }
    
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to reschedule this booking' });
    }
    
    // Free up old slot
    const oldSlot = professional.availableSlots.find(s => 
      s.date.toISOString() === new Date(booking.slotDate).toISOString() && 
      s.startTime === booking.slotTime
    );
    if (oldSlot) oldSlot.isBooked = false;
    
    // Book new slot
    const newSlot = professional.availableSlots.find(s => 
      s.date.toISOString() === new Date(newDate).toISOString() && 
      s.startTime === newTime
    );
    if (newSlot) {
      if (newSlot.isBooked) {
        return res.status(400).json({ message: 'New slot is already booked' });
      }
      newSlot.isBooked = true;
    }
    
    await professional.save();
    
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
    
    // Send notification to professional
    try {
      const patient = await User.findById(booking.patientId);
      await notifyReviewSubmitted({
        booking,
        patientName: patient?.name || 'Patient',
        rating,
        feedback
      });
    } catch (notificationError) {
      console.error('Failed to send review notification:', notificationError);
      // Don't fail the review submission if notification fails
    }
    
    res.json({
      message: 'Review submitted successfully',
      booking
    });
  } catch (err) {
    console.error('Error submitting review:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get reviews for a professional (pharmacist or doctor) (public)
router.get('/reviews/:professionalId', async (req, res) => {
  try {
    const { type } = req.query; // 'doctor' or default to 'pharmacist'
    
    let query;
    if (type === 'doctor') {
      query = {
        doctorId: req.params.professionalId,
        status: 'completed',
        'review.rating': { $exists: true }
      };
    } else {
      query = {
        pharmacistId: req.params.professionalId,
        status: 'completed',
        'review.rating': { $exists: true }
      };
    }
    
    const reviews = await Booking.find(query)
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
