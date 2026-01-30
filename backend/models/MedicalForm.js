const mongoose = require('mongoose');

const medicalFormSchema = new mongoose.Schema({
  // Patient Information
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  age: { type: Number, required: true },
  sex: { type: String, enum: ['male', 'female', 'other'], required: true },
  
  // Medical Details
  prescriptionDetails: { type: String, required: true },
  prescriptionUrl: { type: String, required: true }, // Uploaded prescription file
  additionalNotes: { type: String, default: '' },
  
  // Assignment & Status
  status: { 
    type: String, 
    enum: ['pending', 'assigned', 'completed', 'paid'], 
    default: 'pending' 
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Pharmacist or Doctor
  assignedType: { type: String, enum: ['pharmacist', 'doctor'] },
  assignedAt: { type: Date },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin who assigned
  
  // Results
  resultPdfUrl: { type: String }, // Result PDF uploaded by professional
  resultNotes: { type: String, default: '' },
  completedAt: { type: Date },
  
  // Payment
  paymentRequired: { type: Boolean, default: true },
  paymentAmount: { type: Number, default: 29 },
  paymentId: { type: String },
  paidAt: { type: Date },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
medicalFormSchema.pre('save', function() {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('MedicalForm', medicalFormSchema);