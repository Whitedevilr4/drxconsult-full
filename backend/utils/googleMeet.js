const { google } = require('googleapis');

const createMeetLink = async (date, time) => {
  try {
    // Simplified - In production, use OAuth2 and Calendar API
    // For MVP, you can use a static meet link or generate via Calendar API
    const meetLink = `https://meet.google.com/${generateRandomCode()}`;
    return meetLink;
  } catch (err) {
    console.error('Error creating meet link:', err);
    return `https://meet.google.com/${generateRandomCode()}`;
  }
};

const generateRandomCode = () => {
  return Math.random().toString(36).substring(2, 15);
};

module.exports = { createMeetLink };
