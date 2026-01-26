const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
require('dotenv').config();

async function fixDoctorUserId() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the doctor
    const doctor = await Doctor.findById('69767f41d4bedc09c26e2d4c').populate('userId');
    if (!doctor) {
      console.log('❌ Doctor not found');
      return;
    }

    console.log('🔍 Current doctor data:');
    console.log('  - Doctor ID:', doctor._id);
    console.log('  - Doctor name:', doctor.userId?.name);
    console.log('  - Doctor userId field:', doctor.userId?._id);

    // Find the user by email to get the correct user ID
    const user = await User.findOne({ email: 'suman1@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('🔍 User data:');
    console.log('  - User ID:', user._id);
    console.log('  - User email:', user.email);
    console.log('  - User role:', user.role);

    // Update doctor's userId field if needed
    if (doctor.userId._id.toString() !== user._id.toString()) {
      console.log('🔧 Updating doctor userId field...');
      doctor.userId = user._id;
      await doctor.save();
      console.log('✅ Doctor userId field updated');
    } else {
      console.log('✅ Doctor userId field is already correct');
    }

    // Verify the update
    const updatedDoctor = await Doctor.findById('69767f41d4bedc09c26e2d4c').populate('userId');
    console.log('🔍 Updated doctor data:');
    console.log('  - Doctor userId field:', updatedDoctor.userId?._id);
    console.log('  - Matches user ID:', updatedDoctor.userId._id.toString() === user._id.toString());

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

fixDoctorUserId();