const Pharmacist = require('../models/Pharmacist');
const Doctor = require('../models/Doctor');

/**
 * Clean up expired time slots for all pharmacists and doctors
 * Removes slots where the date + end time has passed
 */
async function cleanupExpiredSlots() {
  try {
    const now = new Date();
    let totalCleaned = 0;
    
    // Clean up pharmacist slots
    const pharmacistsCleaned = await cleanupExpiredSlotsForType(Pharmacist, now);
    totalCleaned += pharmacistsCleaned;
    
    // Clean up doctor slots
    const doctorsCleaned = await cleanupExpiredSlotsForType(Doctor, now);
    totalCleaned += doctorsCleaned;
    
    if (totalCleaned > 0) {
      console.log(`🧹 Cleaned up ${totalCleaned} expired slots (${pharmacistsCleaned} pharmacist, ${doctorsCleaned} doctor)`);
    }
    
    return totalCleaned;
  } catch (error) {
    console.error('Error cleaning up expired slots:', error);
    throw error;
  }
}

/**
 * Generic function to clean up expired slots for a model type
 */
async function cleanupExpiredSlotsForType(Model, now = new Date()) {
  try {
    const professionals = await Promise.race([
      Model.find().maxTimeMS(5000),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      )
    ]);
    
    let totalCleaned = 0;
    
    for (const professional of professionals) {
      if (!professional.availableSlots || professional.availableSlots.length === 0) {
        continue;
      }
      
      const originalCount = professional.availableSlots.length;
      
      // Filter out expired slots
      professional.availableSlots = professional.availableSlots.filter(slot => {
        return !isSlotExpired(slot, now);
      });
      
      const cleanedCount = originalCount - professional.availableSlots.length;
      
      if (cleanedCount > 0) {
        try {
          await Promise.race([
            professional.save(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Database save timeout')), 3000)
            )
          ]);
          totalCleaned += cleanedCount;
        } catch (saveError) {
          console.error(`Error saving cleaned slots for ${Model.modelName}:`, saveError);
          // Continue with other professionals even if one fails
        }
      }
    }
    
    return totalCleaned;
  } catch (error) {
    console.error(`Error cleaning up expired slots for ${Model.modelName}:`, error);
    return 0; // Return 0 instead of throwing to allow other cleanups to continue
  }
}

/**
 * Check if a slot is expired
 */
function isSlotExpired(slot, now = new Date()) {
  try {
    // Parse the end time to determine if slot has expired
    const slotDate = new Date(slot.date);
    const endTime = slot.endTime;
    
    // Extract hours and minutes from endTime (supports multiple formats)
    // Formats: "10:00 AM", "02:30 PM", "23:55" (24-hour)
    let timeMatch = endTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    let hours, minutes;
    
    if (timeMatch) {
      // 12-hour format with AM/PM
      hours = parseInt(timeMatch[1]);
      minutes = parseInt(timeMatch[2]);
      const period = timeMatch[3].toUpperCase();
      
      // Convert to 24-hour format
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
    } else {
      // Try 24-hour format
      timeMatch = endTime.match(/(\d+):(\d+)/);
      if (!timeMatch) return false; // Keep slot if time format is invalid
      
      hours = parseInt(timeMatch[1]);
      minutes = parseInt(timeMatch[2]);
    }
    
    // Set the time on the slot date
    slotDate.setHours(hours, minutes, 0, 0);
    
    // Slot is expired if it's in the past
    return slotDate <= now;
  } catch (error) {
    console.error('Error checking if slot is expired:', error);
    return false; // Keep slot if there's an error parsing
  }
}

/**
 * Clean up expired slots for a specific pharmacist
 */
async function cleanupExpiredSlotsForPharmacist(pharmacistId) {
  try {
    const pharmacist = await Promise.race([
      Pharmacist.findById(pharmacistId).maxTimeMS(3000),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 3000)
      )
    ]);
    
    if (!pharmacist) {
      throw new Error('Pharmacist not found');
    }
    
    return await cleanupExpiredSlotsForProfessional(pharmacist);
  } catch (error) {
    console.error('Error cleaning up expired slots for pharmacist:', error);
    return 0;
  }
}

/**
 * Clean up expired slots for a specific doctor
 */
async function cleanupExpiredSlotsForDoctor(doctorId) {
  try {
    const doctor = await Promise.race([
      Doctor.findById(doctorId).maxTimeMS(3000),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 3000)
      )
    ]);
    
    if (!doctor) {
      throw new Error('Doctor not found');
    }
    
    return await cleanupExpiredSlotsForProfessional(doctor);
  } catch (error) {
    console.error('Error cleaning up expired slots for doctor:', error);
    return 0;
  }
}

/**
 * Clean up expired slots for a specific professional (pharmacist or doctor)
 */
async function cleanupExpiredSlotsForProfessional(professional) {
  try {
    if (!professional.availableSlots || professional.availableSlots.length === 0) {
      return 0;
    }
    
    const now = new Date();
    const originalCount = professional.availableSlots.length;
    
    professional.availableSlots = professional.availableSlots.filter(slot => {
      return !isSlotExpired(slot, now);
    });
    
    const cleanedCount = originalCount - professional.availableSlots.length;
    
    if (cleanedCount > 0) {
      await Promise.race([
        professional.save(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database save timeout')), 3000)
        )
      ]);
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning up expired slots for professional:', error);
    return 0;
  }
}

/**
 * Middleware to automatically clean up expired slots before returning data
 * Use this in routes that fetch pharmacists or doctors
 */
async function withSlotCleanup(professionals, type = 'mixed') {
  if (!Array.isArray(professionals)) {
    professionals = [professionals];
  }
  
  const now = new Date();
  const cleanedProfessionals = [];
  
  for (const professional of professionals) {
    if (professional && professional.availableSlots && professional.availableSlots.length > 0) {
      const originalCount = professional.availableSlots.length;
      
      // Filter expired slots
      professional.availableSlots = professional.availableSlots.filter(slot => {
        return !isSlotExpired(slot, now);
      });
      
      const cleanedCount = originalCount - professional.availableSlots.length;
      
      // Save if slots were cleaned (but don't wait for it to avoid blocking the response)
      if (cleanedCount > 0) {
        professional.save().catch(error => {
          console.error(`Background slot cleanup save failed for ${type}:`, error);
        });
      }
    }
    
    cleanedProfessionals.push(professional);
  }
  
  return cleanedProfessionals.length === 1 ? cleanedProfessionals[0] : cleanedProfessionals;
}

module.exports = {
  cleanupExpiredSlots,
  cleanupExpiredSlotsForPharmacist,
  cleanupExpiredSlotsForDoctor,
  cleanupExpiredSlotsForProfessional,
  withSlotCleanup,
  isSlotExpired
};
