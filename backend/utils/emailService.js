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
    subject: 'Password Reset Request -DrX Consult Digital Heathcare Platform',
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

  bookingConfirmation: (booking, patientName, professionalName, professionalEmail) => ({
    subject: 'Booking Confirmation -DrX Consult Digital Heathcare Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #27ae60; margin: 0;">✅ Booking Confirmed</h2>
        </div>
        
        <p>Hello ${patientName},</p>
        
        <p>Your ${booking.serviceType === 'prescription_review' ? 'prescription review' : booking.serviceType === 'doctor_consultation' ? 'doctor consultation' : 'consultation'} session has been successfully booked!</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">Booking Details:</h3>
          <p><strong>Service:</strong> ${booking.serviceType === 'prescription_review' ? 'Know Your Prescription' : booking.serviceType === 'doctor_consultation' ? 'Doctor Consultation' : booking.serviceType === 'nutritionist_consultation' ? 'Nutritionist Consultation' : 'Full Consultation'}</p>
          <p><strong>Professional:</strong> ${professionalName}</p>
          <p><strong>Date:</strong> ${new Date(booking.slotDate).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${booking.slotTime}</p>
          <p><strong>Status:</strong> ${booking.status}</p>
          ${booking.meetLink ? `<p><strong>Meeting Link:</strong> <a href="${booking.meetLink}">Join Meeting</a></p>` : '<p><em>Meeting link will be provided by the professional before the session.</em></p>'}
        </div>

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #166534;">💳 Payment Breakdown</h4>
          ${(() => {
            const total = booking.paymentAmount || 0;
            const base  = total / 1.054;
            const prof  = Math.ceil(base * 0.70 * 100) / 100;
            const plat  = Math.ceil(base * 0.30 * 100) / 100;
            const gst   = Math.ceil(base * 0.054 * 100) / 100;
            const drift = parseFloat((total - (prof + plat + gst)).toFixed(2));
            const profAdj = parseFloat((prof + drift).toFixed(2));
            return `
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr style="border-bottom:1px solid #d1fae5;">
                <td style="padding:6px 0;color:#374151;">Professional Fee (${professionalName})<br><span style="font-size:11px;color:#6b7280;">70% of base amount</span></td>
                <td style="padding:6px 0;text-align:right;color:#374151;">₹${profAdj.toFixed(2)}</td>
              </tr>
              <tr style="border-bottom:1px solid #d1fae5;">
                <td style="padding:6px 0;color:#374151;">Platform Service Fee<br><span style="font-size:11px;color:#6b7280;">30% of base amount (excl. GST)</span></td>
                <td style="padding:6px 0;text-align:right;color:#374151;">₹${plat.toFixed(2)}</td>
              </tr>
              <tr style="border-bottom:1px solid #d1fae5;">
                <td style="padding:6px 0;color:#374151;">GST @ 18%<br><span style="font-size:11px;color:#6b7280;">18% on platform service fee (₹${plat.toFixed(2)})</span></td>
                <td style="padding:6px 0;text-align:right;color:#374151;">₹${gst.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding:8px;background:#166534;color:#fff;font-weight:bold;border-radius:4px 0 0 4px;">Total Amount Charged</td>
                <td style="padding:8px;background:#166534;color:#fff;font-weight:bold;text-align:right;border-radius:0 4px 4px 0;">₹${total.toFixed(2)}</td>
              </tr>
            </table>
            <p style="margin:8px 0 0;font-size:11px;color:#6b7280;">Invoice attached. Base = Professional fee + Platform fee. GST @ 18% is on platform fee only. Rounding applied upward.</p>
            `;
          })()}
        </div>
        
        <p>Please be available at the scheduled time. You will receive the meeting link from your professional before the session begins.</p>
        <p>Thank you for choosing Drx Consult!</p>
      </div>
    `
  }),

  professionalBookingNotification: (booking, patientName, patientEmail, patientPhone) => ({
    subject: 'New Booking Received -DrX Consult Digital Heathcare Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #856404; margin: 0;">📅 New Booking Received</h2>
        </div>
        
        <p>Hello,</p>
        
        <p>You have received a new booking for a ${booking.serviceType === 'prescription_review' ? 'prescription review' : booking.serviceType === 'doctor_consultation' ? 'doctor consultation' : booking.serviceType === 'nutritionist_consultation' ? 'nutritionist consultation' : 'consultation'} session.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">Booking Details:</h3>
          <p><strong>Service Type:</strong> ${booking.serviceType === 'prescription_review' ? 'Know Your Prescription (₹149)' : booking.serviceType === 'doctor_consultation' ? `Doctor Consultation (₹${booking.paymentAmount || 499})` : booking.serviceType === 'nutritionist_consultation' ? `Nutritionist Consultation (₹${booking.paymentAmount || 500})` : 'Full Consultation (₹449)'}</p>
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
          <p><strong>Your Share:</strong> ₹${booking.pharmacistShare || booking.doctorShare || booking.nutritionistShare || (booking.serviceType === 'prescription_review' ? Math.round(149 * 0.7) : booking.serviceType === 'doctor_consultation' ? 250 : booking.serviceType === 'nutritionist_consultation' ? Math.round((booking.paymentAmount || 500) * 0.7) : Math.round(449 * 0.7))}</p>
          <p><em>70% of the total booking amount</em></p>
        </div>
        
        <p>Please log in to your dashboard to:</p>
        <ul>
          <li>Review the patient's prescription</li>
          <li>Add the meeting link for this session</li>
          <li>View complete patient details</li>
          <li>Manage your bookings</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/${booking.providerType === 'nutritionist' ? 'nutritionist' : booking.providerType === 'doctor' ? 'doctor' : 'pharmacist'}/dashboard" 
             style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Go to Dashboard
          </a>
        </div>
      </div>
    `
  }),

  meetingLinkAdded: (booking, patientName, pharmacistName, professionalType = 'pharmacist') => ({
    subject: 'Meeting Link Added -DrX Consult Digital Heathcare Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #d4edda; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #155724; margin: 0;">🔗 Meeting Link Ready</h2>
        </div>
        
        <p>Hello ${patientName},</p>
        
        <p>Your ${professionalType === 'nutritionist' ? 'nutritionist' : professionalType === 'doctor' ? 'doctor' : 'pharmacist'} has added the meeting link for your upcoming ${professionalType === 'nutritionist' ? 'nutrition' : professionalType === 'doctor' ? 'medical' : 'counselling'} session.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">Session Details:</h3>
          <p><strong>${professionalType === 'nutritionist' ? 'Nutritionist' : professionalType === 'doctor' ? 'Doctor' : 'Pharmacist'}:</strong> ${pharmacistName}</p>
          <p><strong>Date:</strong> ${new Date(booking.slotDate).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${booking.slotTime}</p>
          <p><strong>Meeting Link:</strong> <a href="${booking.meetLink}" style="color: #3498db;">Join Meeting</a></p>
        </div>
        
        <p>Please join the meeting at the scheduled time using the link above.</p>
        
        <p>We recommend joining a few minutes early to ensure everything is working properly.</p>
      </div>
    `
  }),

  reportSubmitted: (booking, patientName, pharmacistName, professionalType = 'pharmacist') => ({
    subject: 'Counselling Report Available -DrX Consult Digital Heathcare Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #d1ecf1; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #0c5460; margin: 0;">📋 ${professionalType === 'nutritionist' ? 'Nutrition' : professionalType === 'doctor' ? 'Medical' : 'Counselling'} Report Ready</h2>
        </div>
        
        <p>Hello ${patientName},</p>
        
        <p>Your ${professionalType === 'nutritionist' ? 'nutrition' : professionalType === 'doctor' ? 'medical' : 'counselling'} report from ${pharmacistName} is now available.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">Session Details:</h3>
          <p><strong>${professionalType === 'nutritionist' ? 'Nutritionist' : professionalType === 'doctor' ? 'Doctor' : 'Pharmacist'}:</strong> ${pharmacistName}</p>
          <p><strong>Date:</strong> ${new Date(booking.slotDate).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${booking.slotTime}</p>
          <p><strong>Status:</strong> Completed</p>
        </div>
        
        <p>You can view and download your ${professionalType === 'nutritionist' ? 'nutrition' : professionalType === 'doctor' ? 'medical' : 'counselling'} report by logging into your patient dashboard.</p>
        
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

  testResultUploaded: (booking, patientName, pharmacistName, professionalType = 'pharmacist') => ({
    subject: 'Test Results Available - DrX Consult Digital Heathcare Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #856404; margin: 0;">🧪 Test Results Available</h2>
        </div>
        
        <p>Hello ${patientName},</p>
        
        <p>New test results have been uploaded by ${pharmacistName}.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">Details:</h3>
          <p><strong>${professionalType === 'nutritionist' ? 'Nutritionist' : professionalType === 'doctor' ? 'Doctor' : 'Pharmacist'}:</strong> ${pharmacistName}</p>
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
        
        <p>Please review your results and follow any recommendations provided by your ${professionalType === 'nutritionist' ? 'nutritionist' : professionalType === 'doctor' ? 'doctor' : 'pharmacist'}.</p>
      </div>
    `
  }),

  userSuspended: (userName, reason, adminName) => ({
    subject: 'Account Suspended - DrX Consult Digital Heathcare Platform',
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
    subject: 'Account Reactivated - DrX Consult Digital Heathcare Platform',
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
  }),

  welcomeEmail: (userName, userEmail) => ({
    subject: 'Welcome to Drx Consult - Your Healthcare Journey Begins!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #e3f2fd; padding: 30px; border-radius: 10px; margin-bottom: 20px; text-align: center;">
          <h1 style="color: #1565c0; margin: 0 0 10px 0;">🎉 Welcome to Drx Consult!</h1>
          <p style="color: #1976d2; margin: 0; font-size: 18px;">Your trusted partner in healthcare guidance</p>
        </div>
        
        <p style="font-size: 16px;">Hello ${userName},</p>
        
        <p>Welcome to Drx Consult! We're thrilled to have you join our community of health-conscious individuals who prioritize informed healthcare decisions.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">🚀 What You Can Do Now:</h3>
          <ul style="color: #555; line-height: 1.8;">
            <li><strong>📋 Prescription Reviews:</strong> Get expert guidance on your medications (₹149)</li>
            <li><strong>👨‍⚕️ Full Consultations:</strong> Comprehensive health consultations with doctors (₹449)</li>
            <li><strong>💊 Pharmacist Sessions:</strong> Medication counseling with certified pharmacists</li>
            <li><strong>👨‍⚕️ Doctor Sessions:</strong> Health counseling with certified Doctors</li>
            <li><strong>👨‍⚕️ Certified Nutritionist Sessions:</strong> Create Peronal Diet Chart with certified Nutritionist</li>
            <li><strong>📱 Easy Booking:</strong> Schedule sessions at your convenience</li>
            <li><strong>📄 Digital Reports:</strong> Access your consultation reports anytime</li>
          </ul>
        </div>
        
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #856404;">💡 Save More with a Subscription Plan</h3>
          <p style="margin-bottom: 15px;">Get more from your healthcare with our plans:</p>
          <ul style="color: #856404; line-height: 1.6;">
            <li><strong>Women's Care:</strong> From ₹13,999 — Gynaecologist, diet coach, yoga & more</li>
            <li><strong>Chronic Care:</strong> From ₹18,999 — Doctor, BP/Diabetes/Thyroid management</li>
            <li><strong>Fat to Fit:</strong> From ₹12,999 — Diet coach, weight management & yoga</li>
          </ul>
          <div style="text-align: center; margin-top: 15px;">
            <a href="${process.env.FRONTEND_URL}/subscription-plans" 
               style="background-color: #f39c12; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Subscription Plans
            </a>
          </div>
        </div>
        
        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #27ae60;">🎯 Ready to Get Started?</h3>
          <p>Book your first consultation and experience the difference professional healthcare guidance can make!</p>
          <div style="text-align: center; margin-top: 15px;">
            <a href="${process.env.FRONTEND_URL}/" 
               style="background-color: #27ae60; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Book Your First Session
            </a>
          </div>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #495057;">📞 Need Help?</h4>
          <p style="margin-bottom: 10px;">Our support team is here to help:</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> support@drxconsult.in</p>
          <p style="margin: 5px 0;"><strong>Dashboard:</strong> <a href="${process.env.FRONTEND_URL}/patient/dashboard">Patient Dashboard</a></p>
        </div>
        
        <p>Thank you for choosing Drx Consult. We look forward to being part of your healthcare journey!</p>
        
        <p>Best regards,<br/>The Drx Consult Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          You received this email because you created an account at Drx Consult.<br/>
          If you have any questions, please contact us at support@drxconsult.in
        </p>
      </div>
    `
  }),

  subscriptionWelcome: (userName, subscription) => {
    const billingLabel = {
      threeMonths: '3-Month Plan',
      sixMonths: '6-Month Plan',
      twelveMonths: '12-Month Plan',
      monthly: 'Monthly Plan',
      yearly: 'Yearly Plan',
    }[subscription.billingCycle] || subscription.billingCycle;

    const planFeatures = {
      womensCare: {
        color: '#e91e8c',
        bg: '#fce4ec',
        icon: '🌸',
        features: [
          '1-to-1 Gynaecologist consultation',
          'Personalised diet chart',
          '1-to-1 Dietician consultation',
          '1 Comprehensive medical history',
          'Hair & skin care',
          'Live yoga sessions',
          'Period & PCOS care',
          'Weight management',
          '1-to-1 WhatsApp support',
          'Priority care',
        ]
      },
      chronic: {
        color: '#1565c0',
        bg: '#e3f2fd',
        icon: '🔵',
        features: [
          '1-to-1 Doctor consultation monthly',
          'Dedicated diet coach',
          'Personalised diet chart',
          'Comprehensive medical history',
          'BP management',
          'Diabetes management',
          'Thyroid care',
          'Live yoga sessions',
          'Weight sessions',
          '1-to-1 WhatsApp support',
          'Priority care',
        ]
      },
      fatToFit: {
        color: '#6a1b9a',
        bg: '#f3e5f5',
        icon: '🟣',
        features: [
          '1-to-1 diet coach',
          'Coach follow-up weekly',
          'Live yoga sessions',
          '1 Comprehensive medical history',
          'Personalised diet chart',
          'Weight management',
          '1-to-1 WhatsApp support',
          'Craving care',
          'Motivated week planning',
          'Cheat meal guidance',
        ]
      },
    };

    const meta = planFeatures[subscription.planType] || { color: '#27ae60', bg: '#e8f5e8', icon: '⭐', features: [] };

    return {
      subject: `Welcome to ${subscription.planName} - DrX Consult Digital Heathcare Platform`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: ${meta.bg}; padding: 30px; border-radius: 10px; margin-bottom: 20px; text-align: center; border-top: 4px solid ${meta.color};">
          <div style="font-size: 40px; margin-bottom: 10px;">${meta.icon}</div>
          <h1 style="color: ${meta.color}; margin: 0 0 8px 0;">🎉 Subscription Activated!</h1>
          <p style="color: #333; margin: 0; font-size: 18px; font-weight: bold;">Welcome to ${subscription.planName}</p>
        </div>

        <p style="font-size: 16px;">Hello ${userName},</p>
        <p>Your <strong>${subscription.planName}</strong> (${billingLabel}) has been successfully activated. Here's everything included in your plan.</p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">📋 Subscription Details</h3>
          <p style="margin: 6px 0;"><strong>Plan:</strong> ${subscription.planName}</p>
          <p style="margin: 6px 0;"><strong>Duration:</strong> ${billingLabel} — ₹${subscription.price.toLocaleString('en-IN')}</p>
          <p style="margin: 6px 0;"><strong>Start Date:</strong> ${new Date(subscription.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p style="margin: 6px 0;"><strong>Valid Until:</strong> ${new Date(subscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p style="margin: 6px 0;"><strong>Status:</strong> <span style="color: #27ae60; font-weight: bold;">Active ✅</span></p>
        </div>

        <div style="background-color: ${meta.bg}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${meta.color};">
          <h3 style="margin-top: 0; color: ${meta.color};">✅ What's Included in Your Plan</h3>
          <ul style="color: #333; line-height: 2; margin: 0; padding-left: 20px;">
            ${meta.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>

        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="margin-top: 0; color: #155724;">🚀 Get Started</h3>
          <p style="color: #155724; margin-bottom: 15px;">Your plan is active — visit your dashboard to access all features.</p>
          <a href="${process.env.FRONTEND_URL}/patient/dashboard"
             style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">
            Go to Dashboard
          </a>
          <a href="${process.env.FRONTEND_URL}/subscription-plans"
             style="background-color: #17a2b8; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Plans
          </a>
        </div>

        <p>Thank you for choosing Drx Consult. We're here to support your health journey!</p>
        <p>Best regards,<br/>The Drx Consult Team</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          Manage your subscription from your <a href="${process.env.FRONTEND_URL}/patient/dashboard">dashboard</a><br/>
          Questions? Contact us at support@drxconsult.in
        </p>
      </div>
    `
    };
  },

  subscriptionExpiring: (userName, subscription, daysLeft) => {
    const billingLabel = {
      threeMonths: '3-Month Plan', sixMonths: '6-Month Plan', twelveMonths: '12-Month Plan',
      monthly: 'Monthly Plan', yearly: 'Yearly Plan',
    }[subscription.billingCycle] || subscription.billingCycle;
    return ({
    subject: `Your ${subscription.planName} expires in ${daysLeft} days - Drx Consult`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fff3cd; padding: 30px; border-radius: 10px; margin-bottom: 20px; text-align: center; border-left: 4px solid #f39c12;">
          <h1 style="color: #856404; margin: 0 0 10px 0;">⏰ Subscription Expiring Soon</h1>
          <p style="color: #856404; margin: 0; font-size: 18px;">${daysLeft} days remaining</p>
        </div>
        
        <p style="font-size: 16px;">Hello ${userName},</p>
        <p>Your <strong>${subscription.planName}</strong> (${billingLabel}) will expire in <strong>${daysLeft} days</strong> on ${new Date(subscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">📋 Plan Details</h3>
          <p style="margin: 6px 0;"><strong>Plan:</strong> ${subscription.planName} — ${billingLabel}</p>
          <p style="margin: 6px 0;"><strong>Expires:</strong> ${new Date(subscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        
        <div style="background-color: #fee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e74c3c;">
          <h3 style="margin-top: 0; color: #c0392b;">⚠️ What Happens After Expiry</h3>
          <ul style="color: #721c24; line-height: 1.6;">
            <li>Access to all plan features will end</li>
            <li>Your consultation history remains accessible</li>
            <li>You can renew or upgrade at any time</li>
          </ul>
        </div>
        
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="margin-top: 0; color: #155724;">🔄 Renew Your Subscription</h3>
          <p style="color: #155724; margin-bottom: 15px;">Continue your healthcare journey without interruption!</p>
          <a href="${process.env.FRONTEND_URL}/subscription-plans" 
             style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">
            Renew Now
          </a>
          <a href="${process.env.FRONTEND_URL}/patient/dashboard" 
             style="background-color: #17a2b8; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Dashboard
          </a>
        </div>
        
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1565c0;">💡 Why Renew?</h3>
          <ul style="color: #1976d2; line-height: 1.8;">
            <li><strong>Save Money:</strong> Up to 50% off regular consultation prices</li>
            <li><strong>Convenience:</strong> Pre-paid sessions ready when you need them</li>
            <li><strong>Priority Access:</strong> Faster booking and premium support</li>
            <li><strong>Family Coverage:</strong> Multiple family members (Family plan)</li>
          </ul>
        </div>
        
        <p>Don't let your healthcare savings expire! Renew today and continue your wellness journey with Drx Consult.</p>
        
        <p>Best regards,<br/>The Drx Consult Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          Questions about renewal? Contact us at support@drxconsult.in<br/>
          Manage your subscription from your <a href="${process.env.FRONTEND_URL}/patient/dashboard">dashboard</a>
        </p>
      </div>
    `
    });
  },

  subscriptionExpired: (userName, subscription) => {
    const billingLabel = {
      threeMonths: '3-Month Plan', sixMonths: '6-Month Plan', twelveMonths: '12-Month Plan',
      monthly: 'Monthly Plan', yearly: 'Yearly Plan',
    }[subscription.billingCycle] || subscription.billingCycle;
    return ({
    subject: `Your ${subscription.planName} has expired - Drx Consult`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fee; padding: 30px; border-radius: 10px; margin-bottom: 20px; text-align: center; border-left: 4px solid #e74c3c;">
          <h1 style="color: #c0392b; margin: 0 0 10px 0;">⏰ Subscription Expired</h1>
          <p style="color: #721c24; margin: 0; font-size: 18px;">Your ${subscription.planName} has ended</p>
        </div>
        
        <p style="font-size: 16px;">Hello ${userName},</p>
        <p>Your <strong>${subscription.planName}</strong> (${billingLabel}) expired on ${new Date(subscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}. We hope you enjoyed the benefits!</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">📋 Subscription Summary</h3>
          <p style="margin: 6px 0;"><strong>Plan:</strong> ${subscription.planName} — ${billingLabel}</p>
          <p style="margin: 6px 0;"><strong>Period:</strong> ${new Date(subscription.startDate).toLocaleDateString('en-IN')} – ${new Date(subscription.endDate).toLocaleDateString('en-IN')}</p>
        </div>
        
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #856404;">📋 What's Changed</h3>
          <ul style="color: #856404; line-height: 1.6;">
            <li>Plan features are no longer active</li>
            <li>Your consultation history remains accessible</li>
            <li>You can subscribe again at any time</li>
          </ul>
        </div>
        
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="margin-top: 0; color: #155724;">🔄 Reactivate Your Subscription</h3>
          <p style="color: #155724; margin-bottom: 15px;">Continue your health journey — subscribe again anytime!</p>
          <a href="${process.env.FRONTEND_URL}/subscription-plans" 
             style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">
            View Plans
          </a>
          <a href="${process.env.FRONTEND_URL}/patient/dashboard" 
             style="background-color: #17a2b8; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Dashboard
          </a>
        </div>
        
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1565c0;">💝 Thank You!</h3>
          <p style="color: #1976d2;">Thank you for being a valued subscriber. We appreciate your trust in Drx Consult for your healthcare needs. You can continue using our platform at regular prices, and we'd love to have you back as a subscriber anytime!</p>
        </div>
        
        <p>Continue your healthcare journey with us, and remember - we're here whenever you need professional medical guidance.</p>
        
        <p>Best regards,<br/>The Drx Consult Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          Questions? Contact us at support@drxconsult.in<br/>
          Visit your <a href="${process.env.FRONTEND_URL}/patient/dashboard">dashboard</a> anytime
        </p>
      </div>
    `
    });
  },

  // Medical Form Email Templates
  subscriptionCancelled: (userName, subscription) => {
    const billingLabel = {
      threeMonths: '3-Month Plan', sixMonths: '6-Month Plan', twelveMonths: '12-Month Plan',
      monthly: 'Monthly Plan', yearly: 'Yearly Plan',
    }[subscription.billingCycle] || subscription.billingCycle;
    return {
      subject: `Your ${subscription.planName} has been cancelled - DrX Consult`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fdecea; padding: 30px; border-radius: 10px; margin-bottom: 20px; text-align: center; border-left: 4px solid #e74c3c;">
          <div style="font-size: 40px; margin-bottom: 10px;">❌</div>
          <h1 style="color: #c0392b; margin: 0 0 8px 0;">Subscription Cancelled</h1>
          <p style="color: #721c24; margin: 0; font-size: 16px;">Your ${subscription.planName} has been cancelled</p>
        </div>

        <p style="font-size: 16px;">Hello ${userName},</p>
        <p>We've received your cancellation request. Your <strong>${subscription.planName}</strong> (${billingLabel}) has been cancelled as requested.</p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">📋 Cancellation Details</h3>
          <p style="margin: 6px 0;"><strong>Plan:</strong> ${subscription.planName} — ${billingLabel}</p>
          <p style="margin: 6px 0;"><strong>Cancelled On:</strong> ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p style="margin: 6px 0;"><strong>Status:</strong> <span style="color: #e74c3c; font-weight: bold;">Cancelled</span></p>
        </div>

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #856404;">📋 What happens now?</h3>
          <ul style="color: #856404; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li>Your plan benefits are no longer active</li>
            <li>Your consultation history remains accessible</li>
            <li>You can subscribe again at any time</li>
          </ul>
        </div>

        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="margin-top: 0; color: #155724;">🔄 Changed your mind?</h3>
          <p style="color: #155724; margin-bottom: 15px;">You can reactivate your subscription anytime from our plans page.</p>
          <a href="${process.env.FRONTEND_URL}/subscription-plans"
             style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">
            View Plans
          </a>
          <a href="${process.env.FRONTEND_URL}/patient/dashboard"
             style="background-color: #17a2b8; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Dashboard
          </a>
        </div>

        <p>We're sorry to see you go. If there's anything we could have done better, please reach out to us at support@drxconsult.in.</p>
        <p>Best regards,<br/>The DrX Consult Team</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          Questions? Contact us at support@drxconsult.in<br/>
          Visit your <a href="${process.env.FRONTEND_URL}/patient/dashboard">dashboard</a> anytime
        </p>
      </div>
      `
    };
  },

  medicalFormSubmitted: (patientName, patientEmail, formId) => ({
    subject: 'Medical Form Submitted Successfully - Drx Consult',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #2e7d32; margin: 0;">📋 Medical Form Submitted</h2>
        </div>
        
        <p>Dear ${patientName},</p>
        
        <p>Your medical form has been successfully submitted and is now under review by our admin team.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">What happens next?</h3>
          <ul style="color: #666; line-height: 1.6;">
            <li>Our admin team will review your form within 24 hours</li>
            <li>A qualified professional (pharmacist or doctor) will be assigned</li>
            <li>You'll receive an email notification once the analysis is complete</li>
            <li>Results will be available for download after payment of ₹29</li>
          </ul>
        </div>
        
        <p>You can track the status of your medical form in your patient dashboard.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/patient/dashboard" 
             style="background-color: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Dashboard
          </a>
        </div>
        
        <p>Thank you for choosing Drx Consult for your healthcare needs.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          Form ID: ${formId}<br>
          If you have any questions, please contact our support team.
        </p>
      </div>
    `
  }),

  medicalFormAssigned: (patientName, patientEmail, professionalName, professionalType, formId) => ({
    subject: 'Medical Form Assigned for Review - Drx Consult',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #1976d2; margin: 0;">👨‍⚕️ Medical Form Under Review</h2>
        </div>
        
        <p>Dear ${patientName},</p>
        
        <p>Great news! Your medical form has been assigned to a qualified professional for review.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Assignment Details</h3>
          <p style="margin: 5px 0;"><strong>Assigned to:</strong> ${professionalName}</p>
          <p style="margin: 5px 0;"><strong>Professional Type:</strong> ${professionalType === 'nutritionist' ? 'Nutritionist' : professionalType === 'doctor' ? 'Doctor' : 'Pharmacist'}</p>
          <p style="margin: 5px 0;"><strong>Form ID:</strong> ${formId}</p>
        </div>
        
        <p>The ${professionalType === 'nutritionist' ? 'nutritionist' : professionalType} will carefully review your prescription and medical details to provide you with a comprehensive analysis.</p>
        
        <p>You'll receive another email notification once the analysis is complete and ready for download.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/patient/dashboard" 
             style="background-color: #2196f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Track Progress
          </a>
        </div>
        
        <p>Thank you for your patience.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    `
  }),

  medicalFormCompleted: (patientName, patientEmail, professionalName, professionalType, formId, resultNotes) => ({
    subject: 'Medical Form Analysis Complete - Payment Required - Drx Consult',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #2e7d32; margin: 0;">✅ Analysis Complete!</h2>
        </div>
        
        <p>Dear ${patientName},</p>
        
        <p>Excellent news! Your medical form analysis has been completed by ${professionalName} (${professionalType === 'nutritionist' ? 'Nutritionist' : professionalType === 'doctor' ? 'Doctor' : 'Pharmacist'}).</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Analysis Summary</h3>
          <p style="margin: 5px 0;"><strong>Reviewed by:</strong> ${professionalName}</p>
          <p style="margin: 5px 0;"><strong>Form ID:</strong> ${formId}</p>
          ${resultNotes ? `<p style="margin: 5px 0;"><strong>Notes:</strong> ${resultNotes}</p>` : ''}
        </div>
        
        <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
          <h3 style="color: #e65100; margin-top: 0;">💳 Payment Required</h3>
          <p style="margin: 5px 0;">To download your detailed analysis report, please complete the payment of <strong>₹29</strong>.</p>
          <p style="margin: 5px 0; color: #666; font-size: 14px;">Secure payment powered by Razorpay</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/patient/dashboard" 
             style="background-color: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Pay & Download Report
          </a>
        </div>
        
        <p>Your detailed analysis report is ready and waiting for you!</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This report contains professional medical analysis. Please consult with your healthcare provider for any medical decisions.
        </p>
      </div>
    `
  }),

  medicalFormPaid: (patientName, patientEmail, professionalName, professionalType, formId, paymentId) => ({
    subject: 'Payment Successful - Download Your Medical Report - Drx Consult',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #2e7d32; margin: 0;">🎉 Payment Successful!</h2>
        </div>
        
        <p>Dear ${patientName},</p>
        
        <p>Thank you! Your payment has been successfully processed. Your medical analysis report is now ready for download.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Payment Details</h3>
          <p style="margin: 5px 0;"><strong>Amount Paid:</strong> ₹29</p>
          <p style="margin: 5px 0;"><strong>Payment ID:</strong> ${paymentId}</p>
          <p style="margin: 5px 0;"><strong>Form ID:</strong> ${formId}</p>
          <p style="margin: 5px 0;"><strong>Analyzed by:</strong> ${professionalName} (${professionalType === 'nutritionist' ? 'Nutritionist' : professionalType === 'doctor' ? 'Doctor' : 'Pharmacist'})</p>
        </div>
        
        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
          <h3 style="color: #2e7d32; margin-top: 0;">📋 Your Report is Ready!</h3>
          <p style="margin: 5px 0;">Your comprehensive medical analysis report is now available for download in your dashboard.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/patient/dashboard" 
             style="background-color: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Download Report Now
          </a>
        </div>
        
        <p>Keep this report for your medical records and share it with your healthcare provider as needed.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This is a professional medical analysis. Please consult with your healthcare provider for any medical decisions.<br>
          Receipt and report will remain available in your dashboard for future reference.
        </p>
      </div>
    `
  }),

  professionalMedicalFormAssigned: (professionalName, professionalEmail, patientName, formId, professionalType) => ({
    subject: 'New Medical Form Assigned for Review - Drx Consult',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #1976d2; margin: 0;">📋 New Medical Form Assignment</h2>
        </div>
        
        <p>Dear Dr. ${professionalName},</p>
        
        <p>A new medical form has been assigned to you for professional review and analysis.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Assignment Details</h3>
          <p style="margin: 5px 0;"><strong>Patient:</strong> ${patientName}</p>
          <p style="margin: 5px 0;"><strong>Form ID:</strong> ${formId}</p>
          <p style="margin: 5px 0;"><strong>Your Role:</strong> ${professionalType === 'nutritionist' ? 'Nutritionist' : professionalType === 'doctor' ? 'Doctor' : 'Pharmacist'}</p>
        
        </div>
        
        <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
          <h3 style="color: #e65100; margin-top: 0;">📝 Action Required</h3>
          <p style="margin: 5px 0;">Please review the patient's prescription and medical details, then upload your analysis report.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/${professionalType}/dashboard" 
             style="background-color: #2196f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Review Form Now
          </a>
        </div>
        
        <p>Thank you for your professional service in helping our patients.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          Please ensure timely completion of the analysis to maintain our service quality standards.
        </p>
      </div>
    `
  }),

  paymentReceived: (professionalName, amount, bookingCount, professionalType = 'pharmacist') => ({
    subject: `Payment Received - ₹${amount} - Drx Consult`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #d4edda; padding: 30px; border-radius: 10px; margin-bottom: 20px; text-align: center; border-left: 4px solid #28a745;">
          <h1 style="color: #155724; margin: 0 0 10px 0;">💰 Payment Received!</h1>
          <p style="color: #155724; margin: 0; font-size: 18px;">₹${amount} has been credited</p>
        </div>
        
        <p style="font-size: 16px;">Hello ${professionalName},</p>
        
        <p>Great news! Your payment of <strong>₹${amount}</strong> has been processed and credited to your account.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">💳 Payment Details:</h3>
          <p><strong>Amount:</strong> ₹${amount}</p>
          <p><strong>Consultations:</strong> ${bookingCount} completed ${bookingCount === 1 ? 'session' : 'sessions'}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">Paid</span></p>
        </div>
        
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1565c0;">📊 Earnings Breakdown:</h3>
          <p>As a ${professionalType}, you receive 70% of each consultation fee:</p>
          <ul style="color: #1976d2; line-height: 1.6;">
            <li>Prescription Reviews: ₹${Math.round(149 * 0.7)} per session (from ₹149)</li>
            <li>Full Consultations: ₹${Math.round(449 * 0.7)} per session (from ₹449)</li>
          </ul>
        </div>
        
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="margin-top: 0; color: #155724;">🎯 Keep Up the Great Work!</h3>
          <p style="color: #155724; margin-bottom: 15px;">Continue providing excellent care to earn more!</p>
          <a href="${process.env.FRONTEND_URL}/${professionalType}/dashboard" 
             style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Dashboard
          </a>
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #856404;">📝 Payment Information:</h4>
          <p style="color: #856404; margin: 0;">Payments are processed by our admin team after consultation completion. You'll receive email notifications for all payment updates.</p>
        </div>
        
        <p>Thank you for being a valued member of the Drx Consult team. Your expertise makes a real difference in our patients' lives!</p>
        
        <p>Best regards,<br/>The Drx Consult Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          Questions about payments? Contact us at support@drxconsult.in<br/>
          View your earnings anytime from your <a href="${process.env.FRONTEND_URL}/${professionalType}/dashboard">dashboard</a>
        </p>
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
  try {
    const { generateInvoicePDF } = require('./invoiceGenerator');
    const transporter = createTransporter();
    const emailContent = emailTemplates.bookingConfirmation(booking, patientName, pharmacistName);

    let pdfBuffer = null;
    try {
      pdfBuffer = await generateInvoicePDF(booking, patientName, pharmacistName);
    } catch (pdfErr) {
      console.error('Invoice PDF generation failed, sending email without attachment:', pdfErr.message);
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: patientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      attachments: pdfBuffer ? [{
        filename: `Invoice-${booking._id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }] : []
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return { success: false, error: error.message };
  }
};

const sendPharmacistBookingNotification = async (pharmacistEmail, booking, patientName, patientEmail, patientPhone) => {
  return await sendEmail(pharmacistEmail, emailTemplates.professionalBookingNotification, booking, patientName, patientEmail, patientPhone);
};

const sendMeetingLinkEmail = async (patientEmail, booking, patientName, pharmacistName, professionalType = 'pharmacist') => {
  return await sendEmail(patientEmail, emailTemplates.meetingLinkAdded, booking, patientName, pharmacistName, professionalType);
};

const sendReportSubmittedEmail = async (patientEmail, booking, patientName, pharmacistName, professionalType = 'pharmacist') => {
  return await sendEmail(patientEmail, emailTemplates.reportSubmitted, booking, patientName, pharmacistName, professionalType);
};

const sendTestResultEmail = async (patientEmail, booking, patientName, pharmacistName, professionalType = 'pharmacist') => {
  return await sendEmail(patientEmail, emailTemplates.testResultUploaded, booking, patientName, pharmacistName, professionalType);
};

const sendUserSuspensionEmail = async (userEmail, userName, reason, adminName) => {
  return await sendEmail(userEmail, emailTemplates.userSuspended, userName, reason, adminName);
};

const sendUserUnsuspensionEmail = async (userEmail, userName, adminName) => {
  return await sendEmail(userEmail, emailTemplates.userUnsuspended, userName, adminName);
};

const sendWelcomeEmail = async (userEmail, userName) => {
  return await sendEmail(userEmail, emailTemplates.welcomeEmail, userName, userEmail);
};

const sendSubscriptionWelcomeEmail = async (userEmail, userName, subscription) => {
  return await sendEmail(userEmail, emailTemplates.subscriptionWelcome, userName, subscription);
};

const sendSubscriptionExpiringEmail = async (userEmail, userName, subscription, daysLeft) => {
  return await sendEmail(userEmail, emailTemplates.subscriptionExpiring, userName, subscription, daysLeft);
};

const sendSubscriptionExpiredEmail = async (userEmail, userName, subscription) => {
  return await sendEmail(userEmail, emailTemplates.subscriptionExpired, userName, subscription);
};

const sendSubscriptionCancelledEmail = async (userEmail, userName, subscription) => {
  return await sendEmail(userEmail, emailTemplates.subscriptionCancelled, userName, subscription);
};

const sendPaymentReceivedEmail = async (professionalEmail, professionalName, amount, bookingCount, professionalType = 'pharmacist') => {
  return await sendEmail(professionalEmail, emailTemplates.paymentReceived, professionalName, amount, bookingCount, professionalType);
};

/**
 * Send OTP verification email
 */
const sendOTPEmail = async (email, otp, userName = '', type = 'signup') => {
  try {

    let subject, htmlContent;
    
    switch (type) {
      case 'signup':
        subject = 'Verify Your Email - DrX Consult Digital Heathcare Platform';
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin: 0;">DrX Consult</h1>
                <p style="color: #666; margin: 5px 0;">Email Verification Required</p>
              </div>
              
              <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName || 'User'}!</h2>
              
              <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">
                Welcome to DrX Consult Digital Heathcare Platform! To complete your account registration, please verify your email address using the OTP below:
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
                  © ${new Date().getFullYear()} DrX Consult. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        `;
        break;
        
      default:
        subject = 'Verification Code - DrX Consult Digital Heathcare Platform';
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Verification Code</h2>
            <p>Your verification code is: <strong style="font-size: 24px; color: #2563eb;">${otp}</strong></p>
            <p>This code will expire in 10 minutes.</p>
          </div>
        `;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'DrX Consult <noreply@drxconsult.in>',
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
  sendPharmacistBookingNotification, // Keep old name for backward compatibility
  sendProfessionalBookingNotification: sendPharmacistBookingNotification, // New name
  sendMeetingLinkEmail,
  sendReportSubmittedEmail,
  sendTestResultEmail,
  sendUserSuspensionEmail,
  sendUserUnsuspensionEmail,
  sendWelcomeEmail,
  sendSubscriptionWelcomeEmail,
  sendSubscriptionExpiringEmail,
  sendSubscriptionExpiredEmail,
  sendSubscriptionCancelledEmail,
  sendPaymentReceivedEmail,
  sendOTPEmail,
  sendEmail,
  emailTemplates
};
