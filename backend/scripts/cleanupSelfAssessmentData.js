const mongoose = require('mongoose');
require('dotenv').config();

const MedicalHistory = require('../models/MedicalHistory');

async function cleanupDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Remove all self-assessment fields from existing records
    const result = await MedicalHistory.updateMany(
      {},
      {
        $unset: {
          selfAssessment: "",
          assignedPharmacist: "",
          assignedAt: "",
          assignedBy: "",
          pharmacistAssessment: "",
          reportPayment: "",
          review: ""
        }
      };

    await mongoose.connection.close();
    
  } catch (error) {
    console.error('Error cleaning database:', error);
    process.exit(1);
  }
}

cleanupDatabase();
