/**
 * cron.js — HTTP endpoints triggered by Vercel Cron Jobs
 *
 * Vercel is serverless: node-cron / setInterval never run.
 * Instead, vercel.json schedules GET requests to these routes.
 *
 * Security: requests must carry the CRON_SECRET header so only
 * Vercel (or your own scheduler) can trigger them.
 */

const express = require('express');
const router = express.Router();

// Simple secret check — set CRON_SECRET in Vercel env vars
function verifyCronSecret(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured → allow (dev mode)
  const provided = req.headers['authorization'];
  if (provided !== `Bearer ${secret}`) {
    res.status(401).json({ message: 'Unauthorized' });
    return false;
  }
  return true;
}

/**
 * GET /api/cron/medicine-reminders
 * Schedule: every minute  ("* * * * *")
 *
 * Sends upcoming dose reminders (5-min before, on-time, 5-min after)
 * and marks overdue doses as missed.
 */
router.get('/medicine-reminders', async (req, res) => {
  if (!verifyCronSecret(req, res)) return;

  try {
    const medicineScheduler = require('../utils/medicineScheduler');
    await medicineScheduler.sendAllUpcomingReminders();
    await medicineScheduler.processOverdueMedicines();
    res.json({ ok: true, ran: 'medicine-reminders', ts: new Date().toISOString() });
  } catch (err) {
    console.error('Cron medicine-reminders error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/cron/period-notifications
 * Schedule: once a day at 08:00 UTC  ("0 8 * * *")
 *
 * Sends period-coming-soon, ovulation-day, and hygiene reminders.
 */
router.get('/period-notifications', async (req, res) => {
  if (!verifyCronSecret(req, res)) return;

  try {
    const periodScheduler = require('../utils/periodNotificationScheduler');
    await periodScheduler.runDailyChecks();
    res.json({ ok: true, ran: 'period-notifications', ts: new Date().toISOString() });
  } catch (err) {
    console.error('Cron period-notifications error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
