/**
 * periodNotificationScheduler.js
 *
 * Runs daily to send proactive period-related notifications:
 *  - Ovulation day alert
 *  - Period coming soon (3 days and 1 day before)
 *  - Daily hygiene reminder during active period
 */

const PeriodTracker = require('../models/PeriodTracker');
const {
  notifyOvulationDay,
  notifyPeriodComingSoon,
  notifyPeriodHygieneReminder
} = require('./notificationHelper');

class PeriodNotificationScheduler {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
    this.intervalId = null;
  }

  start() {
    if (this.isRunning) return;

    const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
    if (isVercel) {
      console.log('Running on Vercel — period notification scheduler disabled (use cron endpoint instead)');
      this.isRunning = true;
      return;
    }

    try {
      const cron = require('node-cron');
      // Run every day at 8:00 AM
      this.cronJob = cron.schedule('0 8 * * *', async () => {
        await this.runDailyChecks();
      }, { scheduled: false });
      this.cronJob.start();
      this.isRunning = true;
      console.log('Period notification scheduler started — runs daily at 8:00 AM');
    } catch {
      // Fallback: run every 24 hours
      this.intervalId = setInterval(() => this.runDailyChecks(), 24 * 60 * 60 * 1000);
      this.isRunning = true;
      console.log('Period notification scheduler started with setInterval (24h)');
    }
  }

  stop() {
    if (this.cronJob) { this.cronJob.stop(); this.cronJob = null; }
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    this.isRunning = false;
  }

  async runDailyChecks() {
    try {
      const trackers = await PeriodTracker.find({});
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      for (const tracker of trackers) {
        await this.checkForUser(tracker, now);
      }
    } catch (err) {
      console.error('Error in period notification daily checks:', err);
    }
  }

  async checkForUser(tracker, today) {
    try {
      const userId = tracker.userId;
      const cycleLength = tracker.averageCycleLength || 28;
      const lastPeriod = new Date(tracker.lastPeriodDate);

      // --- Next period date ---
      const nextPeriod = new Date(lastPeriod);
      nextPeriod.setDate(lastPeriod.getDate() + cycleLength);
      nextPeriod.setHours(0, 0, 0, 0);

      const daysUntilPeriod = Math.round((nextPeriod - today) / (1000 * 60 * 60 * 24));

      // Period coming soon — notify at 3 days and 1 day before
      if (daysUntilPeriod === 3 || daysUntilPeriod === 1) {
        await notifyPeriodComingSoon({ userId, daysUntil: daysUntilPeriod, expectedDate: nextPeriod });
      }

      // --- Ovulation date (cycleLength - 14 days after last period) ---
      const ovulationDate = new Date(lastPeriod);
      ovulationDate.setDate(lastPeriod.getDate() + (cycleLength - 14));
      ovulationDate.setHours(0, 0, 0, 0);

      const daysUntilOvulation = Math.round((ovulationDate - today) / (1000 * 60 * 60 * 24));

      if (daysUntilOvulation === 0) {
        await notifyOvulationDay({ userId, ovulationDate });
      }

      // --- Hygiene reminder during active period ---
      // Check if the most recent period record has started but not ended
      const activePeriod = tracker.periods
        .slice()
        .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
        .find(p => {
          const start = new Date(p.startDate);
          start.setHours(0, 0, 0, 0);
          const end = p.endDate ? new Date(p.endDate) : null;
          if (end) end.setHours(0, 0, 0, 0);
          return start <= today && (!end || end >= today);
        });

      if (activePeriod) {
        const start = new Date(activePeriod.startDate);
        start.setHours(0, 0, 0, 0);
        const dayNumber = Math.round((today - start) / (1000 * 60 * 60 * 24)) + 1;
        await notifyPeriodHygieneReminder({ userId, dayNumber });
      }
    } catch (err) {
      console.error(`Error checking period notifications for user ${tracker.userId}:`, err);
    }
  }
}

const periodNotificationScheduler = new PeriodNotificationScheduler();
module.exports = periodNotificationScheduler;
