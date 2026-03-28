const express = require('express');
const Booking = require('../models/Booking');
const Pharmacist = require('../models/Pharmacist');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const { auth, isPharmacist } = require('../middleware/auth');
const { createMeetLink } = require('../utils/googleMeet');
const { cleanupExpiredSlotsForPharmacist, cleanupExpiredSlotsForDoctor } = require('../utils/slotCleanup');
const { notifyBookingConfirmed, notifyMeetingLinkAdded, notifyTestResultUploaded, notifyReviewSubmitted } = require('../utils/notificationHelper');
const { notifyBookingCreated, notifyBookingConfirmedToPatient } = require('../utils/socketManager');
const { 
  sendBookingConfirmationEmail, 
  sendPharmacistBookingNotification, 
  sendMeetingLinkEmail, 
  sendReportSubmittedEmail, 
  sendTestResultEmail 
} = require('../utils/emailService');

const router = express.Router();

// Get available slots for a professional (public) - supports pharmacists, doctors, and nutritionists
router.get('/available-slots/:professionalId', async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { type } = req.query; // 'pharmacist', 'doctor', or 'nutritionist'
    
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
    } else if (type === 'nutritionist') {
      // Clean up expired slots for nutritionist (reuse doctor cleanup logic)
      await cleanupExpiredSlotsForDoctor(professionalId);
      
      const Nutritionist = require('../models/Nutritionist');
      professional = await Nutritionist.findById(professionalId);
      if (!professional) {
        return res.status(404).json({ message: 'Nutritionist not found' });
      }
      
      // Get all active bookings for this nutritionist
      activeBookings = await Booking.find({
        nutritionistId: professionalId,
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

// Create booking (patient) - supports pharmacists, doctors, and nutritionists
router.post('/', auth, async (req, res) => {
  try {
    const { 
      pharmacistId, 
      doctorId,
      nutritionistId,
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
    
    // Validate service type based on provider type
    if (nutritionistId) {
      // For nutritionists, only allow nutritionist_consultation
      if (serviceType !== 'nutritionist_consultation') {
        return res.status(400).json({ message: 'Invalid service type for nutritionist. Only "nutritionist_consultation" is allowed.' });
      }
    } else if (doctorId) {
      // For doctors, only allow doctor_consultation
      if (serviceType !== 'doctor_consultation') {
        return res.status(400).json({ message: 'Invalid service type for doctor. Only "doctor_consultation" is allowed.' });
      }
    } else {
      // For pharmacists, allow prescription_review and full_consultation
      if (!['prescription_review', 'full_consultation'].includes(serviceType)) {
        return res.status(400).json({ message: 'Invalid service type for pharmacist. Only "prescription_review" or "full_consultation" are allowed.' });
      }
    }
    
    // Ensure only one professional ID is provided
    const professionalIds = [pharmacistId, doctorId, nutritionistId].filter(Boolean);
    if (professionalIds.length === 0) {
      return res.status(400).json({ message: 'Either pharmacistId, doctorId, or nutritionistId is required' });
    }
    
    if (professionalIds.length > 1) {
      return res.status(400).json({ message: 'Cannot book with multiple professionals' });
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
    } else if (doctorId) {
      professional = await Doctor.findById(doctorId);
      if (!professional) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      professionalUser = await User.findById(professional.userId);
      professionalType = 'doctor';
    } else {
      const Nutritionist = require('../models/Nutritionist');
      professional = await Nutritionist.findById(nutritionistId);
      if (!professional) {
        return res.status(404).json({ message: 'Nutritionist not found' });
      }
      professionalUser = await User.findById(professional.userId);
      professionalType = 'nutritionist';
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
    } else if (doctorId) {
      existingBookingQuery.doctorId = doctorId;
    } else {
      existingBookingQuery.nutritionistId = nutritionistId;
    }
    
    const existingBooking = await Booking.findOne(existingBookingQuery);
    
    if (existingBooking) {
      return res.status(400).json({ message: 'This slot is already booked. Please select another slot.' });
    }
    
    // Check if slot exists in professional's availableSlots and if it's booked
    const slot = professional.availableSlots.find(s => 
      s.date.toISOString() === new Date(slotDate).toISOString() && s.startTime === slotTime
    );
    
    console.log('🔍 Slot validation:', {
      slotFound: !!slot,
      slotDate: slotDate,
      slotTime: slotTime,
      currentTime: new Date().toISOString(),
      slot: slot ? {
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isBooked: slot.isBooked
      } : null
    });
    
    if (!slot) {
      return res.status(400).json({ message: 'This slot is not available. Please select another slot.' });
    }
    
    if (slot.isBooked) {
      return res.status(400).json({ message: 'This slot is already booked. Please select another slot.' });
    }
    
    // Check if slot has expired by comparing both start and end times
    const now = new Date();
    const slotBaseDate = new Date(slot.date);
    
    console.log('⏰ Time comparison:', {
      now: now.toISOString(),
      slotBaseDate: slotBaseDate.toISOString(),
      startTime: slot.startTime,
      endTime: slot.endTime
    });
    
    // Helper function to parse time and return date object
    const parseTimeToDate = (timeString, baseDate) => {
      const dateObj = new Date(baseDate);
      let timeMatch = timeString.match(/(\d+):(\d+)\s*(AM|PM)/i);
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
        timeMatch = timeString.match(/(\d+):(\d+)/);
        if (timeMatch) {
          hours = parseInt(timeMatch[1]);
          minutes = parseInt(timeMatch[2]);
        } else {
          // Invalid time format, return null
          console.log('❌ Invalid time format:', timeString);
          return null;
        }
      }
      
      dateObj.setHours(hours, minutes, 0, 0);
      return dateObj;
    };
    
    // Parse start and end times
    const startDateTime = parseTimeToDate(slot.startTime, slotBaseDate);
    const endDateTime = parseTimeToDate(slot.endTime, slotBaseDate);
    
    console.log('📅 Parsed times:', {
      startDateTime: startDateTime ? startDateTime.toISOString() : null,
      endDateTime: endDateTime ? endDateTime.toISOString() : null,
      startExpired: startDateTime ? startDateTime <= now : false,
      endExpired: endDateTime ? endDateTime <= now : false
    });
    
    // Check if either start time or end time has passed
    if (startDateTime && startDateTime <= now) {
      console.log('❌ Slot expired: start time passed');
      return res.status(400).json({ message: 'This slot has expired (start time passed). Please select another available slot.' });
    }
    
    if (endDateTime && endDateTime <= now) {
      console.log('❌ Slot expired: end time passed');
      return res.status(400).json({ message: 'This slot has expired (end time passed). Please select another available slot.' });
    }
    
    console.log('✅ Slot is valid and not expired');
    
    // Calculate payment amounts based on service type
    let paymentAmount, professionalShare;
    
    if (serviceType === 'prescription_review') {
      paymentAmount = 149;
      professionalShare = Math.round(149 * 0.7); // 70% of consultation fee
    } else if (serviceType === 'doctor_consultation') {
      // For doctors, use their consultationFee from profile
      paymentAmount = professional.consultationFee || 499;
      professionalShare = Math.round(paymentAmount * 0.7); // 70% of consultation fee
    } else if (serviceType === 'nutritionist_consultation') {
      // For nutritionists, use their consultationFee from profile
      paymentAmount = professional.consultationFee || 500;
      professionalShare = Math.round(paymentAmount * 0.7); // 70% of consultation fee
    } else { // full_consultation
      paymentAmount = 449;
      professionalShare = Math.round(449 * 0.7); // 70% of consultation fee
    }
    
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
    if ((pharmacistId ? 1 : 0) + (doctorId ? 1 : 0) + (nutritionistId ? 1 : 0) !== 1) {
      return res.status(400).json({ message: 'Exactly one professional ID must be provided' });
    }
    
    if (pharmacistId) {
      bookingData.pharmacistId = pharmacistId;
      bookingData.pharmacistShare = professionalShare;
      bookingData.providerType = 'pharmacist';
    } else if (doctorId) {
      bookingData.doctorId = doctorId;
      bookingData.doctorShare = professionalShare;
      bookingData.providerType = 'doctor';
    } else {
      bookingData.nutritionistId = nutritionistId;
      bookingData.nutritionistShare = professionalShare;
      bookingData.providerType = 'nutritionist';
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
    
    // Send Socket.IO real-time notifications
    const io = req.app.get('io');
    if (io) {
      // Notify professional
      if (professionalUser) {
        notifyBookingCreated(io, professionalUser._id.toString(), {
          bookingId: booking._id,
          patientName: patient?.name || 'Patient',
          slotDate: booking.slotDate,
          slotTime: booking.slotTime,
          serviceType: booking.serviceType,
          providerType: booking.providerType
        });
      }
      
      // Notify patient
      notifyBookingConfirmedToPatient(io, req.user.userId, {
        bookingId: booking._id,
        professionalName: professionalUser?.name || professionalType,
        slotDate: booking.slotDate,
        slotTime: booking.slotTime,
        serviceType: booking.serviceType,
        providerType: booking.providerType
      });
    }
    
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
    } else if (req.user.role === 'nutritionist') {
      // For nutritionist, first find their nutritionist profile
      const Nutritionist = require('../models/Nutritionist');
      const nutritionist = await Nutritionist.findOne({ userId: req.user.userId });
      if (!nutritionist) {
        return res.json([]);
      }
      query = { nutritionistId: nutritionist._id };
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
      .populate({
        path: 'nutritionistId',
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
    
    // Check if user is the nutritionist for this booking
    if (booking.nutritionistId && !isAuthorized) {
      const Nutritionist = require('../models/Nutritionist');
      const nutritionist = await Nutritionist.findOne({ userId: req.user.userId });
      if (nutritionist && booking.nutritionistId.toString() === nutritionist._id.toString()) {
        professional = nutritionist;
        professionalUser = await User.findById(nutritionist.userId);
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
    
    // Determine professional type
    const professionalType = booking.nutritionistId ? 'nutritionist' : booking.doctorId ? 'doctor' : 'pharmacist';
    
    // Send notifications
    await notifyTestResultUploaded({
      booking,
      pharmacistName: professionalUser?.name || (booking.nutritionistId ? 'Nutritionist' : booking.doctorId ? 'Doctor' : 'Pharmacist')
    });
    
    // Send email notification to patient
    const patient = await User.findById(booking.patientId);
    
    if (patient?.email) {
      await sendTestResultEmail(
        patient.email,
        booking,
        patient.name,
        professionalUser?.name || (booking.nutritionistId ? 'Nutritionist' : booking.doctorId ? 'Doctor' : 'Pharmacist'),
        professionalType
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
    
    // Check if user is the nutritionist for this booking
    if (booking.nutritionistId && !isAuthorized) {
      const Nutritionist = require('../models/Nutritionist');
      const nutritionist = await Nutritionist.findOne({ userId: req.user.userId });
      if (nutritionist && booking.nutritionistId.toString() === nutritionist._id.toString()) {
        professional = nutritionist;
        professionalUser = await User.findById(nutritionist.userId);
        isAuthorized = true;
      }
    }
    
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
    }
    
    booking.meetLink = meetLink.trim();
    await booking.save();
    
    // Determine professional type
    const professionalType = booking.nutritionistId ? 'nutritionist' : booking.doctorId ? 'doctor' : 'pharmacist';
    
    // Send notifications
    await notifyMeetingLinkAdded({
      booking,
      pharmacistName: professionalUser?.name || (booking.nutritionistId ? 'Nutritionist' : booking.doctorId ? 'Doctor' : 'Pharmacist')
    });
    
    // Send email notification to patient
    const patient = await User.findById(booking.patientId);
    
    if (patient?.email) {
      await sendMeetingLinkEmail(
        patient.email,
        booking,
        patient.name,
        professionalUser?.name || (booking.nutritionistId ? 'Nutritionist' : booking.doctorId ? 'Doctor' : 'Pharmacist'),
        professionalType
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

// Update treatment status (pharmacist, doctor, or nutritionist)
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
    
    // Check if user is the nutritionist for this booking
    if (booking.nutritionistId && !isAuthorized) {
      const Nutritionist = require('../models/Nutritionist');
      const nutritionist = await Nutritionist.findOne({ userId: req.user.userId });
      if (nutritionist && booking.nutritionistId.toString() === nutritionist._id.toString()) {
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

// Create subscription booking — no payment, no slot required
router.post('/subscription', auth, async (req, res) => {
  try {
    const { pharmacistId, doctorId, nutritionistId } = req.body

    // Exactly one professional
    const ids = [pharmacistId, doctorId, nutritionistId].filter(Boolean)
    if (ids.length !== 1) {
      return res.status(400).json({ message: 'Exactly one professional ID is required' })
    }

    // Verify patient has active subscription
    const Subscription = require('../models/Subscription')
    const subscription = await Subscription.findOne({ userId: req.user.userId, status: 'active' })
    if (!subscription) {
      return res.status(403).json({ message: 'No active subscription found' })
    }

    let professional, professionalUser, providerType, serviceType, professionalField

    if (pharmacistId) {
      professional = await Pharmacist.findById(pharmacistId)
      if (!professional || !professional.coreTeam) return res.status(404).json({ message: 'Pharmacist not found or not in core team' })
      professionalUser = await User.findById(professional.userId)
      providerType = 'pharmacist'
      serviceType = 'full_consultation'
      const fee = 449
      professionalField = { pharmacistId, pharmacistShare: Math.round(fee * 0.7), paymentAmount: fee }
    } else if (doctorId) {
      professional = await Doctor.findById(doctorId)
      if (!professional || !professional.coreTeam) return res.status(404).json({ message: 'Doctor not found or not in core team' })
      professionalUser = await User.findById(professional.userId)
      providerType = 'doctor'
      serviceType = 'doctor_consultation'
      const fee = professional.consultationFee || 499
      professionalField = { doctorId, doctorShare: Math.round(fee * 0.7), paymentAmount: fee }
    } else {
      const Nutritionist = require('../models/Nutritionist')
      professional = await Nutritionist.findById(nutritionistId)
      if (!professional || !professional.coreTeam) return res.status(404).json({ message: 'Nutritionist not found or not in core team' })
      professionalUser = await User.findById(professional.userId)
      providerType = 'nutritionist'
      serviceType = 'nutritionist_consultation'
      const fee = professional.consultationFee || 500
      professionalField = { nutritionistId, nutritionistShare: Math.round(fee * 0.7), paymentAmount: fee }
    }

    // Block re-booking this month regardless of status (confirmed, completed, cancelled)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const existingQuery = {
      patientId: req.user.userId,
      isSubscriptionBooking: true,
      createdAt: { $gte: startOfMonth }
    }
    if (pharmacistId) existingQuery.pharmacistId = pharmacistId
    else if (doctorId) existingQuery.doctorId = doctorId
    else existingQuery.nutritionistId = nutritionistId

    const existing = await Booking.findOne(existingQuery)
    if (existing) {
      return res.status(400).json({ message: 'You already have a subscription booking this month with this professional. New booking allowed next month.' })
    }

    const booking = new Booking({
      patientId: req.user.userId,
      slotDate: new Date(),
      slotTime: 'Subscription',
      status: 'confirmed',
      serviceType,
      providerType,
      isSubscriptionBooking: true,
      patientDetails: { age: 1, sex: 'other', prescriptionUrl: 'subscription' },
      ...professionalField
    })

    await booking.save()

    // Notify professional via socket
    const io = req.app.get('io')
    const patient = await User.findById(req.user.userId)
    if (io && professionalUser) {
      const { notifyBookingCreated } = require('../utils/socketManager')
      notifyBookingCreated(io, professionalUser._id.toString(), {
        bookingId: booking._id,
        patientName: patient?.name || 'Patient',
        serviceType,
        providerType,
        isSubscriptionBooking: true
      })
    }

    res.status(201).json({ message: 'Subscription booking created', booking })
  } catch (err) {
    console.error('Subscription booking error:', err)
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// Get subscription patients for a professional (core team only)
router.get('/subscription-patients', auth, async (req, res) => {
  try {
    let query = { isSubscriptionBooking: true }

    if (req.user.role === 'pharmacist') {
      const p = await Pharmacist.findOne({ userId: req.user.userId })
      if (!p) return res.json([])
      query.pharmacistId = p._id
    } else if (req.user.role === 'doctor') {
      const d = await Doctor.findOne({ userId: req.user.userId })
      if (!d) return res.json([])
      query.doctorId = d._id
    } else if (req.user.role === 'nutritionist') {
      const Nutritionist = require('../models/Nutritionist')
      const n = await Nutritionist.findOne({ userId: req.user.userId })
      if (!n) return res.json([])
      query.nutritionistId = n._id
    } else {
      return res.status(403).json({ message: 'Access denied' })
    }

    const bookings = await Booking.find(query)
      .populate('patientId', 'name email phone profilePicture')
      .sort({ createdAt: -1 })

    res.json(bookings)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// Get subscription booking status for patient (check if already booked this month)
router.get('/subscription-status', auth, async (req, res) => {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Return ALL bookings this month regardless of status — completed ones still block re-booking
    // but chat should remain accessible
    const bookings = await Booking.find({
      patientId: req.user.userId,
      isSubscriptionBooking: true,
      createdAt: { $gte: startOfMonth }
    }).select('pharmacistId doctorId nutritionistId providerType status createdAt')

    res.json({ bookings })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// Get chat messages for a subscription booking
router.get('/:bookingId/chat', auth, async (req, res) => {
  try {
    const BookingChat = require('../models/BookingChat')
    const booking = await Booking.findById(req.params.bookingId)
    if (!booking) return res.status(404).json({ message: 'Booking not found' })

    const messages = await BookingChat.find({ bookingId: req.params.bookingId })
      .populate('senderId', 'name profilePicture')
      .sort({ createdAt: 1 })

    // Mark unread messages as read
    await BookingChat.updateMany(
      { bookingId: req.params.bookingId, senderId: { $ne: req.user.userId }, isRead: false },
      { isRead: true }
    )

    res.json(messages)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// Send chat message for a subscription booking
router.post('/:bookingId/chat', auth, async (req, res) => {
  try {
    const BookingChat = require('../models/BookingChat')
    const { message } = req.body
    if (!message?.trim()) return res.status(400).json({ message: 'Message is required' })

    const booking = await Booking.findById(req.params.bookingId)
    if (!booking) return res.status(404).json({ message: 'Booking not found' })

    // Determine sender type
    const senderType = req.user.role === 'patient' ? 'patient' : 'professional'

    const chat = await BookingChat.create({
      bookingId: req.params.bookingId,
      senderId: req.user.userId,
      senderType,
      message: message.trim()
    })

    await chat.populate('senderId', 'name profilePicture')

    // Emit via socket to the booking room
    const io = req.app.get('io')
    if (io) {
      io.to(`booking:${req.params.bookingId}`).emit('new-booking-message', chat)
    }

    res.status(201).json(chat)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// Save patient subscription health data (diet + progress)
router.put('/subscription-health', auth, async (req, res) => {
  try {
    const SubscriptionHealthData = require('../models/SubscriptionHealthData')
    const { weekKey, diet, progress, stepTarget } = req.body
    if (!weekKey) return res.status(400).json({ message: 'weekKey is required' })

    const doc = await SubscriptionHealthData.findOneAndUpdate(
      { patientId: req.user.userId, weekKey },
      { $set: { diet, progress, stepTarget, updatedAt: new Date() } },
      { upsert: true, new: true }
    )
    res.json(doc)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// Get patient's own health data
router.get('/subscription-health', auth, async (req, res) => {
  try {
    const SubscriptionHealthData = require('../models/SubscriptionHealthData')
    const { weekKey } = req.query
    const query = { patientId: req.user.userId }
    if (weekKey) query.weekKey = weekKey
    const docs = await SubscriptionHealthData.find(query).sort({ weekKey: -1 }).limit(4)
    res.json(docs)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// Get a patient's health data — for professionals (must have active subscription booking with this patient)
router.get('/subscription-health/:patientId', auth, async (req, res) => {
  try {
    const SubscriptionHealthData = require('../models/SubscriptionHealthData')

    // Verify the professional has a subscription booking with this patient
    let professionalQuery = { isSubscriptionBooking: true, patientId: req.params.patientId }
    if (req.user.role === 'pharmacist') {
      const p = await Pharmacist.findOne({ userId: req.user.userId })
      if (!p) return res.status(403).json({ message: 'Access denied' })
      professionalQuery.pharmacistId = p._id
    } else if (req.user.role === 'doctor') {
      const d = await Doctor.findOne({ userId: req.user.userId })
      if (!d) return res.status(403).json({ message: 'Access denied' })
      professionalQuery.doctorId = d._id
    } else if (req.user.role === 'nutritionist') {
      const Nutritionist = require('../models/Nutritionist')
      const n = await Nutritionist.findOne({ userId: req.user.userId })
      if (!n) return res.status(403).json({ message: 'Access denied' })
      professionalQuery.nutritionistId = n._id
    } else {
      return res.status(403).json({ message: 'Access denied' })
    }

    const booking = await Booking.findOne(professionalQuery)
    if (!booking) return res.status(403).json({ message: 'No subscription booking found with this patient' })

    const docs = await SubscriptionHealthData.find({ patientId: req.params.patientId })
      .sort({ weekKey: -1 }).limit(4)
    res.json(docs)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

module.exports = router;
