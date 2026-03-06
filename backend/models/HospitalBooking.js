const mongoose = require('mongoose');

const hospitalBookingSchema = new mongoose.Schema({
  queryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HospitalQuery',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  bookingType: {
    type: String,
    enum: ['bed', 'ambulance'],
    required: true
  },
  // Bed booking details
  bedType: {
    type: String,
    enum: ['general', 'icu', 'any'],
    default: null
  },
  numberOfBeds: {
    type: Number,
    default: 1
  },
  // Ambulance booking details
  ambulanceDetails: {
    patientName: String,
    patientAge: Number,
    patientGender: String,
    pickupLocation: String,
    pickupLatitude: Number,
    pickupLongitude: Number,
    emergencyContact: String,
    medicalCondition: String,
    ambulanceType: {
      type: String,
      enum: ['basic', 'advanced', 'icu_ambulance']
    },
    estimatedArrival: Date,
    ambulanceNumber: String,
    driverName: String,
    driverContact: String
  },
  // Payment details
  paymentStatus: {
    type: String,
    enum: ['pending', 'initiated', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentAmount: {
    type: Number,
    required: true
  },
  razorpayOrderId: {
    type: String,
    default: null
  },
  razorpayPaymentId: {
    type: String,
    default: null
  },
  razorpaySignature: {
    type: String,
    default: null
  },
  paymentInitiatedAt: {
    type: Date,
    default: null
  },
  paymentCompletedAt: {
    type: Date,
    default: null
  },
  // Booking status
  status: {
    type: String,
    enum: ['pending_payment', 'confirmed', 'in_progress', 'completed', 'cancelled', 'expired'],
    default: 'pending_payment'
  },
  confirmedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancellationReason: {
    type: String,
    default: null
  },
  // Bed reservation timer (90 minutes from booking creation)
  reservationExpiresAt: {
    type: Date,
    default: null
  },
  reservationExpired: {
    type: Boolean,
    default: false
  },
  patientArrivalStatus: {
    type: String,
    enum: ['pending', 'arrived', 'not_arrived'],
    default: 'pending'
  },
  patientArrivalMarkedAt: {
    type: Date,
    default: null
  },
  // OTP for patient arrival verification
  arrivalOTP: {
    type: String,
    default: null
  },
  otpGeneratedAt: {
    type: Date,
    default: null
  },
  otpVerificationAttempts: {
    type: Number,
    default: 0
  },
  otpVerificationFailed: {
    type: Boolean,
    default: false
  },
  otpVerifiedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better performance
hospitalBookingSchema.index({ queryId: 1 });
hospitalBookingSchema.index({ userId: 1 });
hospitalBookingSchema.index({ hospitalId: 1 });
hospitalBookingSchema.index({ status: 1 });
hospitalBookingSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('HospitalBooking', hospitalBookingSchema);
