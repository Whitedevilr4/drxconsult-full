const MedicineTracker = require('../models/MedicineTracker');

class MedicineScheduler {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
  }

  // Start the automatic medicine tracking system
  start() {
    if (this.isRunning) {
      console.log('Medicine scheduler is already running');
      return;
    }

    // Check if running on Vercel (serverless environment)
    const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
    
    if (isVercel) {
      console.log('Running on Vercel - background scheduler disabled');
      console.log('Medicine tracking will work on-demand when users access the system');
      this.isRunning = true;
      return;
    }

    console.log('Starting automatic medicine tracking system...');
    
    try {
      // Try to use node-cron first
      const cron = require('node-cron');
      
      // Run every 15 minutes to check for missed doses
      this.cronJob = cron.schedule('*/15 * * * *', async () => {
        try {
          await this.processOverdueMedicines();
        } catch (error) {
          console.error('Error in medicine scheduler:', error);
        }
      }, {
        scheduled: false
      });

      this.cronJob.start();
      this.isRunning = true;
      console.log('Medicine scheduler started with cron - checking every 15 minutes');
      
    } catch (error) {
      console.warn('node-cron not available, falling back to setInterval');
      
      // Fallback to setInterval (15 minutes = 900000 ms)
      this.intervalId = setInterval(async () => {
        try {
          await this.processOverdueMedicines();
        } catch (error) {
          console.error('Error in medicine scheduler:', error);
        }
      }, 15 * 60 * 1000); // 15 minutes
      
      this.isRunning = true;
      console.log('Medicine scheduler started with setInterval - checking every 15 minutes');
    }
  }

  // Stop the scheduler
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    console.log('Medicine scheduler stopped');
  }

  // Process overdue medicines and mark them as missed
  async processOverdueMedicines() {
    try {
      const now = new Date();
      console.log(`Checking for overdue medicines at ${now.toISOString()}`);

      // Find all medicine trackers with active medicines
      const trackers = await MedicineTracker.find({
        'medicines.isActive': true,
        'medicines.endDate': { $gte: now }
      });

      let totalProcessed = 0;
      let totalMarkedMissed = 0;

      for (const tracker of trackers) {
        const result = await this.processTrackerOverdueMedicines(tracker, now);
        totalProcessed += result.processed;
        totalMarkedMissed += result.markedMissed;
      }

      if (totalMarkedMissed > 0) {
        console.log(`Processed ${totalProcessed} medicine logs, marked ${totalMarkedMissed} as missed`);
      }

    } catch (error) {
      console.error('Error processing overdue medicines:', error);
    }
  }

  // Process overdue medicines for a specific tracker
  async processTrackerOverdueMedicines(tracker, now) {
    let processed = 0;
    let markedMissed = 0;
    let hasChanges = false;

    // Get current date for comparison
    const currentDate = new Date(now);
    currentDate.setHours(0, 0, 0, 0);

    // Process each medicine log entry
    for (const logEntry of tracker.medicineLog) {
      processed++;

      // Skip if already processed (taken, missed, or skipped)
      if (logEntry.status !== 'due') {
        continue;
      }

      // Parse scheduled date and time
      const scheduledDate = new Date(logEntry.scheduledDate);
      scheduledDate.setHours(0, 0, 0, 0);

      const [hours, minutes] = logEntry.scheduledTime.split(':').map(Number);
      const scheduledDateTime = new Date(logEntry.scheduledDate);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      // Check if the scheduled time has passed
      const gracePeriod = 2 * 60 * 60 * 1000; // 2 hours grace period
      const overdueTime = scheduledDateTime.getTime() + gracePeriod;

      if (now.getTime() > overdueTime) {
        // Mark as missed
        logEntry.status = 'missed';
        logEntry.notes = logEntry.notes ? 
          `${logEntry.notes} | Auto-marked as missed at ${now.toISOString()}` : 
          `Auto-marked as missed at ${now.toISOString()}`;
        
        markedMissed++;
        hasChanges = true;

        console.log(`Marked medicine as missed: ${logEntry.medicineId} scheduled for ${scheduledDateTime.toISOString()}`);
      }
    }

    // Save changes if any
    if (hasChanges) {
      tracker.updatedAt = now;
      await tracker.save();
    }

    return { processed, markedMissed };
  }

  // Generate medicine log entries for a specific medicine
  async generateMedicineLogEntries(tracker, medicine, startDate = null, endDate = null) {
    const start = startDate || new Date(medicine.startDate);
    const end = endDate || new Date(medicine.endDate);
    const logEntries = [];

    // Generate entries for each day in the medicine duration
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      // Generate entries for each scheduled time
      for (const schedule of medicine.schedule) {
        const logEntry = {
          medicineId: medicine._id,
          scheduledDate: new Date(date),
          scheduledTime: schedule.time,
          status: 'due',
          actualDosage: schedule.dosage,
          notes: schedule.instructions || '',
          sideEffectsExperienced: []
        };

        logEntries.push(logEntry);
      }
    }

    return logEntries;
  }

  // Check and generate missing log entries for existing medicines
  async generateMissingLogEntries(tracker) {
    const now = new Date();
    let hasChanges = false;

    for (const medicine of tracker.medicines) {
      if (!medicine.isActive) continue;

      const medicineEndDate = new Date(medicine.endDate);
      if (medicineEndDate < now) continue;

      // Check if log entries exist for this medicine
      const existingLogs = tracker.medicineLog.filter(
        log => log.medicineId.toString() === medicine._id.toString()
      );

      if (existingLogs.length === 0) {
        // Generate all log entries for this medicine
        const newLogEntries = await this.generateMedicineLogEntries(tracker, medicine);
        tracker.medicineLog.push(...newLogEntries);
        hasChanges = true;
        console.log(`Generated ${newLogEntries.length} log entries for medicine: ${medicine.medicineName}`);
      } else {
        // Check for missing dates
        const existingDates = new Set(
          existingLogs.map(log => log.scheduledDate.toDateString())
        );

        const medicineStartDate = new Date(medicine.startDate);
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        for (let date = new Date(medicineStartDate); date <= Math.min(medicineEndDate, today); date.setDate(date.getDate() + 1)) {
          const dateString = date.toDateString();
          
          if (!existingDates.has(dateString)) {
            // Generate entries for this missing date
            for (const schedule of medicine.schedule) {
              const logEntry = {
                medicineId: medicine._id,
                scheduledDate: new Date(date),
                scheduledTime: schedule.time,
                status: 'due',
                actualDosage: schedule.dosage,
                notes: schedule.instructions || '',
                sideEffectsExperienced: []
              };

              tracker.medicineLog.push(logEntry);
              hasChanges = true;
            }
          }
        }
      }
    }

    if (hasChanges) {
      await tracker.save();
    }

    return hasChanges;
  }

  // Manual trigger to process all overdue medicines immediately
  async processAllOverdueMedicines() {
    console.log('Manually triggering overdue medicine processing...');
    await this.processOverdueMedicines();
  }

  // Get medicine adherence statistics
  async getMedicineAdherenceStats() {
    try {
      const trackers = await MedicineTracker.find({
        'medicines.isActive': true
      });

      let totalUsers = trackers.length;
      let totalMedicines = 0;
      let totalDoses = 0;
      let takenDoses = 0;
      let missedDoses = 0;
      let skippedDoses = 0;

      for (const tracker of trackers) {
        totalMedicines += tracker.medicines.filter(med => med.isActive).length;
        
        const recentLogs = tracker.medicineLog.filter(log => {
          const logDate = new Date(log.scheduledDate);
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return logDate >= thirtyDaysAgo;
        });

        totalDoses += recentLogs.length;
        takenDoses += recentLogs.filter(log => log.status === 'taken').length;
        missedDoses += recentLogs.filter(log => log.status === 'missed').length;
        skippedDoses += recentLogs.filter(log => log.status === 'skipped').length;
      }

      const adherenceRate = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

      return {
        totalUsers,
        totalMedicines,
        totalDoses,
        takenDoses,
        missedDoses,
        skippedDoses,
        adherenceRate,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error getting medicine adherence stats:', error);
      return null;
    }
  }
}

// Create singleton instance
const medicineScheduler = new MedicineScheduler();

module.exports = medicineScheduler;