const Pharmacist = require('../models/Pharmacist');

/**
 * Clean up expired time slots for all pharmacists
 * Removes slots where the date + end time has passed
 */
async function cleanupExpiredSlots() {
  try {
    const now = new Date();
    const pharmacists = await Pharmacist.find();
    
    let totalCleaned = 0;
    
    for (const pharmacist of pharmacists) {
      if (!pharmacist.availableSlots || pharmacist.availableSlots.length === 0) {
        continue;
      }
      
      const originalCount = pharmacist.availableSlots.length;
      
      // Filter out expired slots
      pharmacist.availableSlots = pharmacist.availableSlots.filter(slot => {
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
          if (!timeMatch) return true; // Keep slot if time format is invalid
          
          hours = parseInt(timeMatch[1]);
          minutes = parseInt(timeMatch[2]);
        }
        
        // Set the time on the slot date
        slotDate.setHours(hours, minutes, 0, 0);
        
        // Keep slot if it's in the future
        return slotDate > now;
      });
      
      const cleanedCount = originalCount - pharmacist.availableSlots.length;
      
      if (cleanedCount > 0) {
        await pharmacist.save();
        totalCleaned += cleanedCount;
      }
    }
    
    return totalCleaned;
  } catch (error) {
    console.error('Error cleaning up expired slots:', error);
    throw error;
  }
}

/**
 * Clean up expired slots for a specific pharmacist
 */
async function cleanupExpiredSlotsForPharmacist(pharmacistId) {
  try {
    const pharmacist = await Pharmacist.findById(pharmacistId);
    if (!pharmacist) {
      throw new Error('Pharmacist not found');
    }
    
    if (!pharmacist.availableSlots || pharmacist.availableSlots.length === 0) {
      return 0;
    }
    
    const now = new Date();
    const originalCount = pharmacist.availableSlots.length;
    
    pharmacist.availableSlots = pharmacist.availableSlots.filter(slot => {
      const slotDate = new Date(slot.date);
      const endTime = slot.endTime;
      
      let timeMatch = endTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      let hours, minutes;
      
      if (timeMatch) {
        hours = parseInt(timeMatch[1]);
        minutes = parseInt(timeMatch[2]);
        const period = timeMatch[3].toUpperCase();
        
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
      } else {
        timeMatch = endTime.match(/(\d+):(\d+)/);
        if (!timeMatch) return true;
        
        hours = parseInt(timeMatch[1]);
        minutes = parseInt(timeMatch[2]);
      }
      
      slotDate.setHours(hours, minutes, 0, 0);
      
      return slotDate > now;
    });
    
    const cleanedCount = originalCount - pharmacist.availableSlots.length;
    
    if (cleanedCount > 0) {
      await pharmacist.save();
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning up expired slots for pharmacist:', error);
    throw error;
  }
}

module.exports = {
  cleanupExpiredSlots,
  cleanupExpiredSlotsForPharmacist
};
