/**
 * Browser Notification Utility
 * Centralized system for showing browser notifications across the app
 */

// Request notification permission on app load
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Show browser notification
export const showBrowserNotification = (title, options = {}) => {
  if (!('Notification' in window)) {
    console.log('Browser notifications not supported');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.log('Notification permission not granted');
    return null;
  }

  const defaultOptions = {
    icon: '/favicon.ico',
    badge: '/favicon-32x32.png',
    vibrate: [200, 100, 200],
    requireInteraction: false,
    ...options
  };

  try {
    const notification = new Notification(title, defaultOptions);
    
    // Auto close after 5 seconds if not requiring interaction
    if (!defaultOptions.requireInteraction) {
      setTimeout(() => notification.close(), 5000);
    }

    return notification;
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
};

// Notification templates for different event types
export const NotificationTemplates = {
  // Booking notifications
  bookingConfirmed: (doctorName) => ({
    title: '✅ Booking Confirmed',
    body: `Your appointment with ${doctorName} has been confirmed`,
    tag: 'booking-confirmed'
  }),

  bookingCancelled: (doctorName) => ({
    title: '❌ Booking Cancelled',
    body: `Your appointment with ${doctorName} has been cancelled`,
    tag: 'booking-cancelled'
  }),

  bookingReminder: (doctorName, time) => ({
    title: '⏰ Appointment Reminder',
    body: `Your appointment with ${doctorName} is at ${time}`,
    tag: 'booking-reminder',
    requireInteraction: true
  }),

  // Hospital query notifications
  hospitalQueryNew: (queryType, userName) => ({
    title: '🏥 New Hospital Query',
    body: `${queryType} query from ${userName}`,
    tag: 'query-new'
  }),

  hospitalQueryAccepted: (hospitalName) => ({
    title: '✅ Query Accepted',
    body: `${hospitalName} has accepted your query`,
    tag: 'query-accepted'
  }),

  hospitalQueryRejected: (hospitalName, reason) => ({
    title: '❌ Query Rejected',
    body: `${hospitalName} rejected your query${reason ? `: ${reason}` : ''}`,
    tag: 'query-rejected'
  }),

  hospitalQueryClosed: (hospitalName) => ({
    title: '🔒 Query Closed',
    body: `${hospitalName} has closed your query`,
    tag: 'query-closed'
  }),

  hospitalBookingConfirmed: (hospitalName, amount) => ({
    title: '✅ Booking Confirmed',
    body: `Your booking at ${hospitalName} is confirmed. Amount: ₹${amount}`,
    tag: 'booking-confirmed'
  }),

  hospitalBookingInitiated: (hospitalName, bookingType) => ({
    title: '📋 Booking Created',
    body: `${hospitalName} has created a ${bookingType} booking for you. Please complete payment.`,
    tag: 'booking-initiated',
    requireInteraction: true
  }),

  ambulanceBookingCreated: (hospitalName) => ({
    title: '🚑 Ambulance Booked',
    body: `${hospitalName} has arranged an ambulance for you`,
    tag: 'ambulance-booked',
    requireInteraction: true
  }),

  ambulanceStatusUpdated: (status) => ({
    title: '🚑 Ambulance Status',
    body: `Ambulance booking status: ${status}`,
    tag: 'ambulance-status'
  }),

  // Chat notifications
  newChatMessage: (senderName, message) => ({
    title: `💬 New Message from ${senderName}`,
    body: message.length > 50 ? message.substring(0, 50) + '...' : message,
    tag: 'chat-message'
  }),

  // Complaint notifications
  complaintReceived: () => ({
    title: '📝 Complaint Received',
    body: 'Your complaint has been submitted successfully',
    tag: 'complaint-received'
  }),

  complaintResponse: (data) => ({
    title: '💬 Admin Response',
    body: `Admin responded to your complaint: ${data.complaintTitle}`,
    tag: 'complaint-response'
  }),

  complaintStatusUpdate: (data) => ({
    title: '🔄 Complaint Status Updated',
    body: `Your complaint "${data.complaintTitle}" is now ${data.status.replace('_', ' ')}`,
    tag: 'complaint-status-update'
  }),

  complaintUpdated: (status) => ({
    title: '🔄 Complaint Updated',
    body: `Your complaint status: ${status}`,
    tag: 'complaint-updated'
  }),

  complaintResolved: () => ({
    title: '✅ Complaint Resolved',
    body: 'Your complaint has been resolved',
    tag: 'complaint-resolved'
  }),

  // Medical form notifications
  medicalFormSubmitted: () => ({
    title: '📋 Form Submitted',
    body: 'Your medical form has been submitted successfully',
    tag: 'form-submitted'
  }),

  medicalFormReviewed: () => ({
    title: '👨‍⚕️ Form Reviewed',
    body: 'Your medical form has been reviewed by a doctor',
    tag: 'form-reviewed'
  }),

  // Review notifications
  reviewReceived: (patientName, rating) => ({
    title: '⭐ New Review',
    body: `${patientName} gave you ${rating} stars`,
    tag: 'review-received'
  }),

  // Subscription notifications
  subscriptionExpiring: (daysLeft) => ({
    title: '⚠️ Subscription Expiring',
    body: `Your subscription expires in ${daysLeft} days`,
    tag: 'subscription-expiring',
    requireInteraction: true
  }),

  subscriptionExpired: () => ({
    title: '❌ Subscription Expired',
    body: 'Your subscription has expired. Please renew to continue.',
    tag: 'subscription-expired',
    requireInteraction: true
  }),

  subscriptionRenewed: () => ({
    title: '✅ Subscription Renewed',
    body: 'Your subscription has been renewed successfully',
    tag: 'subscription-renewed'
  }),

  // Medicine tracker notifications
  medicineReminder: (medicineName, time) => ({
    title: '💊 Medicine Reminder',
    body: `Time to take ${medicineName} at ${time}`,
    tag: 'medicine-reminder',
    requireInteraction: true
  }),

  medicineReminderBefore: (medicineName, time, minutesBefore) => ({
    title: '⏰ Upcoming Medicine',
    body: `${medicineName} scheduled in ${minutesBefore} minutes at ${time}`,
    tag: `medicine-reminder-before-${time}`,
    requireInteraction: false
  }),

  medicineReminderAfter: (medicineName, time, minutesAfter) => ({
    title: '⚠️ Missed Medicine?',
    body: `Did you take ${medicineName}? It was scheduled ${minutesAfter} minutes ago at ${time}`,
    tag: `medicine-reminder-after-${time}`,
    requireInteraction: true
  }),

  // General notifications
  success: (message) => ({
    title: '✅ Success',
    body: message,
    tag: 'success'
  }),

  error: (message) => ({
    title: '❌ Error',
    body: message,
    tag: 'error'
  }),

  info: (message) => ({
    title: 'ℹ️ Information',
    body: message,
    tag: 'info'
  }),

  warning: (message) => ({
    title: '⚠️ Warning',
    body: message,
    tag: 'warning'
  })
};

// Helper function to show notification from template
export const showNotification = (templateKey, ...args) => {
  const template = NotificationTemplates[templateKey];
  if (!template) {
    console.error(`Notification template '${templateKey}' not found`);
    return null;
  }

  const { title, body, ...options } = template(...args);
  return showBrowserNotification(title, { body, ...options });
};

// Check if notifications are supported and enabled
export const areNotificationsEnabled = () => {
  return 'Notification' in window && Notification.permission === 'granted';
};

// Get notification permission status
export const getNotificationPermission = () => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};
