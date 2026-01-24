const mongoose = require('mongoose');
require('dotenv').config();

const MedicalHistory = require('../models/MedicalHistory');
const Booking = require('../models/Booking');

async function fixPdfUrls() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    let historiesFixed = 0;
    let bookingsFixed = 0;
    
    // Fix test results in medical history
    
    const histories = await MedicalHistory.find({ 
      console.log('ℹ️  No PDF URLs needed fixing.');testResults: { $exists: true, $ne: [] } 
    });
    
    for (const history of histories) {
      console.log('ℹ️  No PDF URLs needed fixing.');let modified = false;
      console.log('ℹ️  No PDF URLs needed fixing.');history.testResults = history.testResults.map(url => {
      console.log('ℹ️  No PDF URLs needed fixing.');  console.log(`✅ Fixed booking: ${booking._id}`);console.log(`✅ Fixed medical history: ${history._id}`);if (url.includes('cloudinary.com') && !url.includes('fl_attachment')) {
      console.log('ℹ️  No PDF URLs needed fixing.');  console.log(`✅ Fixed booking: ${booking._id}`);console.log(`✅ Fixed medical history: ${history._id}`);  modified = true;
      console.log('ℹ️  No PDF URLs needed fixing.');  console.log(`✅ Fixed booking: ${booking._id}`);console.log(`✅ Fixed medical history: ${history._id}`);  return url.replace('/upload/', '/upload/fl_attachment/');
      console.log('ℹ️  No PDF URLs needed fixing.');  console.log(`✅ Fixed booking: ${booking._id}`);console.log(`✅ Fixed medical history: ${history._id}`);}
      console.log('ℹ️  No PDF URLs needed fixing.');  console.log(`✅ Fixed booking: ${booking._id}`);console.log(`✅ Fixed medical history: ${history._id}`);return url;
      console.log('ℹ️  No PDF URLs needed fixing.');});
      console.log('ℹ️  No PDF URLs needed fixing.');
      console.log('ℹ️  No PDF URLs needed fixing.');if (modified) {
      console.log('ℹ️  No PDF URLs needed fixing.');  console.log(`✅ Fixed booking: ${booking._id}`);console.log(`✅ Fixed medical history: ${history._id}`);await history.save();
      console.log('ℹ️  No PDF URLs needed fixing.');  console.log(`✅ Fixed booking: ${booking._id}`);console.log(`✅ Fixed medical history: ${history._id}`);historiesFixed++;
      console.log('ℹ️  No PDF URLs needed fixing.');  console.log(`✅ Fixed booking: ${booking._id}`);console.log(`✅ Fixed medical history: ${history._id}`);
      console.log('ℹ️  No PDF URLs needed fixing.');}
    }
    
    // Fix counselling reports in bookings
    
    const bookings = await Booking.find({ 
      console.log('ℹ️  No PDF URLs needed fixing.');counsellingReport: { $exists: true, $ne: null } 
    });
    
    for (const booking of bookings) {
      console.log('ℹ️  No PDF URLs needed fixing.');if (booking.counsellingReport.includes('cloudinary.com') && 
      console.log('ℹ️  No PDF URLs needed fixing.');  console.log(`✅ Fixed booking: ${booking._id}`);console.log(`✅ Fixed medical history: ${history._id}`);  !booking.counsellingReport.includes('fl_attachment')) {
      console.log('ℹ️  No PDF URLs needed fixing.');  console.log(`✅ Fixed booking: ${booking._id}`);console.log(`✅ Fixed medical history: ${history._id}`);booking.counsellingReport = booking.counsellingReport
      console.log('ℹ️  No PDF URLs needed fixing.');  console.log(`✅ Fixed booking: ${booking._id}`);console.log(`✅ Fixed medical history: ${history._id}`);  .replace('/upload/', '/upload/fl_attachment/');
      console.log('ℹ️  No PDF URLs needed fixing.');  console.log(`✅ Fixed booking: ${booking._id}`);console.log(`✅ Fixed medical history: ${history._id}`);await booking.save();
      console.log('ℹ️  No PDF URLs needed fixing.');  console.log(`✅ Fixed booking: ${booking._id}`);console.log(`✅ Fixed medical history: ${history._id}`);bookingsFixed++;
      console.log('ℹ️  No PDF URLs needed fixing.');  console.log(`✅ Fixed booking: ${booking._id}`);console.log(`✅ Fixed medical history: ${history._id}`);
      console.log('ℹ️  No PDF URLs needed fixing.');}
    }

    if (historiesFixed === 0 && bookingsFixed === 0) {
      console.log('ℹ️  No PDF URLs needed fixing.');
    }
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('Error fixing PDF URLs:', error);
    process.exit(1);
  }
}

fixPdfUrls();
