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
      'review_received',
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
      'medical_form_payment_completed',
      // Hospital notification types
      'hospital_query_new',
      'hospital_query_accepted',
      'hospital_query_rejected',
      'hospital_query_closed',
      'hospital_chat_message',
      'hospital_booking_confirmed',
      'ambulance_booking_created',
      'ambulance_status_updated',
      'bed_booking_status_updated',
      // Medicine tracker notification types
      'medicine_reminder',
      'medicine_missed',
      'medicine_overdue',
      // Period tracker notification types
      'period_coming_soon',
      'period_started',
      'ovulation_day',
      'period_hygiene_reminder'
    ], 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  medicalFormId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalForm' },
  pharmacistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacist' },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  nutritionistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Nutritionist' },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
