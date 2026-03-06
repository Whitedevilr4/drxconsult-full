/**
 * Medicine Reminder Service
 * Handles browser notifications for medicine reminders
 * - 5 minutes before scheduled time
 * - At scheduled time
 * - 2 minutes after scheduled time
 */

import { showNotification } from './browserNotification';

class MedicineReminderService {
  constructor() {
    this.timers = new Map(); // Store active timers
    this.notifiedMedicines = new Set(); // Track already notified medicines
  }

  /**
   * Schedule reminders for a medicine
   * @param {Object} medicine - Medicine object with schedule
   * @param {String} medicineId - Unique medicine ID
   * @param {String} medicineName - Medicine name
   * @param {Array} schedule - Array of {time, dosage} objects
   */
  scheduleMedicineReminders(medicineId, medicineName, schedule) {
    console.log(`📅 Scheduling reminders for ${medicineName}`);

    schedule.forEach((scheduleItem, index) => {
      const { time } = scheduleItem;
      this.scheduleRemindersForTime(medicineId, medicineName, time, index);
    });
  }

  /**
   * Schedule reminders for a specific time
   */
  scheduleRemindersForTime(medicineId, medicineName, time, scheduleIndex) {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    
    // Create scheduled time for today
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timerId = `${medicineId}-${scheduleIndex}`;

    // Calculate delays
    const timeUntilScheduled = scheduledTime.getTime() - now.getTime();
    const fiveMinutesBefore = timeUntilScheduled - (5 * 60 * 1000);
    const twoMinutesAfter = timeUntilScheduled + (2 * 60 * 1000);

    // Schedule 5 minutes before notification
    if (fiveMinutesBefore > 0) {
      const beforeTimer = setTimeout(() => {
        console.log(`⏰ 5 minutes before reminder for ${medicineName}`);
        showNotification('medicineReminderBefore', medicineName, time, 5);
      }, fiveMinutesBefore);

      this.timers.set(`${timerId}-before`, beforeTimer);
    }

    // Schedule at-time notification
    if (timeUntilScheduled > 0) {
      const atTimeTimer = setTimeout(() => {
        console.log(`💊 Time to take ${medicineName}`);
        showNotification('medicineReminder', medicineName, time);
      }, timeUntilScheduled);

      this.timers.set(`${timerId}-attime`, atTimeTimer);
    }

    // Schedule 2 minutes after notification
    if (twoMinutesAfter > 0) {
      const afterTimer = setTimeout(() => {
        console.log(`⚠️ 2 minutes after reminder for ${medicineName}`);
        showNotification('medicineReminderAfter', medicineName, time, 2);
        
        // Reschedule for next day
        this.scheduleRemindersForTime(medicineId, medicineName, time, scheduleIndex);
      }, twoMinutesAfter);

      this.timers.set(`${timerId}-after`, afterTimer);
    }

    console.log(`✅ Reminders scheduled for ${medicineName} at ${time}`);
  }

  /**
   * Cancel all reminders for a medicine
   */
  cancelMedicineReminders(medicineId) {
    console.log(`🚫 Cancelling reminders for medicine: ${medicineId}`);
    
    // Find and clear all timers for this medicine
    for (const [timerId, timer] of this.timers.entries()) {
      if (timerId.startsWith(medicineId)) {
        clearTimeout(timer);
        this.timers.delete(timerId);
      }
    }

    // Remove from notified set
    this.notifiedMedicines.delete(medicineId);
  }

  /**
   * Cancel all reminders
   */
  cancelAllReminders() {
    console.log('🚫 Cancelling all medicine reminders');
    
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.timers.clear();
    this.notifiedMedicines.clear();
  }

  /**
   * Load and schedule reminders from medicine tracker data
   */
  loadMedicineTracker(medicineTracker) {
    if (!medicineTracker || !medicineTracker.medicines) {
      console.log('No medicine tracker data');
      return;
    }

    console.log(`📋 Loading ${medicineTracker.medicines.length} medicines`);

    // Cancel existing reminders
    this.cancelAllReminders();

    // Schedule reminders for active medicines
    const now = new Date();
    
    medicineTracker.medicines.forEach(medicine => {
      if (!medicine.isActive) {
        console.log(`⏭️ Skipping inactive medicine: ${medicine.medicineName}`);
        return;
      }

      const endDate = new Date(medicine.endDate);
      if (endDate < now) {
        console.log(`⏭️ Skipping expired medicine: ${medicine.medicineName}`);
        return;
      }

      console.log(`✅ Scheduling ${medicine.medicineName}`);
      this.scheduleMedicineReminders(
        medicine._id,
        medicine.medicineName,
        medicine.schedule
      );
    });
  }

  /**
   * Get status of active reminders
   */
  getStatus() {
    return {
      activeTimers: this.timers.size,
      notifiedMedicines: this.notifiedMedicines.size,
      timerIds: Array.from(this.timers.keys())
    };
  }
}

// Create singleton instance
const medicineReminderService = new MedicineReminderService();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  window.medicineReminderService = medicineReminderService;
}

export default medicineReminderService;
