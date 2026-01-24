const Notification = require('../models/Notification');
const User = require('../models/User');
const Pharmacist = require('../models/Pharmacist');

// Create notification helper
async function createNotification({ userId, type, title, message, bookingId, pharmacistId, patientId }) {
  try {
    console.log('Creating notification:', { userId, type, title, message });
    
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      bookingId,
      pharmacistId,
      patientId
    });
    await notification.save();
    
    console.log('Notification created successfully:', notification._id);
    return notification;
  } catch (err) {
    console.error('Error creating notification:', err);
    throw err; // Re-throw to allow calling functions to handle
  }
}

// Notify on booking confirmation
async function notifyBookingConfirmed({ booking, patientName, pharmacistName }) {
  try {

    // Notify patient
    await createNotification({
      userId: booking.patientId,
      type: 'booking_confirmed',
      title: 'Booking Confirmed',
      message: `Your booking with ${pharmacistName} on ${new Date(booking.slotDate).toLocaleDateString()} at ${booking.slotTime} has been confirmed.`,
      bookingId: booking._id,
      pharmacistId: booking.pharmacistId
    });

    // Notify pharmacist
    const pharmacist = await Pharmacist.findById(booking.pharmacistId);
    if (pharmacist && pharmacist.userId) {
      await createNotification({
        userId: pharmacist.userId,
        type: 'new_booking',
        title: 'New Booking Received',
        message: `You have a new booking from ${patientName} on ${new Date(booking.slotDate).toLocaleDateString()} at ${booking.slotTime}.`,
        bookingId: booking._id,
        patientId: booking.patientId
      });
      
    }

    // Notify all admins
    const admins = await User.find({ role: 'admin' });
    
    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        type: 'new_booking',
        title: 'New Booking Created',
        message: `${patientName} booked an appointment with ${pharmacistName} on ${new Date(booking.slotDate).toLocaleDateString()} at ${booking.slotTime}.`,
        bookingId: booking._id,
        pharmacistId: booking.pharmacistId,
        patientId: booking.patientId
      });
    }
    
  } catch (err) {
    console.error('Error in notifyBookingConfirmed:', err);
  }
}

// Notify on meeting link added
async function notifyMeetingLinkAdded({ booking, pharmacistName }) {
  try {

    // Notify patient
    await createNotification({
      userId: booking.patientId,
      type: 'meeting_link_added',
      title: 'Meeting Link Available',
      message: `${pharmacistName} has added the meeting link for your appointment on ${new Date(booking.slotDate).toLocaleDateString()} at ${booking.slotTime}.`,
      bookingId: booking._id,
      pharmacistId: booking.pharmacistId
    });

    // Notify all admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        type: 'meeting_link_added',
        title: 'Meeting Link Added',
        message: `${pharmacistName} has added a meeting link for the appointment on ${new Date(booking.slotDate).toLocaleDateString()} at ${booking.slotTime}.`,
        bookingId: booking._id,
        pharmacistId: booking.pharmacistId,
        patientId: booking.patientId
      });
    }
    
  } catch (err) {
    console.error('Error in notifyMeetingLinkAdded:', err);
  }
}

// Notify on test result uploaded
async function notifyTestResultUploaded({ booking, pharmacistName }) {
  try {

    // Notify patient
    await createNotification({
      userId: booking.patientId,
      type: 'test_result_uploaded',
      title: 'Test Result Uploaded',
      message: `${pharmacistName} has uploaded your test result. You can view it in your dashboard.`,
      bookingId: booking._id,
      pharmacistId: booking.pharmacistId
    });

    // Notify all admins
    const admins = await User.find({ role: 'admin' });
    const patient = await User.findById(booking.patientId);
    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        type: 'session_completed',
        title: 'Session Completed',
        message: `${pharmacistName} has completed the session with ${patient?.name || 'patient'} and uploaded test results.`,
        bookingId: booking._id,
        pharmacistId: booking.pharmacistId,
        patientId: booking.patientId
      });
    }
    
  } catch (err) {
    console.error('Error in notifyTestResultUploaded:', err);
  }
}

// Notify on payment approval
async function notifyPaymentApproved({ pharmacistUserId, pharmacistName, amount, bookingCount }) {
  try {

    await createNotification({
      userId: pharmacistUserId,
      type: 'payment_approved',
      title: 'Payment Approved',
      message: `Your payment of ₹${amount} for ${bookingCount} session(s) has been approved by admin.`,
    });
    
  } catch (err) {
    console.error('Error in notifyPaymentApproved:', err);
  }
}

// Notify on complaint submission
async function notifyComplaintSubmitted(complaint) {
  try {
    // Notify all admins about new complaint
    const admins = await User.find({ role: 'admin' });
    const user = await User.findById(complaint.userId);
    
    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        type: 'new_complaint',
        title: 'New Complaint Submitted',
        message: `${user?.name || 'A user'} has submitted a new complaint: "${complaint.title}". Priority: ${complaint.priority.toUpperCase()}`,
      });
    }
  } catch (err) {
    console.error('Error in notifyComplaintSubmitted:', err);
  }
}

// Notify on complaint update
async function notifyComplaintUpdated(complaint) {
  try {
    let title, message;
    
    if (complaint.adminResponse && complaint.adminResponse.message) {
      title = 'Admin Response to Your Complaint';
      message = `An admin has responded to your complaint "${complaint.title}". Check your complaints section for details.`;
    } else if (complaint.status === 'resolved') {
      title = 'Complaint Resolved';
      message = `Your complaint "${complaint.title}" has been resolved. Please rate your experience.`;
    } else {
      title = 'Complaint Status Updated';
      message = `Your complaint "${complaint.title}" status has been updated to: ${complaint.status.replace('_', ' ').toUpperCase()}`;
    }

    await createNotification({
      userId: complaint.userId,
      type: 'complaint_updated',
      title,
      message,
    });
  } catch (err) {
    console.error('Error in notifyComplaintUpdated:', err);
  }
}

module.exports = {
  createNotification,
  notifyBookingConfirmed,
  notifyMeetingLinkAdded,
  notifyTestResultUploaded,
  notifyPaymentApproved,
  notifyComplaintSubmitted,
  notifyComplaintUpdated
};
