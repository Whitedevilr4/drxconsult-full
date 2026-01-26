const Pharmacist = require('../models/Pharmacist');
const Doctor = require('../models/Doctor');

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
 * RELIABLE slot cleanup that ALWAYS filters expired slots
 * This function ensures expired slots are removed every single time
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
      
      // ALWAYS filter expired slots - this happens in memory first
      // This ensures users NEVER see expired slots, even if save fails
      professional.availableSlots = professional.availableSlots.filter(slot => {
        return !isSlotExpired(slot, now);
      });
      
      const cleanedCount = originalCount - professional.availableSlots.length;
      
      // If slots were cleaned, save immediately (with timeout protection)
      if (cleanedCount > 0) {
        try {
          await Promise.race([
            professional.save(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Database save timeout')), 3000)
            )
          ]);
          console.log(`🧹 Cleaned ${cleanedCount} expired slots for ${type} ${professional._id}`);
        } catch (saveError) {
          console.error(`❌ Failed to save cleaned slots for ${type} ${professional._id}:`, saveError);
          // Continue anyway - the slots are still filtered in memory
          // This ensures users don't see expired slots even if database save fails
        }
      }
    }
    
    cleanedProfessionals.push(professional);
  }
  
  return cleanedProfessionals.length === 1 ? cleanedProfessionals[0] : cleanedProfessionals;
}

/**
 * Clean up expired time slots for all pharmacists and doctors
 * Removes slots where the date + end time has passed
 */
async function cleanupExpiredSlots() {
  try {
    const now = new Date();
    let totalCleaned = 0;
    
    // Clean up pharmacist slots
    try {
      const pharmacists = await Promise.race([
        Pharmacist.find().maxTimeMS(5000),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 5000)
        )
      ]);
      
      for (const pharmacist of pharmacists) {
        if (!pharmacist.availableSlots || pharmacist.availableSlots.length === 0) {
          continue;
        }
        
        const originalCount = pharmacist.availableSlots.length;
        
        // Filter out expired slots
        pharmacist.availableSlots = pharmacist.availableSlots.filter(slot => {
          return !isSlotExpired(slot, now);
        });
        
        const cleanedCount = originalCount - pharmacist.availableSlots.length;
        
        if (cleanedCount > 0) {
          try {
            await Promise.race([
              pharmacist.save(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database save timeout')), 3000)
              )
            ]);
            totalCleaned += cleanedCount;
          } catch (saveError) {
            console.error(`Error saving cleaned pharmacist slots:`, saveError);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning pharmacist slots:', error);
    }
    
    // Clean up doctor slots
    try {
      const doctors = await Promise.race([
        Doctor.find().maxTimeMS(5000),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 5000)
        )
      ]);
      
      for (const doctor of doctors) {
        if (!doctor.availableSlots || doctor.availableSlots.length === 0) {
          continue;
        }
        
        const originalCount = doctor.availableSlots.length;
        
        // Filter out expired slots
        doctor.availableSlots = doctor.availableSlots.filter(slot => {
          return !isSlotExpired(slot, now);
        });
        
        const cleanedCount = originalCount - doctor.availableSlots.length;
        
        if (cleanedCount > 0) {
          try {
            await Promise.race([
              doctor.save(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database save timeout')), 3000)
              )
            ]);
            totalCleaned += cleanedCount;
          } catch (saveError) {
            console.error(`Error saving cleaned doctor slots:`, saveError);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning doctor slots:', error);
    }
    
    if (totalCleaned > 0) {
      console.log(`🧹 Total cleaned slots: ${totalCleaned}`);
    }
    
    return totalCleaned;
  } catch (error) {
    console.error('Error cleaning up expired slots:', error);
    return 0;
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
      return 0;
    }
    
    if (!pharmacist.availableSlots || pharmacist.availableSlots.length === 0) {
      return 0;
    }
    
    const now = new Date();
    const originalCount = pharmacist.availableSlots.length;
    
    pharmacist.availableSlots = pharmacist.availableSlots.filter(slot => {
      return !isSlotExpired(slot, now);
    });
    
    const cleanedCount = originalCount - pharmacist.availableSlots.length;
    
    if (cleanedCount > 0) {
      try {
        await Promise.race([
          pharmacist.save(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database save timeout')), 3000)
          )
        ]);
      } catch (saveError) {
        console.error('Error saving cleaned pharmacist slots:', saveError);
      }
    }
    
    return cleanedCount;
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
      return 0;
    }
    
    if (!doctor.availableSlots || doctor.availableSlots.length === 0) {
      return 0;
    }
    
    const now = new Date();
    const originalCount = doctor.availableSlots.length;
    
    doctor.availableSlots = doctor.availableSlots.filter(slot => {
      return !isSlotExpired(slot, now);
    });
    
    const cleanedCount = originalCount - doctor.availableSlots.length;
    
    if (cleanedCount > 0) {
      try {
        await Promise.race([
          doctor.save(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database save timeout')), 3000)
          )
        ]);
      } catch (saveError) {
        console.error('Error saving cleaned doctor slots:', saveError);
      }
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning up expired slots for doctor:', error);
    return 0;
  }
}

module.exports = {
  cleanupExpiredSlots,
  cleanupExpiredSlotsForPharmacist,
  cleanupExpiredSlotsForDoctor,
  withSlotCleanup,
  isSlotExpired
};
