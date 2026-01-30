const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pharmacistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacist' },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
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
    enum: ['prescription_review', 'full_consultation'], 
    required: true 
  },
  serviceDescription: {
    type: String,
    default: function() {
      return this.serviceType === 'prescription_review' 
        ? 'Know Your Prescription' 
        : 'Full Consultation';
    }
  },
  
  // Provider type
  providerType: {
    type: String,
    enum: ['pharmacist', 'doctor'],
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
  
  // Payment tracking - Dynamic based on service type
  paymentAmount: { 
    type: Number, 
    default: function() {
      return this.serviceType === 'prescription_review' ? 149 : 449;
    }
  },
  pharmacistShare: { 
    type: Number, 
    default: function() {
      return this.serviceType === 'prescription_review' ? 75 : 225; // 50% share
    }
  },
  doctorShare: { 
    type: Number, 
    default: function() {
      return this.serviceType === 'prescription_review' ? 75 : 225; // 50% share
    }
  },
  pharmacistPaid: { type: Boolean, default: false },
  doctorPaid: { type: Boolean, default: false },
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
