const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const HospitalBooking = require('../models/HospitalBooking');
const HospitalQuery = require('../models/HospitalQuery');
const Hospital = require('../models/Hospital');
const { createNotification } = require('../utils/notificationHelper');
const { emitToRoom } = require('../utils/socketEmitter');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create bed booking and initiate payment (Hospital side)
router.post('/bed/initiate', auth, async (req, res) => {
  try {
    const { queryId, bedType, numberOfBeds, paymentAmount } = req.body;

    const hospital = await Hospital.findOne({ userId: req.user.userId });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }

    const query = await HospitalQuery.findById(queryId);
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    if (query.status !== 'accepted') {
      return res.status(400).json({ message: 'Query must be accepted first' });
    }

    if (query.acceptedByHospitalId.toString() !== hospital._id.toString()) {
      return res.status(403).json({ message: 'You can only create bookings for your accepted queries' });
    }

    // Check if booking already exists
    const existingBooking = await HospitalBooking.findOne({
      queryId,
      bookingType: 'bed',
      status: { $in: ['pending_payment', 'confirmed', 'in_progress'] }
    });

    if (existingBooking) {
      return res.status(400).json({ message: 'Booking already exists for this query' });
    }

    // Create booking without Razorpay order (patient will create it when paying)
    const booking = await HospitalBooking.create({
      queryId,
      userId: query.userId,
      hospitalId: hospital._id,
      bookingType: 'bed',
      bedType,
      numberOfBeds,
      paymentAmount,
      paymentStatus: 'pending',
      status: 'pending_payment',
      // Set reservation expiry to 90 minutes from now
      reservationExpiresAt: new Date(Date.now() + 90 * 60 * 1000)
    });

    // Notify patient
    await createNotification({
      userId: query.userId,
      type: 'hospital_booking_confirmed',
      title: 'Booking Created - Payment Required',
      message: `${hospital.hospitalName} has created a booking for you. Amount: ₹${paymentAmount}. Please complete payment.`
    });

    // Send real-time notification
    const io = req.app.get('io');
    emitToRoom(io, `user:${query.userId}`, 'booking-initiated', {
      bookingId: booking._id,
      queryId: query._id,
      bookingType: 'bed',
      paymentAmount: booking.paymentAmount,
      hospitalName: hospital.hospitalName
    });
    emitToRoom(io, `query:${queryId}`, 'booking-initiated', {
      bookingId: booking._id,
      bookingType: 'bed',
      paymentAmount: booking.paymentAmount
    });

    res.json({
      success: true,
      message: 'Booking created successfully. Patient will be notified to complete payment.',
      booking
    });
  } catch (error) {
    console.error('Error initiating bed booking:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Patient creates Razorpay order for payment
router.post('/bed/:bookingId/create-order', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await HospitalBooking.findById(bookingId)
      .populate('hospitalId', 'hospitalName')
      .populate('queryId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (booking.paymentStatus !== 'pending') {
      return res.status(400).json({ message: 'Payment already initiated or completed' });
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: booking.paymentAmount * 100, // Convert to paise
      currency: 'INR',
      receipt: `BED${Date.now().toString().slice(-8)}`, // Max 40 chars, using last 8 digits of timestamp
      notes: {
        bookingId: bookingId.toString(),
        queryId: booking.queryId._id.toString(),
        userId: req.user.userId,
        bookingType: 'bed'
      }
    });

    // Update booking
    booking.razorpayOrderId = razorpayOrder.id;
    booking.paymentStatus = 'initiated';
    booking.paymentInitiatedAt = new Date();
    await booking.save();

    res.json({
      success: true,
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency
      },
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      booking
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify payment and confirm booking
router.post('/verify-payment', auth, async (req, res) => {
  try {
    const { bookingId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    const booking = await HospitalBooking.findById(bookingId)
      .populate('hospitalId', 'hospitalName contactNumber')
      .populate('queryId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      booking.paymentStatus = 'failed';
      await booking.save();
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    // Update booking
    booking.razorpayPaymentId = razorpayPaymentId;
    booking.razorpaySignature = razorpaySignature;
    booking.paymentStatus = 'completed';
    booking.paymentCompletedAt = new Date();
    booking.status = 'in_progress'; // Changed from 'confirmed' to 'in_progress'
    booking.confirmedAt = new Date();
    
    // Generate 6-digit OTP for bed bookings
    if (booking.bookingType === 'bed') {
      booking.arrivalOTP = Math.floor(100000 + Math.random() * 900000).toString();
      booking.otpGeneratedAt = new Date();
    }
    
    await booking.save();

    // Notify hospital
    const hospital = await Hospital.findById(booking.hospitalId).populate('userId');
    if (hospital && hospital.userId) {
      await createNotification({
        userId: hospital.userId._id,
        type: 'hospital_booking_confirmed',
        title: 'Payment Received',
        message: `Payment received for ${booking.bookingType} booking. Amount: ₹${booking.paymentAmount}`
      });

      // Send real-time notification to hospital
      const io = req.app.get('io');
      emitToRoom(io, `user:${hospital.userId._id}`, 'booking-payment-confirmed', {
        bookingId: booking._id,
        bookingType: booking.bookingType,
        amount: booking.paymentAmount,
        queryId: booking.queryId._id
      });
    }

    // Notify patient
    await createNotification({
      userId: req.user.userId,
      type: 'hospital_booking_confirmed',
      title: 'Booking Confirmed',
      message: `Your ${booking.bookingType} booking at ${booking.hospitalId.hospitalName} is confirmed`
    });

    // Send real-time notification to patient and in query room
    const io = req.app.get('io');
    const paymentData = {
      bookingId: booking._id,
      queryId: booking.queryId._id,
      status: 'confirmed',
      confirmedAt: booking.confirmedAt,
      bookingType: booking.bookingType
    };
    emitToRoom(io, `user:${req.user.userId}`, 'payment-confirmed', paymentData);
    emitToRoom(io, `query:${booking.queryId._id}`, 'payment-confirmed', paymentData);
    if (hospital?.userId) {
      emitToRoom(io, `user:${hospital.userId._id}`, 'payment-confirmed', paymentData);
    }

    res.json({
      success: true,
      message: 'Payment verified and booking confirmed',
      booking
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create ambulance booking (hospital side)
router.post('/ambulance/create', auth, async (req, res) => {
  try {
    const {
      queryId,
      patientName,
      patientAge,
      patientGender,
      pickupLocation,
      pickupLatitude,
      pickupLongitude,
      emergencyContact,
      medicalCondition,
      ambulanceType,
      estimatedArrival,
      ambulanceNumber,
      driverName,
      driverContact,
      paymentAmount
    } = req.body;

    const hospital = await Hospital.findOne({ userId: req.user.userId });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }

    const query = await HospitalQuery.findById(queryId);
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    if (query.acceptedByHospitalId.toString() !== hospital._id.toString()) {
      return res.status(403).json({ message: 'You can only book ambulance for your accepted queries' });
    }

    // Check if ambulance booking already exists
    const existingBooking = await HospitalBooking.findOne({
      queryId,
      bookingType: 'ambulance',
      status: { $in: ['pending_payment', 'confirmed', 'in_progress'] }
    });

    if (existingBooking) {
      return res.status(400).json({ message: 'Ambulance booking already exists for this query' });
    }

    // Create booking (payment will be handled separately)
    const booking = await HospitalBooking.create({
      queryId,
      userId: query.userId,
      hospitalId: hospital._id,
      bookingType: 'ambulance',
      ambulanceDetails: {
        patientName,
        patientAge,
        patientGender,
        pickupLocation,
        pickupLatitude,
        pickupLongitude,
        emergencyContact,
        medicalCondition,
        ambulanceType,
        estimatedArrival,
        ambulanceNumber,
        driverName,
        driverContact
      },
      paymentAmount,
      paymentStatus: 'pending',
      status: 'pending_payment'
    });

    // Notify patient
    await createNotification({
      userId: query.userId,
      type: 'ambulance_booking_created',
      title: 'Ambulance Booked - Payment Required',
      message: `${hospital.hospitalName} has arranged an ambulance for you. Amount: ₹${paymentAmount}. Please complete payment.`
    });

    // Send real-time notification
    const io = req.app.get('io');
    emitToRoom(io, `user:${query.userId}`, 'ambulance-booking-created', {
      bookingId: booking._id,
      queryId: query._id,
      ambulanceDetails: booking.ambulanceDetails,
      paymentAmount: booking.paymentAmount,
      hospitalName: hospital.hospitalName
    });
    emitToRoom(io, `query:${queryId}`, 'ambulance-booking-created', {
      bookingId: booking._id,
      ambulanceDetails: booking.ambulanceDetails,
      paymentAmount: booking.paymentAmount
    });

    res.json({
      success: true,
      message: 'Ambulance booking created successfully. Patient will be notified to complete payment.',
      booking
    });
  } catch (error) {
    console.error('Error creating ambulance booking:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Patient creates Razorpay order for ambulance payment
router.post('/ambulance/:bookingId/create-order', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await HospitalBooking.findById(bookingId)
      .populate('hospitalId', 'hospitalName')
      .populate('queryId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (booking.bookingType !== 'ambulance') {
      return res.status(400).json({ message: 'This endpoint is for ambulance bookings only' });
    }

    if (booking.paymentStatus !== 'pending') {
      return res.status(400).json({ message: 'Payment already initiated or completed' });
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: booking.paymentAmount * 100, // Convert to paise
      currency: 'INR',
      receipt: `AMB${Date.now().toString().slice(-8)}`, // Max 40 chars
      notes: {
        bookingId: bookingId.toString(),
        queryId: booking.queryId._id.toString(),
        userId: req.user.userId,
        bookingType: 'ambulance'
      }
    });

    // Update booking
    booking.razorpayOrderId = razorpayOrder.id;
    booking.paymentStatus = 'initiated';
    booking.paymentInitiatedAt = new Date();
    await booking.save();

    res.json({
      success: true,
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency
      },
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      booking
    });
  } catch (error) {
    console.error('Error creating Razorpay order for ambulance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all bookings for patient
router.get('/patient/all', auth, async (req, res) => {
  try {
    const bookings = await HospitalBooking.find({ userId: req.user.userId })
      .populate('hospitalId', 'hospitalName contactNumber address')
      .populate('queryId')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching patient bookings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all bookings for hospital
router.get('/hospital/all', auth, async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user.userId });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }

    const bookings = await HospitalBooking.find({ hospitalId: hospital._id })
      .populate('userId', 'name email phoneNumber')
      .populate('queryId')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching hospital bookings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get bookings for a query
router.get('/query/:queryId', auth, async (req, res) => {
  try {
    const { queryId } = req.params;

    const query = await HospitalQuery.findById(queryId);
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    // Check authorization
    const hospital = await Hospital.findOne({ userId: req.user.userId });
    const isHospital = hospital && query.acceptedByHospitalId?.toString() === hospital._id.toString();
    const isPatient = query.userId.toString() === req.user.userId;

    if (!isHospital && !isPatient) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const bookings = await HospitalBooking.find({ queryId })
      .populate('hospitalId', 'hospitalName contactNumber address')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get booking by ID
router.get('/:bookingId', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await HospitalBooking.findById(bookingId)
      .populate('hospitalId', 'hospitalName contactNumber address')
      .populate('userId', 'name email phoneNumber')
      .populate('queryId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check authorization
    const hospital = await Hospital.findOne({ userId: req.user.userId });
    const isHospital = hospital && booking.hospitalId._id.toString() === hospital._id.toString();
    const isPatient = booking.userId._id.toString() === req.user.userId;

    if (!isHospital && !isPatient) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update ambulance booking status (hospital only)
router.put('/ambulance/:bookingId/status', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    const hospital = await Hospital.findOne({ userId: req.user.userId });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }

    const booking = await HospitalBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.hospitalId.toString() !== hospital._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    booking.status = status;
    if (status === 'completed') {
      booking.completedAt = new Date();
    }
    await booking.save();

    // Notify patient
    await createNotification({
      userId: booking.userId,
      type: 'ambulance_status_updated',
      title: 'Ambulance Status Updated',
      message: `Your ambulance booking status: ${status}`
    });

    // Send real-time notification
    const io = req.app.get('io');
    emitToRoom(io, `user:${booking.userId}`, 'ambulance-status-updated', {
      bookingId: booking._id,
      status: booking.status
    });

    res.json({
      success: true,
      message: 'Booking status updated',
      booking
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark patient arrival status for bed booking (hospital only)
router.put('/bed/:bookingId/patient-arrival', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { arrivalStatus } = req.body; // 'arrived' or 'not_arrived'

    const hospital = await Hospital.findOne({ userId: req.user.userId });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }

    const booking = await HospitalBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.hospitalId.toString() !== hospital._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (booking.bookingType !== 'bed') {
      return res.status(400).json({ message: 'This endpoint is for bed bookings only' });
    }

    // Only allow marking as not_arrived without OTP
    if (arrivalStatus === 'not_arrived') {
      booking.patientArrivalStatus = arrivalStatus;
      booking.patientArrivalMarkedAt = new Date();
      booking.status = 'cancelled';
      booking.cancelledAt = new Date();
      booking.cancellationReason = 'Patient did not arrive within reservation time';
      
      await booking.save();

      // Notify patient
      await createNotification({
        userId: booking.userId,
        type: 'bed_booking_status_updated',
        title: 'Booking Cancelled',
        message: 'Your bed booking has been cancelled as you did not arrive within the reservation time.'
      });

      // Send real-time notification
      const io = req.app.get('io');
      emitToRoom(io, `user:${booking.userId}`, 'patient-arrival-updated', {
        bookingId: booking._id,
        arrivalStatus: booking.patientArrivalStatus,
        status: booking.status
      });
      emitToRoom(io, `query:${booking.queryId}`, 'patient-arrival-updated', {
        bookingId: booking._id,
        arrivalStatus: booking.patientArrivalStatus,
        status: booking.status
      });

      return res.json({
        success: true,
        message: 'Patient marked as not arrived',
        booking
      });
    }

    // For 'arrived' status, OTP verification is required
    return res.status(400).json({ 
      message: 'OTP verification required for marking patient as arrived. Use /verify-arrival-otp endpoint.' 
    });
  } catch (error) {
    console.error('Error updating patient arrival status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all hospital bookings for admin
router.get('/admin/all', auth, async (req, res) => {
  try {
    // Check if user is admin
    const User = require('../models/User');
    const user = await User.findById(req.user.userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const bookings = await HospitalBooking.find()
      .populate('userId', 'name email phoneNumber')
      .populate('hospitalId', 'hospitalName contactNumber address')
      .populate('queryId')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching admin hospital bookings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP for patient arrival (hospital only)
router.post('/bed/:bookingId/verify-arrival-otp', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { otp } = req.body;

    const hospital = await Hospital.findOne({ userId: req.user.userId });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }

    const booking = await HospitalBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.hospitalId.toString() !== hospital._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (booking.bookingType !== 'bed') {
      return res.status(400).json({ message: 'This endpoint is for bed bookings only' });
    }

    // Check if already verified or failed
    if (booking.patientArrivalStatus !== 'pending') {
      return res.status(400).json({ message: 'Patient arrival already processed' });
    }

    if (booking.otpVerificationFailed) {
      return res.status(400).json({ 
        message: 'OTP verification failed after 3 attempts. Please contact DRX Consult support.',
        failedAttempts: true
      });
    }

    // Verify OTP
    if (booking.arrivalOTP === otp) {
      // OTP is correct
      booking.patientArrivalStatus = 'arrived';
      booking.patientArrivalMarkedAt = new Date();
      booking.otpVerifiedAt = new Date();
      booking.status = 'completed'; // Changed from 'in_progress' to 'completed'
      booking.completedAt = new Date();
      await booking.save();

      // Notify patient
      await createNotification({
        userId: booking.userId,
        type: 'bed_booking_status_updated',
        title: 'Arrival Confirmed',
        message: 'Hospital has confirmed your arrival. Your bed is ready.'
      });

      // Send real-time notification
      const io = req.app.get('io');
      emitToRoom(io, `user:${booking.userId}`, 'patient-arrival-updated', {
        bookingId: booking._id,
        arrivalStatus: booking.patientArrivalStatus,
        status: booking.status,
        otpVerified: true
      });
      emitToRoom(io, `query:${booking.queryId}`, 'patient-arrival-updated', {
        bookingId: booking._id,
        arrivalStatus: booking.patientArrivalStatus,
        status: booking.status,
        otpVerified: true
      });

      return res.json({
        success: true,
        message: 'Patient arrival verified successfully',
        booking
      });
    } else {
      // OTP is incorrect
      booking.otpVerificationAttempts += 1;
      
      if (booking.otpVerificationAttempts >= 3) {
        // Failed after 3 attempts
        booking.otpVerificationFailed = true;
        booking.patientArrivalStatus = 'arrived';
        booking.patientArrivalMarkedAt = new Date();
        booking.status = 'completed'; // Changed from 'in_progress' to 'completed'
        booking.completedAt = new Date();
        booking.cancellationReason = 'Faulty OTP entry - Contact DRX Consult';
        await booking.save();

        // Notify patient
        await createNotification({
          userId: booking.userId,
          type: 'bed_booking_status_updated',
          title: 'Arrival Marked - Verification Issue',
          message: 'Your arrival has been marked but OTP verification failed. Please contact DRX Consult if there are any issues.'
        });

        // Send real-time notification
        const io = req.app.get('io');
        emitToRoom(io, `user:${booking.userId}`, 'patient-arrival-updated', {
          bookingId: booking._id,
          arrivalStatus: booking.patientArrivalStatus,
          status: booking.status,
          otpFailed: true
        });
        emitToRoom(io, `query:${booking.queryId}`, 'patient-arrival-updated', {
          bookingId: booking._id,
          arrivalStatus: booking.patientArrivalStatus,
          status: booking.status,
          otpFailed: true
        });

        return res.status(400).json({
          success: false,
          message: 'OTP verification failed after 3 attempts. Patient marked as arrived with faulty entry. Please contact DRX Consult.',
          failedAttempts: true,
          booking
        });
      } else {
        // Still have attempts left
        await booking.save();
        
        return res.status(400).json({
          success: false,
          message: `Incorrect OTP. ${3 - booking.otpVerificationAttempts} attempts remaining.`,
          attemptsRemaining: 3 - booking.otpVerificationAttempts,
          currentAttempts: booking.otpVerificationAttempts
        });
      }
    }
  } catch (error) {
    console.error('Error verifying arrival OTP:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
