const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function updateAdminRole() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Update admin user role
    const result = await User.updateOne(
      { email: 'admin' },
      { $set: { role: 'admin' } };

    if (result.modifiedCount > 0) {
      
    } else {
      
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

updateAdminRole();
