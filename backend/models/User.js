const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: function() { return !this.firebaseUid; } }, // Password not required for Firebase users
  role: { type: String, enum: ['patient', 'pharmacist', 'admin'], default: 'patient' },
  phone: String,
  profilePicture: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  // Email verification fields
  isEmailVerified: { type: Boolean, default: false },
  emailVerifiedAt: Date,
  // Firebase authentication fields
  firebaseUid: { type: String, unique: true, sparse: true }, // Firebase user ID
  // User suspension fields
  isSuspended: { type: Boolean, default: false },
  suspendedAt: Date,
  suspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  suspensionReason: String,
  suspensionNotes: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
