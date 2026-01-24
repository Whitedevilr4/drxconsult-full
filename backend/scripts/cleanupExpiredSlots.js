const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Pharmacist = require('../models/Pharmacist');
const { cleanupExpiredSlots } = require('../utils/slotCleanup');

async function runCleanup() {
  try {
    console.log('✅ Cleanup completed');await mongoose.connect(process.env.MONGODB_URI);

    console.log('✅ Cleanup completed');const cleanedCount = await cleanupExpiredSlots();
    console.log('✅ Cleanup completed');
    console.log('✅ Cleanup completed');if (cleanedCount > 0) {
    console.log('✅ Cleanup completed');  console.log('ℹ️  No expired slots found to clean up');console.log(`✅ Cleaned up ${cleanedCount} expired slots`);
    console.log('✅ Cleanup completed');} else {
    console.log('✅ Cleanup completed');  console.log('ℹ️  No expired slots found to clean up');console.log(`✅ Cleaned up ${cleanedCount} expired slots`);
    console.log('✅ Cleanup completed');}
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.log('✅ Cleanup completed');console.error('❌ Error:', error.message);
  } finally {
    console.log('✅ Cleanup completed');await mongoose.connection.close();
    console.log('✅ Cleanup completed');
  }
}

runCleanup();
