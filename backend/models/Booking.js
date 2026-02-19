const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pharmacistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacist' },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  nutritionistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Nutritionist' },
  slotDate: { type: Date, required: true },
  slotTime: { type: String, required: true },
  meetLink: String,
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  treatmentStatus: { type: String, enum: ['untreated', 'treated'], default: 'untreated' },
  paymentId: String,
  counsellingReport: String,
  testResults: [String],
  
  // Service Type and Pricing
  serviceType: { 
    type: String, 
    enum: ['prescription_review', 'full_consultation', 'doctor_consultation', 'nutritionist_consultation'], 
    required: true 
  },
  serviceDescription: {
    type: String,
    default: function() {
      if (this.serviceType === 'prescription_review') return 'Know Your Prescription';
      if (this.serviceType === 'doctor_consultation') return 'Doctor Consultation';
      if (this.serviceType === 'nutritionist_consultation') return 'Nutritionist Consultation';
      return 'Full Consultation';
    }
  },
  
  // Provider type
  providerType: {
    type: String,
    enum: ['pharmacist', 'doctor', 'nutritionist'],
    required: true,
    default: 'pharmacist'
  },
  
  // Patient Details
  patientDetails: {
    age: { type: Number, required: true },
    sex: { type: String, enum: ['male', 'female', 'other'], required: true },
    prescriptionUrl: { type: String, required: true }, // Uploaded prescription
    additionalNotes: String
  },
  
  // Payment tracking - Dynamic based on service type and doctor fee
  paymentAmount: { 
    type: Number, 
    required: true // Will be set from frontend based on service/doctor
  },
  pharmacistShare: { 
    type: Number, 
    default: function() {
      if (this.serviceType === 'prescription_review') return 75;
      return 225; // full_consultation - 50% share
    }
  },
  doctorShare: { 
    type: Number, 
    default: function() {
      // For doctor consultations, calculate 50% of paymentAmount
      if (this.serviceType === 'doctor_consultation' && this.paymentAmount) {
        return Math.round(this.paymentAmount * 0.5);
      }
      if (this.serviceType === 'prescription_review') return 75;
      return 225; // full_consultation - 50% share
    }
  },
  nutritionistShare: { 
    type: Number, 
    default: function() {
      // For nutritionist consultations, calculate 50% of paymentAmount
      if (this.serviceType === 'nutritionist_consultation' && this.paymentAmount) {
        return Math.round(this.paymentAmount * 0.5);
      }
      return 0;
    }
  },
  pharmacistPaid: { type: Boolean, default: false },
  doctorPaid: { type: Boolean, default: false },
  nutritionistPaid: { type: Boolean, default: false },
  paidAt: Date,
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Review and feedback
  review: {
    rating: { type: Number, min: 1, max: 5 },
    feedback: String,
    submittedAt: Date
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
