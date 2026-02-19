const Notification = require('../models/Notification');
const User = require('../models/User');
const Pharmacist = require('../models/Pharmacist');
const Doctor = require('../models/Doctor');

// Create notification helper
async function createNotification({ userId, type, title, message, bookingId, pharmacistId, doctorId, patientId }) {
  try {
    console.log('Creating notification:', { userId, type, title, message });
    
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      bookingId,
      pharmacistId,
      doctorId,
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

// Helper function to get notification URL based on type
function getNotificationUrl(type, { bookingId, pharmacistId, doctorId, patientId }) {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  switch (type) {
    case 'booking_confirmed':
    case 'meeting_link_added':
    case 'test_result_uploaded':
      return `${baseUrl}/patient/dashboard`;
    case 'new_booking':
      if (pharmacistId) return `${baseUrl}/pharmacist/dashboard`;
      if (doctorId) return `${baseUrl}/doctor/dashboard`;
      return `${baseUrl}/admin/dashboard`;
    case 'medical_form_submitted':
    case 'medical_form_new':
      return `${baseUrl}/admin/dashboard`;
    case 'medical_form_assigned':
    case 'medical_form_completed':
    case 'medical_form_paid':
      return `${baseUrl}/patient/dashboard`;
    case 'medical_form_assignment':
    case 'medical_form_result_uploaded':
      if (pharmacistId) return `${baseUrl}/pharmacist/dashboard`;
      if (doctorId) return `${baseUrl}/doctor/dashboard`;
      return `${baseUrl}/admin/dashboard`;
    case 'complaint_updated':
      return `${baseUrl}/patient/dashboard`;
    case 'new_complaint':
      return `${baseUrl}/admin/dashboard`;
    default:
      return `${baseUrl}/patient/dashboard`;
  }
}

// Notify on booking confirmation
async function notifyBookingConfirmed({ booking, patientName, pharmacistName }) {
  try {
    const professionalName = pharmacistName; // This parameter name is kept for backward compatibility
    const professionalType = booking.nutritionistId ? 'nutritionist' : booking.pharmacistId ? 'pharmacist' : 'doctor';
    const professionalId = booking.nutritionistId || booking.pharmacistId || booking.doctorId;
    const bookingDate = new Date(booking.slotDate).toLocaleDateString();
    const bookingTime = booking.slotTime;

    // Notify patient with in-app notification
    await createNotification({
      userId: booking.patientId,
      type: 'booking_confirmed',
      title: 'Booking Confirmed',
      message: `Your booking with ${professionalName} on ${bookingDate} at ${bookingTime} has been confirmed.`,
      bookingId: booking._id,
      pharmacistId: booking.pharmacistId,
      doctorId: booking.doctorId
    });

    // Notify professional (pharmacist or doctor)
    let professional;
    if (professionalType === 'doctor') {
      professional = await Doctor.findById(professionalId);
    } else {
      professional = await Pharmacist.findById(professionalId);
    }
    
    if (professional && professional.userId) {
      await createNotification({
        userId: professional.userId,
        type: 'new_booking',
        title: 'New Booking Received',
        message: `You have a new booking from ${patientName} on ${bookingDate} at ${bookingTime}.`,
        bookingId: booking._id,
        pharmacistId: booking.pharmacistId,
        doctorId: booking.doctorId,
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
        message: `${patientName} booked an appointment with ${professionalName} on ${bookingDate} at ${bookingTime}.`,
        bookingId: booking._id,
        pharmacistId: booking.pharmacistId,
        doctorId: booking.doctorId,
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
    const professionalName = pharmacistName; // Keep parameter name for backward compatibility
    const bookingDate = new Date(booking.slotDate).toLocaleDateString();
    const bookingTime = booking.slotTime;

    // Notify patient
    await createNotification({
      userId: booking.patientId,
      type: 'meeting_link_added',
      title: 'Meeting Link Available',
      message: `${professionalName} has added the meeting link for your appointment on ${bookingDate} at ${bookingTime}.`,
      bookingId: booking._id,
      pharmacistId: booking.pharmacistId,
      doctorId: booking.doctorId
    });

    // Notify all admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        type: 'meeting_link_added',
        title: 'Meeting Link Added',
        message: `${professionalName} has added a meeting link for the appointment on ${bookingDate} at ${bookingTime}.`,
        bookingId: booking._id,
        pharmacistId: booking.pharmacistId,
        doctorId: booking.doctorId,
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
    const professionalName = pharmacistName; // Keep parameter name for backward compatibility

    // Notify patient
    await createNotification({
      userId: booking.patientId,
      type: 'test_result_uploaded',
      title: 'Test Result Uploaded',
      message: `${professionalName} has uploaded your test result. You can view it in your dashboard.`,
      bookingId: booking._id,
      pharmacistId: booking.pharmacistId,
      doctorId: booking.doctorId
    });

    // Notify all admins
    const admins = await User.find({ role: 'admin' });
    const patient = await User.findById(booking.patientId);
    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        type: 'session_completed',
        title: 'Session Completed',
        message: `${professionalName} has completed the session with ${patient?.name || 'patient'} and uploaded test results.`,
        bookingId: booking._id,
        pharmacistId: booking.pharmacistId,
        doctorId: booking.doctorId,
        patientId: booking.patientId
      });
    }
    
  } catch (err) {
    console.error('Error in notifyTestResultUploaded:', err);
  }
}

// Notify on payment approval - updated to support both pharmacists and doctors
async function notifyPaymentApproved({ professionalUserId, professionalName, amount, bookingCount, professionalType = 'pharmacist' }) {
  try {
    await createNotification({
      userId: professionalUserId,
      type: 'payment_approved',
      title: 'Payment Received',
      message: `Great news! Your payment of ₹${amount} for ${bookingCount} completed session(s) has been processed and credited to your account.`,
    });
    
  } catch (err) {
    console.error('Error in notifyPaymentApproved:', err);
  }
}

// Notify on review submission
async function notifyReviewSubmitted({ booking, patientName, rating, feedback }) {
  try {
    const professionalId = booking.nutritionistId || booking.pharmacistId || booking.doctorId;
    const professionalType = booking.nutritionistId ? 'nutritionist' : booking.pharmacistId ? 'pharmacist' : 'doctor';
    
    // Find the professional's user ID
    let professional;
    if (booking.nutritionistId) {
      const Nutritionist = require('../models/Nutritionist');
      professional = await Nutritionist.findById(booking.nutritionistId).populate('userId');
    } else if (booking.pharmacistId) {
      professional = await Pharmacist.findById(booking.pharmacistId).populate('userId');
    } else if (booking.doctorId) {
      professional = await Doctor.findById(booking.doctorId).populate('userId');
    }
    
    if (professional && professional.userId) {
      const stars = '⭐'.repeat(rating);
      await createNotification({
        userId: professional.userId._id,
        type: 'review_received',
        title: 'New Review Received',
        message: `${patientName} rated your consultation ${stars} (${rating}/5)${feedback ? ': "' + feedback.substring(0, 100) + (feedback.length > 100 ? '..."' : '"') : ''}`,
        bookingId: booking._id,
        pharmacistId: booking.pharmacistId,
        doctorId: booking.doctorId,
        patientId: booking.patientId
      });
    }
    
  } catch (err) {
    console.error('Error in notifyReviewSubmitted:', err);
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
  notifyReviewSubmitted,
  notifyComplaintSubmitted,
  notifyComplaintUpdated
};
// Medical Form Notifications

// Notify when medical form is submitted
async function notifyMedicalFormSubmitted({ patientId, patientName, formId }) {
  try {
    // Notify patient
    await createNotification({
      userId: patientId,
      type: 'medical_form_submitted',
      title: 'Medical Form Submitted',
      message: `Your medical form has been submitted successfully and is under review. Form ID: ${formId}`,
      medicalFormId: formId
    });

    // Notify all admins about new medical form
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        type: 'medical_form_new',
        title: 'New Medical Form Submitted',
        message: `${patientName} has submitted a new medical form for review. Form ID: ${formId}`,
        patientId: patientId,
        medicalFormId: formId
      });
    }

    console.log('Medical form submission notifications sent');
  } catch (err) {
    console.error('Error sending medical form submission notifications:', err);
  }
}

// Notify when medical form is assigned to professional
async function notifyMedicalFormAssigned({ patientId, patientName, professionalId, professionalName, professionalType, formId, assignedBy }) {
  try {
    // Notify patient
    await createNotification({
      userId: patientId,
      type: 'medical_form_assigned',
      title: 'Medical Form Assigned',
      message: `Your medical form has been assigned to ${professionalName} (${professionalType}) for review.`,
      medicalFormId: formId,
      [professionalType === 'doctor' ? 'doctorId' : 'pharmacistId']: professionalId
    });

    // Notify professional
    await createNotification({
      userId: professionalId,
      type: 'medical_form_assignment',
      title: 'New Medical Form Assignment',
      message: `You have been assigned a medical form from ${patientName} for review. Form ID: ${formId}`,
      patientId: patientId,
      medicalFormId: formId
    });

    // Notify admin who assigned
    await createNotification({
      userId: assignedBy,
      type: 'medical_form_assignment_confirmed',
      title: 'Medical Form Assignment Confirmed',
      message: `Medical form ${formId} has been successfully assigned to ${professionalName}.`,
      patientId: patientId,
      medicalFormId: formId,
      [professionalType === 'doctor' ? 'doctorId' : 'pharmacistId']: professionalId
    });

    console.log('Medical form assignment notifications sent');
  } catch (err) {
    console.error('Error sending medical form assignment notifications:', err);
  }
}

// Notify when medical form analysis is completed
async function notifyMedicalFormCompleted({ patientId, patientName, professionalId, professionalName, professionalType, formId, resultNotes }) {
  try {
    // Notify patient
    await createNotification({
      userId: patientId,
      type: 'medical_form_completed',
      title: 'Medical Analysis Complete',
      message: `Your medical form analysis by ${professionalName} is complete! Pay ₹29 to download your report.`,
      medicalFormId: formId,
      [professionalType === 'doctor' ? 'doctorId' : 'pharmacistId']: professionalId
    });

    // Notify professional
    await createNotification({
      userId: professionalId,
      type: 'medical_form_result_uploaded',
      title: 'Medical Form Analysis Submitted',
      message: `Your analysis for ${patientName}'s medical form has been submitted successfully. Patient will be notified.`,
      patientId: patientId,
      medicalFormId: formId
    });

    // Notify all admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        type: 'medical_form_analysis_completed',
        title: 'Medical Form Analysis Completed',
        message: `${professionalName} has completed analysis for ${patientName}'s medical form. Awaiting patient payment.`,
        patientId: patientId,
        medicalFormId: formId,
        [professionalType === 'doctor' ? 'doctorId' : 'pharmacistId']: professionalId
      });
    }

    console.log('Medical form completion notifications sent');
  } catch (err) {
    console.error('Error sending medical form completion notifications:', err);
  }
}

// Notify when medical form payment is completed
async function notifyMedicalFormPaid({ patientId, patientName, professionalId, professionalName, professionalType, formId, paymentId, amount }) {
  try {
    // Notify patient
    await createNotification({
      userId: patientId,
      type: 'medical_form_paid',
      title: 'Payment Successful - Report Ready',
      message: `Payment successful! Your medical analysis report is now ready for download. Payment ID: ${paymentId}`,
      medicalFormId: formId,
      [professionalType === 'doctor' ? 'doctorId' : 'pharmacistId']: professionalId
    });

    // Notify professional about earning
    await createNotification({
     userId: professionalId,
     type: 'medical_form_payment_received',
     title: 'Payment Received',
     message: `Payment received for ${patientName}'s medical form analysis. You earned ₹${amount/2} (50% of ₹${amount}).`,
     patientId: patientId,
     medicalFormId: formId
   });

    // Notify all admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        type: 'medical_form_payment_completed',
        title: 'Medical Form Payment Completed',
        message: `${patientName} completed payment (₹${amount}) for medical form ${formId}. Professional: ${professionalName}`,
        patientId: patientId,
        medicalFormId: formId,
        [professionalType === 'doctor' ? 'doctorId' : 'pharmacistId']: professionalId
      });
    }

    console.log('Medical form payment notifications sent');
  } catch (err) {
    console.error('Error sending medical form payment notifications:', err);
  }
}

module.exports = {
  createNotification,
  notifyBookingConfirmed,
  notifyMeetingLinkAdded,
  notifyTestResultUploaded,
  notifyPaymentApproved,
  notifyReviewSubmitted,
  notifyComplaintSubmitted,
  notifyComplaintUpdated,
  // Medical Form Notifications
  notifyMedicalFormSubmitted,
  notifyMedicalFormAssigned,
  notifyMedicalFormCompleted,
  notifyMedicalFormPaid
};
