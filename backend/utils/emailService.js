const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Email templates
const emailTemplates = {
  passwordReset: (resetLink, userName) => ({
    subject: 'Password Reset Request -Drx Consult Patient Counselling App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #2c3e50; margin: 0;">Password Reset Request</h2>
        </div>
        
        <p>Hello ${userName},</p>
        
        <p>We received a request to reset your password for your Patient Counselling App account.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p>This link will expire in 1 hour for security reasons.</p>
        
        <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${resetLink}">${resetLink}</a>
        </p>
      </div>
    `
  }),

  bookingConfirmation: (booking, patientName, pharmacistName, pharmacistEmail) => ({
    subject: 'Booking Confirmation -Drx Consult Patient Counselling App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #27ae60; margin: 0;">✅ Booking Confirmed</h2>
        </div>
        
        <p>Hello ${patientName},</p>
        
        <p>Your ${booking.serviceType === 'prescription_review' ? 'prescription review' : 'consultation'} session has been successfully booked!</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">Booking Details:</h3>
          <p><strong>Service:</strong> ${booking.serviceType === 'prescription_review' ? 'Know Your Prescription (₹200)' : 'Full Consultation (₹500)'}</p>
          <p><strong>Pharmacist:</strong> ${pharmacistName}</p>
          <p><strong>Date:</strong> ${new Date(booking.slotDate).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${booking.slotTime}</p>
          <p><strong>Status:</strong> ${booking.status}</p>
          <p><strong>Patient Age:</strong> ${booking.patientDetails?.age || 'N/A'}</p>
          <p><strong>Patient Sex:</strong> ${booking.patientDetails?.sex || 'N/A'}</p>
          ${booking.meetLink ? `<p><strong>Meeting Link:</strong> <a href="${booking.meetLink}">Join Meeting</a></p>` : '<p><em>Meeting link will be provided by the pharmacist before the session.</em></p>'}
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #856404;">Service Details:</h4>
          ${booking.serviceType === 'prescription_review' 
            ? '<p>📋 <strong>Prescription Review:</strong> Our pharmacist will review your uploaded prescription and provide guidance on medication usage, side effects, and interactions.</p>'
            : '<p>👨‍⚕️ <strong>Full Consultation:</strong> Comprehensive consultation including prescription review, health assessment, and personalized medication counseling.</p>'
          }
        </div>
        
        <p>Please be available at the scheduled time. You will receive the meeting link from your pharmacist before the session begins.</p>
        
        <p>If you need to cancel or reschedule, please contact us as soon as possible.</p>
        
        <p>Thank you for choosing our Patient Counselling service!</p>
      </div>
    `
  }),

  pharmacistBookingNotification: (booking, patientName, patientEmail, patientPhone) => ({
    subject: 'New Booking Received -Drx Consult Patient Counselling App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #856404; margin: 0;">📅 New Booking Received</h2>
        </div>
        
        <p>Hello,</p>
        
        <p>You have received a new booking for a ${booking.serviceType === 'prescription_review' ? 'prescription review' : 'consultation'} session.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">Booking Details:</h3>
          <p><strong>Service Type:</strong> ${booking.serviceType === 'prescription_review' ? 'Know Your Prescription (₹200)' : 'Full Consultation (₹500)'}</p>
          <p><strong>Patient:</strong> ${patientName}</p>
          <p><strong>Email:</strong> ${patientEmail}</p>
          ${patientPhone ? `<p><strong>Phone:</strong> ${patientPhone}</p>` : ''}
          <p><strong>Date:</strong> ${new Date(booking.slotDate).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${booking.slotTime}</p>
          <p><strong>Booking ID:</strong> ${booking._id}</p>
        </div>
        
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #1565c0;">Patient Information:</h4>
          <p><strong>Age:</strong> ${booking.patientDetails?.age || 'N/A'} years</p>
          <p><strong>Sex:</strong> ${booking.patientDetails?.sex || 'N/A'}</p>
          ${booking.patientDetails?.prescriptionUrl ? `<p><strong>Prescription:</strong> <a href="${booking.patientDetails.prescriptionUrl}" target="_blank">View Prescription</a></p>` : ''}
          ${booking.patientDetails?.additionalNotes ? `<p><strong>Additional Notes:</strong> ${booking.patientDetails.additionalNotes}</p>` : ''}
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #856404;">Your Earnings:</h4>
          <p><strong>Your Share:</strong> ₹${booking.pharmacistShare || (booking.serviceType === 'prescription_review' ? 100 : 250)}</p>
          <p><em>50% of the total booking amount</em></p>
        </div>
        
        <p>Please log in to your dashboard to:</p>
        <ul>
          <li>Review the patient's prescription</li>
          <li>Add the meeting link for this session</li>
          <li>View complete patient details</li>
          <li>Manage your bookings</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/pharmacist/dashboard" 
             style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Go to Dashboard
          </a>
        </div>
      </div>
    `
  }),

  meetingLinkAdded: (booking, patientName, pharmacistName) => ({
    subject: 'Meeting Link Added -Drx Consult Patient Counselling App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #d4edda; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #155724; margin: 0;">🔗 Meeting Link Ready</h2>
        </div>
        
        <p>Hello ${patientName},</p>
        
        <p>Your pharmacist has added the meeting link for your upcoming counselling session.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">Session Details:</h3>
          <p><strong>Pharmacist:</strong> ${pharmacistName}</p>
          <p><strong>Date:</strong> ${new Date(booking.slotDate).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${booking.slotTime}</p>
          <p><strong>Meeting Link:</strong> <a href="${booking.meetLink}" style="color: #3498db;">Join Meeting</a></p>
        </div>
        
        <p>Please join the meeting at the scheduled time using the link above.</p>
        
        <p>We recommend joining a few minutes early to ensure everything is working properly.</p>
      </div>
    `
  }),

  reportSubmitted: (booking, patientName, pharmacistName) => ({
    subject: 'Counselling Report Available -Drx Consult Patient Counselling App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #d1ecf1; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #0c5460; margin: 0;">📋 Counselling Report Ready</h2>
        </div>
        
        <p>Hello ${patientName},</p>
        
        <p>Your counselling report from ${pharmacistName} is now available.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">Session Details:</h3>
          <p><strong>Pharmacist:</strong> ${pharmacistName}</p>
          <p><strong>Date:</strong> ${new Date(booking.slotDate).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${booking.slotTime}</p>
          <p><strong>Status:</strong> Completed</p>
        </div>
        
        <p>You can view and download your counselling report by logging into your patient dashboard.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/patient/dashboard" 
             style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Report
          </a>
        </div>
        
        <p>Thank you for using Drx Consult!</p>
      </div>
    `
  }),

  testResultUploaded: (booking, patientName, pharmacistName) => ({
    subject: 'Test Results Available - Drx Consult',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #856404; margin: 0;">🧪 Test Results Available</h2>
        </div>
        
        <p>Hello ${patientName},</p>
        
        <p>New test results have been uploaded by ${pharmacistName}.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">Details:</h3>
          <p><strong>Pharmacist:</strong> ${pharmacistName}</p>
          <p><strong>Session Date:</strong> ${new Date(booking.slotDate).toLocaleDateString()}</p>
          <p><strong>Upload Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        
        <p>You can view and download your test results by logging into your patient dashboard.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/patient/dashboard" 
             style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Test Results
          </a>
        </div>
        
        <p>Please review your results and follow any recommendations provided by your pharmacist.</p>
      </div>
    `
  }),

  userSuspended: (userName, reason, adminName) => ({
    subject: 'Account Suspended - Drx Consult',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fee; padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #e74c3c;">
          <h2 style="color: #c0392b; margin: 0;">⚠️ Account Suspended</h2>
        </div>
        
        <p>Dear ${userName},</p>
        
        <p>We regret to inform you that your Medecil account has been suspended.</p>
        
        <div style="background-color: #fef5e7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f39c12;">
          <p style="margin: 0; color: #8b4513;"><strong>Reason:</strong> ${reason}</p>
          <p style="margin: 10px 0 0 0; color: #8b4513;"><strong>Suspended by:</strong> ${adminName}</p>
          <p style="margin: 10px 0 0 0; color: #8b4513;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        
        <p>During the suspension period, you will not be able to:</p>
        <ul style="color: #555; line-height: 1.6;">
          <li>Access your account dashboard</li>
          <li>Book new consultations</li>
          <li>Use platform services</li>
        </ul>
        
        <p>If you believe this suspension was made in error or would like to appeal this decision, please contact our support team:</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #555;"><strong>Email:</strong> support@medecil.in</p>
          <p style="margin: 5px 0 0 0; color: #555;"><strong>Subject:</strong> Account Suspension Appeal - ${userName}</p>
        </div>
        
        <p>We appreciate your understanding and cooperation.</p>
        
        <p>Best regards,<br/>The Drx Consult Team</p>
      </div>
    `
  }),

  userUnsuspended: (userName, adminName) => ({
    subject: 'Account Reactivated - Drx Consult',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #27ae60;">
          <h2 style="color: #27ae60; margin: 0;">✅ Account Reactivated</h2>
        </div>
        
        <p>Dear ${userName},</p>
        
        <p>Good news! Your Medecil account has been reactivated and you now have full access to all platform services.</p>
        
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #27ae60;">
          <p style="margin: 0; color: #2d5a2d;"><strong>Reactivated by:</strong> ${adminName}</p>
          <p style="margin: 10px 0 0 0; color: #2d5a2d;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        
        <p>You can now:</p>
        <ul style="color: #555; line-height: 1.6;">
          <li>Access your account dashboard</li>
          <li>Book consultations with pharmacists</li>
          <li>Use all platform features</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/login" 
             style="background-color: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Login to Your Account
          </a>
        </div>
        
        <p>We're glad to have you back! If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        
        <p>Best regards,<br/>The Drx Consult Team</p>
      </div>
    `
  })
};

// Send email function
const sendEmail = async (to, templateFunction, ...templateArgs) => {
  try {
    const transporter = createTransporter();
    const emailContent = templateFunction(...templateArgs);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: to,
      subject: emailContent.subject,
      html: emailContent.html
    };

    const result = await transporter.sendMail(mailOptions);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Specific email functions
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  return await sendEmail(email, emailTemplates.passwordReset, resetLink, userName);
};

const sendBookingConfirmationEmail = async (patientEmail, booking, patientName, pharmacistName) => {
  return await sendEmail(patientEmail, emailTemplates.bookingConfirmation, booking, patientName, pharmacistName);
};

const sendPharmacistBookingNotification = async (pharmacistEmail, booking, patientName, patientEmail, patientPhone) => {
  return await sendEmail(pharmacistEmail, emailTemplates.pharmacistBookingNotification, booking, patientName, patientEmail, patientPhone);
};

const sendMeetingLinkEmail = async (patientEmail, booking, patientName, pharmacistName) => {
  return await sendEmail(patientEmail, emailTemplates.meetingLinkAdded, booking, patientName, pharmacistName);
};

const sendReportSubmittedEmail = async (patientEmail, booking, patientName, pharmacistName) => {
  return await sendEmail(patientEmail, emailTemplates.reportSubmitted, booking, patientName, pharmacistName);
};

const sendTestResultEmail = async (patientEmail, booking, patientName, pharmacistName) => {
  return await sendEmail(patientEmail, emailTemplates.testResultUploaded, booking, patientName, pharmacistName);
};

const sendUserSuspensionEmail = async (userEmail, userName, reason, adminName) => {
  return await sendEmail(userEmail, emailTemplates.userSuspended, userName, reason, adminName);
};

const sendUserUnsuspensionEmail = async (userEmail, userName, adminName) => {
  return await sendEmail(userEmail, emailTemplates.userUnsuspended, userName, adminName);
};

/**
 * Send OTP verification email
 */
const sendOTPEmail = async (email, otp, userName = '', type = 'signup') => {
  try {

    let subject, htmlContent;
    
    switch (type) {
      case 'signup':
        subject = 'Verify Your Email - Medecil';
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin: 0;">Medecil</h1>
                <p style="color: #666; margin: 5px 0;">Email Verification Required</p>
              </div>
              
              <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName || 'User'}!</h2>
              
              <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">
                Welcome to Medecil! To complete your account registration, please verify your email address using the OTP below:
              </p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;">
                <p style="color: #374151; margin: 0 0 10px 0; font-size: 14px;">Your Verification Code:</p>
                <h1 style="color: #2563eb; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">${otp}</h1>
              </div>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  <strong>Important:</strong> This OTP will expire in 10 minutes. You have 3 attempts to enter the correct code.
                </p>
              </div>
              
              <p style="color: #555; line-height: 1.6; margin: 20px 0;">
                If you didn't create an account with us, please ignore this email.
              </p>
              
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  This is an automated email. Please do not reply to this message.
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">
                  © ${new Date().getFullYear()} Medecil. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        `;
        break;
        
      default:
        subject = 'Verification Code - Medecil';
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Verification Code</h2>
            <p>Your verification code is: <strong style="font-size: 24px; color: #2563eb;">${otp}</strong></p>
            <p>This code will expire in 10 minutes.</p>
          </div>
        `;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Medecil <noreply@medecil.in>',
      to: email,
      subject: subject,
      html: htmlContent
    };

    const transporter = createTransporter();
    const result = await transporter.sendMail(mailOptions);

    return { 
      success: true, 
      messageId: result.messageId,
      type: type
    };
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${email}:`, error);
    return { 
      success: false, 
      error: error.message,
      type: type
    };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendBookingConfirmationEmail,
  sendPharmacistBookingNotification,
  sendMeetingLinkEmail,
  sendReportSubmittedEmail,
  sendTestResultEmail,
  sendUserSuspensionEmail,
  sendUserUnsuspensionEmail,
  sendOTPEmail,
  sendEmail,
  emailTemplates
};
