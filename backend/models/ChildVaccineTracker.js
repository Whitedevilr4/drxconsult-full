const mongoose = require('mongoose');

const vaccineRecordSchema = new mongoose.Schema({
  vaccineName: { type: String, required: true },
  dueDate: { type: Date, required: true },
  completedDate: { type: Date },
  isCompleted: { type: Boolean, default: false },
  ageAtVaccination: { type: String }, // e.g., "2 months", "6 months"
  notes: { type: String }
});

const childVaccineTrackerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  babyName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['male', 'female'], required: true },
  vaccines: [vaccineRecordSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
childVaccineTrackerSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Method to calculate current age
childVaccineTrackerSchema.methods.getCurrentAge = function() {
  const now = new Date();
  const birth = new Date(this.dateOfBirth);
  const diffTime = Math.abs(now - birth);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) {
    return `${diffDays} days`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(diffDays / 365);
    const remainingMonths = Math.floor((diffDays % 365) / 30);
    return `${years} year${years > 1 ? 's' : ''} ${remainingMonths > 0 ? `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`.trim();
  }
};

// Method to get completion percentage
childVaccineTrackerSchema.methods.getCompletionPercentage = function() {
  if (this.vaccines.length === 0) return 0;
  const completed = this.vaccines.filter(v => v.isCompleted).length;
  return Math.round((completed / this.vaccines.length) * 100);
};

module.exports = mongoose.model('ChildVaccineTracker', childVaccineTrackerSchema);