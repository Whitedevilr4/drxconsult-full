const Pharmacist = require('../models/Pharmacist');
const Doctor = require('../models/Doctor');

/**
 * Helper: check if a slot is still valid (future)
 */
function isFutureSlot(slot, now) {
  if (!slot?.date || !slot?.endTime) return false;

  const slotDate = new Date(slot.date);

  // Normalize endTime (remove spaces, uppercase)
  const endTime = slot.endTime.replace(/\s+/g, '').toUpperCase();

  let hours, minutes;
  let match = endTime.match(/(\d{1,2}):(\d{2})(AM|PM)/);

  if (match) {
    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
    const period = match[3];

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  } else {
    match = endTime.match(/(\d{1,2}):(\d{2})/);
    if (!match) return false;

    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
  }

  slotDate.setHours(hours, minutes, 0, 0);

  return slotDate.getTime() > now.getTime();
}

/**
 * Generic cleanup for any model with availableSlots
 */
async function cleanupExpiredSlotsForModel(Model, label = 'Unknown') {
  try {
    const now = new Date();

    const docs = await Model.find({
      availableSlots: { $exists: true, $ne: [] }
    });

    let totalCleaned = 0;

    for (const doc of docs) {
      const originalCount = doc.availableSlots.length;

      doc.availableSlots = doc.availableSlots.filter(slot =>
        isFutureSlot(slot, now)
      );

      const cleanedCount = originalCount - doc.availableSlots.length;

      if (cleanedCount > 0) {
        await doc.save();
        totalCleaned += cleanedCount;
      }
    }

    console.log(`🧹 ${label} slot cleanup removed ${totalCleaned} slots`);
    return totalCleaned;

  } catch (error) {
    console.error(`❌ ${label} slot cleanup error:`, error);
    throw error;
  }
}

/**
 * PUBLIC FUNCTIONS
 */

// 🔹 Clean all pharmacists
async function cleanupExpiredPharmacistSlots() {
  return cleanupExpiredSlotsForModel(Pharmacist, 'Pharmacist');
}

// 🔹 Clean all doctors
async function cleanupExpiredDoctorSlots() {
  return cleanupExpiredSlotsForModel(Doctor, 'Doctor');
}

// 🔹 Clean slots for one pharmacist
async function cleanupExpiredSlotsForPharmacist(pharmacistId) {
  try {
    const pharmacist = await Pharmacist.findById(pharmacistId);
    if (!pharmacist || !pharmacist.availableSlots?.length) return 0;

    const now = new Date();
    const originalCount = pharmacist.availableSlots.length;

    pharmacist.availableSlots = pharmacist.availableSlots.filter(slot =>
      isFutureSlot(slot, now)
    );

    const cleanedCount = originalCount - pharmacist.availableSlots.length;

    if (cleanedCount > 0) {
      await pharmacist.save();
    }

    return cleanedCount;

  } catch (error) {
    console.error('❌ Pharmacist slot cleanup error:', error);
    throw error;
  }
}

// 🔹 Clean slots for one doctor
async function cleanupExpiredSlotsForDoctor(doctorId) {
  try {
    const doctor = await Doctor.findById(doctorId);
    if (!doctor || !doctor.availableSlots?.length) return 0;

    const now = new Date();
    const originalCount = doctor.availableSlots.length;

    doctor.availableSlots = doctor.availableSlots.filter(slot =>
      isFutureSlot(slot, now)
    );

    const cleanedCount = originalCount - doctor.availableSlots.length;

    if (cleanedCount > 0) {
      await doctor.save();
    }

    return cleanedCount;

  } catch (error) {
    console.error('❌ Doctor slot cleanup error:', error);
    throw error;
  }
}

// 🔹 Clean all expired slots (both pharmacists and doctors)
async function cleanupExpiredSlots() {
  try {
    const pharmacistCleaned = await cleanupExpiredPharmacistSlots();
    const doctorCleaned = await cleanupExpiredDoctorSlots();
    const totalCleaned = pharmacistCleaned + doctorCleaned;
    
    console.log(`🧹 Total slot cleanup removed ${totalCleaned} slots (${pharmacistCleaned} pharmacist, ${doctorCleaned} doctor)`);
    return totalCleaned;
  } catch (error) {
    console.error('❌ General slot cleanup error:', error);
    throw error;
  }
}

module.exports = {
  cleanupExpiredSlots,
  cleanupExpiredPharmacistSlots,
  cleanupExpiredDoctorSlots,
  cleanupExpiredSlotsForPharmacist,
  cleanupExpiredSlotsForDoctor
};
