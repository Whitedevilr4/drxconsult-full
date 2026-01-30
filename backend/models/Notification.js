const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: [
      'booking_confirmed',
      'new_booking',
      'meeting_link_added',
      'test_result_uploaded',
      'session_completed',
      'payment_approved',
      'new_complaint',
      'complaint_updated',
      // Medical Form notification types
      'medical_form_submitted',
      'medical_form_new',
      'medical_form_assigned',
      'medical_form_assignment',
      'medical_form_assignment_confirmed',
      'medical_form_completed',
      'medical_form_result_uploaded',
      'medical_form_analysis_completed',
      'medical_form_paid',
      'medical_form_payment_received',
      'medical_form_payment_completed'
    ], 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  medicalFormId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalForm' },
  pharmacistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacist' },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
