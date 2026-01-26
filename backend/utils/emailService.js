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

  bookingConfirmation: (booking, patientName, professionalName, professionalEmail) => ({
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
          <p><strong>Professional:</strong> ${professionalName}</p>
          <p><strong>Date:</strong> ${new Date(booking.slotDate).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${booking.slotTime}</p>
          <p><strong>Status:</strong> ${booking.status}</p>
          <p><strong>Patient Age:</strong> ${booking.patientDetails?.age || 'N/A'}</p>
          <p><strong>Patient Sex:</strong> ${booking.patientDetails?.sex || 'N/A'}</p>
          ${booking.meetLink ? `<p><strong>Meeting Link:</strong> <a href="${booking.meetLink}">Join Meeting</a></p>` : '<p><em>Meeting link will be provided by the professional before the session.</em></p>'}
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #856404;">Service Details:</h4>
          ${booking.serviceType === 'prescription_review' 
            ? '<p>📋 <strong>Prescription Review:</strong> Our professional will review your uploaded prescription and provide guidance on medication usage, side effects, and interactions.</p>'
            : '<p>👨‍⚕️ <strong>Full Consultation:</strong> Comprehensive consultation including prescription review, health assessment, and personalized medication counseling.</p>'
          }
        </div>
        
        <p>Please be available at the scheduled time. You will receive the meeting link from your professional before the session begins.</p>
        
        <p>If you need to cancel or reschedule, please contact us as soon as possible.</p>
        
        <p>Thank you for choosing our Patient Counselling service!</p>
      </div>
    `
  }),

  professionalBookingNotification: (booking, patientName, patientEmail, patientPhone) => ({
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
            <li><strong>📋 Prescription Reviews:</strong> Get expert guidance on your medications (₹200)</li>
            <li><strong>👨‍⚕️ Full Consultations:</strong> Comprehensive health consultations with doctors (₹500)</li>
            <li><strong>💊 Pharmacist Sessions:</strong> Medication counseling with certified pharmacists</li>
            <li><strong>📱 Easy Booking:</strong> Schedule sessions at your convenience</li>
            <li><strong>📄 Digital Reports:</strong> Access your consultation reports anytime</li>
          </ul>
        </div>
        
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #856404;">💡 Pro Tip: Consider Our Subscription Plans</h3>
          <p style="margin-bottom: 15px;">Save money with our subscription plans:</p>
          <ul style="color: #856404; line-height: 1.6;">
            <li><strong>Essential Plan:</strong> ₹299/month - 2 pharmacist sessions</li>
            <li><strong>Family Plan:</strong> ₹799/month - 5 pharmacist sessions + 1 doctor consultation</li>
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
          <p style="margin: 5px 0;"><strong>Email:</strong> support@drxconsult.com</p>
          <p style="margin: 5px 0;"><strong>Dashboard:</strong> <a href="${process.env.FRONTEND_URL}/patient/dashboard">Patient Dashboard</a></p>
        </div>
        
        <p>Thank you for choosing Drx Consult. We look forward to being part of your healthcare journey!</p>
        
        <p>Best regards,<br/>The Drx Consult Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          You received this email because you created an account at Drx Consult.<br/>
          If you have any questions, please contact us at support@drxconsult.com
        </p>
      </div>
    `
  }),

  subscriptionWelcome: (userName, subscription) => ({
    subject: `Welcome to ${subscription.planName} - Drx Consult`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #e8f5e8; padding: 30px; border-radius: 10px; margin-bottom: 20px; text-align: center;">
          <h1 style="color: #27ae60; margin: 0 0 10px 0;">🎉 Subscription Activated!</h1>
          <p style="color: #2d5a2d; margin: 0; font-size: 18px;">Welcome to ${subscription.planName}</p>
        </div>
        
        <p style="font-size: 16px;">Hello ${userName},</p>
        
        <p>Congratulations! Your <strong>${subscription.planName}</strong> subscription has been successfully activated. You now have access to discounted healthcare consultations!</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">📋 Your Subscription Details:</h3>
          <p><strong>Plan:</strong> ${subscription.planName}</p>
          <p><strong>Billing:</strong> ${subscription.billingCycle === 'monthly' ? 'Monthly' : 'Yearly'} (₹${subscription.price})</p>
          <p><strong>Start Date:</strong> ${new Date(subscription.startDate).toLocaleDateString()}</p>
          <p><strong>Next Billing:</strong> ${new Date(subscription.nextBillingDate).toLocaleDateString()}</p>
          <p><strong>Status:</strong> <span style="color: #27ae60; font-weight: bold;">Active</span></p>
        </div>
        
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1565c0;">🎯 Your Monthly Allowance:</h3>
          <ul style="color: #1976d2; line-height: 1.8;">
            <li><strong>Pharmacist Sessions:</strong> ${subscription.sessionsLimit} sessions per month</li>
            ${subscription.doctorConsultationsLimit > 0 ? `<li><strong>Doctor Consultations:</strong> ${subscription.doctorConsultationsLimit} consultation per month</li>` : ''}
            <li><strong>Family Members:</strong> Up to ${subscription.familyMembersLimit} ${subscription.familyMembersLimit === 1 ? 'member' : 'members'}</li>
          </ul>
        </div>
        
        ${subscription.planType === 'family' ? `
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #856404;">👨‍👩‍👧‍👦 Family Plan Benefits:</h3>
          <ul style="color: #856404; line-height: 1.8;">
            <li>✅ Chronic care guidance</li>
            <li>✅ Lab report explanations</li>
            <li>✅ Medication reminders</li>
            <li>✅ Priority booking</li>
            <li>✅ Doctor consultations included</li>
          </ul>
        </div>
        ` : `
        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #27ae60;">💊 Essential Plan Benefits:</h3>
          <ul style="color: #2d5a2d; line-height: 1.8;">
            <li>✅ Prescription explanations</li>
            <li>✅ Medicine guidance</li>
            <li>✅ WhatsApp support</li>
            <li>✅ Verified content</li>
          </ul>
        </div>
        `}
        
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="margin-top: 0; color: #155724;">🚀 Ready to Use Your Subscription?</h3>
          <p style="color: #155724; margin-bottom: 15px;">Start booking your discounted sessions now!</p>
          <a href="${process.env.FRONTEND_URL}/" 
             style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">
            Book Session
          </a>
          <a href="${process.env.FRONTEND_URL}/patient/dashboard" 
             style="background-color: #17a2b8; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Dashboard
          </a>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #495057;">💡 How It Works:</h4>
          <ol style="color: #555; line-height: 1.6;">
            <li>Book sessions as usual through our platform</li>
            <li>Your subscription sessions will be used automatically</li>
            <li>Once your monthly limit is reached, you'll pay normal prices</li>
            <li>Your allowance resets every month on your billing date</li>
          </ol>
        </div>
        
        <p>Thank you for subscribing to Drx Consult. We're committed to providing you with the best healthcare guidance!</p>
        
        <p>Best regards,<br/>The Drx Consult Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          Manage your subscription anytime from your <a href="${process.env.FRONTEND_URL}/patient/dashboard">dashboard</a><br/>
          Questions? Contact us at support@drxconsult.com
        </p>
      </div>
    `
  }),

  subscriptionExpiring: (userName, subscription, daysLeft) => ({
    subject: `Your ${subscription.planName} expires in ${daysLeft} days - Drx Consult`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fff3cd; padding: 30px; border-radius: 10px; margin-bottom: 20px; text-align: center; border-left: 4px solid #f39c12;">
          <h1 style="color: #856404; margin: 0 0 10px 0;">⏰ Subscription Expiring Soon</h1>
          <p style="color: #856404; margin: 0; font-size: 18px;">${daysLeft} days remaining</p>
        </div>
        
        <p style="font-size: 16px;">Hello ${userName},</p>
        
        <p>Your <strong>${subscription.planName}</strong> subscription will expire in <strong>${daysLeft} days</strong> on ${new Date(subscription.endDate).toLocaleDateString()}.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">📊 Your Current Usage:</h3>
          <p><strong>Pharmacist Sessions:</strong> ${subscription.sessionsUsed}/${subscription.sessionsLimit} used this month</p>
          ${subscription.doctorConsultationsLimit > 0 ? `<p><strong>Doctor Consultations:</strong> ${subscription.doctorConsultationsUsed}/${subscription.doctorConsultationsLimit} used this month</p>` : ''}
          <p><strong>Next Billing Date:</strong> ${new Date(subscription.nextBillingDate).toLocaleDateString()}</p>
        </div>
        
        <div style="background-color: #fee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e74c3c;">
          <h3 style="margin-top: 0; color: #c0392b;">⚠️ What Happens After Expiry:</h3>
          <ul style="color: #721c24; line-height: 1.6;">
            <li>You'll lose access to discounted sessions</li>
            <li>All future bookings will be at regular prices</li>
            <li>Premium features will be disabled</li>
            <li>Your consultation history will remain accessible</li>
          </ul>
        </div>
        
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="margin-top: 0; color: #155724;">🔄 Renew Your Subscription</h3>
          <p style="color: #155724; margin-bottom: 15px;">Continue enjoying discounted healthcare consultations!</p>
          <a href="${process.env.FRONTEND_URL}/subscription-plans" 
             style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">
            Renew Subscription
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
          Questions about renewal? Contact us at support@drxconsult.com<br/>
          Manage your subscription from your <a href="${process.env.FRONTEND_URL}/patient/dashboard">dashboard</a>
        </p>
      </div>
    `
  }),

  subscriptionExpired: (userName, subscription) => ({
    subject: `Your ${subscription.planName} has expired - Drx Consult`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fee; padding: 30px; border-radius: 10px; margin-bottom: 20px; text-align: center; border-left: 4px solid #e74c3c;">
          <h1 style="color: #c0392b; margin: 0 0 10px 0;">⏰ Subscription Expired</h1>
          <p style="color: #721c24; margin: 0; font-size: 18px;">Your ${subscription.planName} has ended</p>
        </div>
        
        <p style="font-size: 16px;">Hello ${userName},</p>
        
        <p>Your <strong>${subscription.planName}</strong> subscription expired on ${new Date(subscription.endDate).toLocaleDateString()}. We hope you enjoyed the benefits of discounted healthcare consultations!</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">📊 Your Final Usage Summary:</h3>
          <p><strong>Total Sessions Used:</strong> ${subscription.sessionsUsed}/${subscription.sessionsLimit}</p>
          ${subscription.doctorConsultationsLimit > 0 ? `<p><strong>Doctor Consultations Used:</strong> ${subscription.doctorConsultationsUsed}/${subscription.doctorConsultationsLimit}</p>` : ''}
          <p><strong>Subscription Period:</strong> ${new Date(subscription.startDate).toLocaleDateString()} - ${new Date(subscription.endDate).toLocaleDateString()}</p>
          <p><strong>Total Savings:</strong> Approximately ₹${Math.round((subscription.sessionsUsed * 100) + (subscription.doctorConsultationsUsed * 250))}</p>
        </div>
        
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #856404;">📋 What's Changed:</h3>
          <ul style="color: #856404; line-height: 1.6;">
            <li>Future bookings will be at regular prices</li>
            <li>Premium features are no longer available</li>
            <li>You can still access your consultation history</li>
            <li>All previous reports and documents remain available</li>
          </ul>
        </div>
        
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="margin-top: 0; color: #155724;">🔄 Reactivate Your Subscription</h3>
          <p style="color: #155724; margin-bottom: 15px;">Miss the savings? Reactivate your subscription anytime!</p>
          <a href="${process.env.FRONTEND_URL}/subscription-plans" 
             style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">
            View Plans
          </a>
          <a href="${process.env.FRONTEND_URL}/" 
             style="background-color: #17a2b8; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Book Session
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
          Questions? Contact us at support@drxconsult.com<br/>
          Visit your <a href="${process.env.FRONTEND_URL}/patient/dashboard">dashboard</a> anytime
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
          <p>As a ${professionalType}, you receive 50% of each consultation fee:</p>
          <ul style="color: #1976d2; line-height: 1.6;">
            <li>Prescription Reviews: ₹100 per session (from ₹200)</li>
            <li>Full Consultations: ₹250 per session (from ₹500)</li>
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
          Questions about payments? Contact us at support@drxconsult.com<br/>
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
  sendPaymentReceivedEmail,
  sendOTPEmail,
  sendEmail,
  emailTemplates
};
