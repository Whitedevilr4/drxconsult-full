const mongoose = require('mongoose');

const medicalHistorySchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  documents: [String],
  details: mongoose.Schema.Types.Mixed,
  assessmentReport: String,
  assessmentPaid: { type: Boolean, default: false },
  prescriptions: [String],
  
  // Self-assessment fields
  selfAssessment: {
    submitted: { type: Boolean, default: false },
    submittedAt: Date,
    data: {
      currentMedications: String,
      allergies: String,
      chronicConditions: String,
      recentSymptoms: String,
      lifestyleFactors: String,
      additionalNotes: String
    }
  },
  
  // Pharmacist assignment
  assignedPharmacist: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacist' },
  assignedAt: Date,
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Assessment result from pharmacist
  pharmacistAssessment: {
    completed: { type: Boolean, default: false },
    completedAt: Date,
    reportUrl: String,
    notes: String
  },
  
  // Payment for assessment report
  reportPayment: {
    paid: { type: Boolean, default: false },
    amount: { type: Number, default: 50 },
    paymentId: String,
    paidAt: Date,
    pharmacistShare: { type: Number, default: 25 }, // 50% of 50
    adminShare: { type: Number, default: 25 }, // 50% of 50
    pharmacistPaid: { type: Boolean, default: false },
    pharmacistPaidAt: Date
  },
  
  // Patient review for assessment
  review: {
    rating: { type: Number, min: 1, max: 5 },
    feedback: String,
    submittedAt: Date
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MedicalHistory', medicalHistorySchema);
