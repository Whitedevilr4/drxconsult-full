const Pharmacist = require('../models/Pharmacist');
const Doctor = require('../models/Doctor');
const Nutritionist = require('../models/Nutritionist');

/**
 * Helper: check if a slot is still valid (future)
 */
function isFutureSlot(slot, now) {
  if (!slot?.date || !slot?.endTime) return false;

  try {
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
  } catch (error) {
    console.error('Error checking slot validity:', error);
    return false; // If error, consider slot invalid
  }
}

/**
 * Generic cleanup for any model with availableSlots
 */
async function cleanupExpiredSlotsForModel(Model, label = 'Unknown') {
  try {
    const now = new Date();

    const docs = await Model.find({
      availableSlots: { $exists: true, $ne: [] }
    }).lean();

    if (!docs || docs.length === 0) {
      return 0;
    }

    let totalCleaned = 0;

    for (const doc of docs) {
      try {
        const originalCount = doc.availableSlots?.length || 0;
        
        if (originalCount === 0) continue;

        const validSlots = doc.availableSlots.filter(slot =>
          isFutureSlot(slot, now)
        );

        const cleanedCount = originalCount - validSlots.length;

        if (cleanedCount > 0) {
          await Model.findByIdAndUpdate(
            doc._id,
            { availableSlots: validSlots },
            { new: true }
          );
          totalCleaned += cleanedCount;
        }
      } catch (docError) {
        console.error(`Error cleaning slots for ${label} ${doc._id}:`, docError.message);
        // Continue with next document
      }
    }

    if (totalCleaned > 0) {
      console.log(`🧹 ${label} slot cleanup removed ${totalCleaned} expired slots`);
    }
    return totalCleaned;

  } catch (error) {
    console.error(`❌ ${label} slot cleanup error:`, error.message);
    return 0; // Return 0 instead of throwing to prevent server crash
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

// 🔹 Clean all nutritionists
async function cleanupExpiredNutritionistSlots() {
  return cleanupExpiredSlotsForModel(Nutritionist, 'Nutritionist');
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
    console.error('❌ Pharmacist slot cleanup error:', error.message);
    return 0;
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
    console.error('❌ Doctor slot cleanup error:', error.message);
    return 0;
  }
}

// 🔹 Clean slots for one nutritionist
async function cleanupExpiredSlotsForNutritionist(nutritionistId) {
  try {
    const nutritionist = await Nutritionist.findById(nutritionistId);
    if (!nutritionist || !nutritionist.availableSlots?.length) return 0;

    const now = new Date();
    const originalCount = nutritionist.availableSlots.length;

    nutritionist.availableSlots = nutritionist.availableSlots.filter(slot =>
      isFutureSlot(slot, now)
    );

    const cleanedCount = originalCount - nutritionist.availableSlots.length;

    if (cleanedCount > 0) {
      await nutritionist.save();
    }

    return cleanedCount;

  } catch (error) {
    console.error('❌ Nutritionist slot cleanup error:', error.message);
    return 0;
  }
}

// 🔹 Clean all expired slots (pharmacists, doctors, and nutritionists)
async function cleanupExpiredSlots() {
  try {
    console.log('🧹 Starting slot cleanup...');
    
    const [pharmacistCleaned, doctorCleaned, nutritionistCleaned] = await Promise.allSettled([
      cleanupExpiredPharmacistSlots(),
      cleanupExpiredDoctorSlots(),
      cleanupExpiredNutritionistSlots()
    ]);

    const pharmacistCount = pharmacistCleaned.status === 'fulfilled' ? pharmacistCleaned.value : 0;
    const doctorCount = doctorCleaned.status === 'fulfilled' ? doctorCleaned.value : 0;
    const nutritionistCount = nutritionistCleaned.status === 'fulfilled' ? nutritionistCleaned.value : 0;
    
    const totalCleaned = pharmacistCount + doctorCount + nutritionistCount;
    
    if (totalCleaned > 0) {
      console.log(`✅ Slot cleanup complete: ${totalCleaned} slots removed (${pharmacistCount} pharmacist, ${doctorCount} doctor, ${nutritionistCount} nutritionist)`);
    }
    
    return totalCleaned;
  } catch (error) {
    console.error('❌ General slot cleanup error:', error.message);
    return 0; // Return 0 instead of throwing to prevent server crash
  }
}

module.exports = {
  cleanupExpiredSlots,
  cleanupExpiredPharmacistSlots,
  cleanupExpiredDoctorSlots,
  cleanupExpiredNutritionistSlots,
  cleanupExpiredSlotsForPharmacist,
  cleanupExpiredSlotsForDoctor,
  cleanupExpiredSlotsForNutritionist
};
