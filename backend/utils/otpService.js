const crypto = require('crypto');
const OTP = require('../models/OTP');
const { sendOTPEmail } = require('./emailService');

/**
 * Generate a 6-digit OTP
 */
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Create and send OTP for email verification
 */
async function createAndSendOTP(email, type = 'signup', userName = '') {
  try {
    // Check for existing OTP
    let existingOTP = await OTP.findOne({ email, type });
    
    if (existingOTP) {
      // Check rate limiting
      if (existingOTP.isRateLimited()) {
        const resetTime = new Date(existingOTP.rateLimitResetAt);
        const hoursLeft = Math.ceil((resetTime - new Date()) / (1000 * 60 * 60));
        return {
          success: false,
          error: `Too many attempts. Please try again in ${hoursLeft} hour(s).`,
          rateLimited: true
        };
      }
      
      // Check if can resend
      if (!existingOTP.canResend()) {
        const timeSinceLastResend = new Date() - existingOTP.lastResendAt;
        const secondsLeft = Math.ceil((60000 - timeSinceLastResend) / 1000);
        return {
          success: false,
          error: `Please wait ${secondsLeft} seconds before requesting another OTP.`,
          waitTime: secondsLeft
        };
      }
      
      // Update existing OTP
      existingOTP.otp = generateOTP();
      existingOTP.resendAttempts += 1;
      existingOTP.lastResendAt = new Date();
      existingOTP.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await existingOTP.save();

    } else {
      // Create new OTP
      const otp = generateOTP();
      existingOTP = new OTP({
        email,
        otp,
        type,
        attempts: 0,
        resendAttempts: 1,
        lastResendAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      });
      await existingOTP.save();
    }
    
    // Send OTP email
    const emailResult = await sendOTPEmail(email, existingOTP.otp, userName, type);
    
    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);
      return {
        success: false,
        error: 'Failed to send OTP email. Please try again.',
        emailError: true
      };
    }
    
    return {
      success: true,
      message: 'OTP sent successfully',
      expiresAt: existingOTP.expiresAt,
      attemptsLeft: 3 - existingOTP.attempts,
      resendsLeft: 3 - existingOTP.resendAttempts
    };
    
  } catch (error) {
    console.error('Error creating/sending OTP:', error);
    return {
      success: false,
      error: 'Failed to create OTP. Please try again.',
      serverError: true
    };
  }
}

/**
 * Verify OTP
 */
async function verifyOTP(email, otpCode, type = 'signup') {
  try {
    const otpRecord = await OTP.findOne({ email, type });
    
    if (!otpRecord) {
      return {
        success: false,
        error: 'No OTP found. Please request a new one.',
        notFound: true
      };
    }
    
    // Check if rate limited
    if (otpRecord.isRateLimited()) {
      const resetTime = new Date(otpRecord.rateLimitResetAt);
      const hoursLeft = Math.ceil((resetTime - new Date()) / (1000 * 60 * 60));
      return {
        success: false,
        error: `Too many failed attempts. Please try again in ${hoursLeft} hour(s).`,
        rateLimited: true
      };
    }
    
    // Check if expired
    if (otpRecord.isExpired()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return {
        success: false,
        error: 'OTP has expired. Please request a new one.',
        expired: true
      };
    }
    
    // Check OTP
    if (otpRecord.otp !== otpCode) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      
      const attemptsLeft = 3 - otpRecord.attempts;
      
      if (attemptsLeft <= 0) {
        const resetTime = new Date(otpRecord.rateLimitResetAt);
        const hoursLeft = Math.ceil((resetTime - new Date()) / (1000 * 60 * 60));
        return {
          success: false,
          error: `Too many failed attempts. Please try again in ${hoursLeft} hour(s).`,
          rateLimited: true
        };
      }
      
      return {
        success: false,
        error: `Invalid OTP. ${attemptsLeft} attempt(s) remaining.`,
        attemptsLeft,
        invalidOTP: true
      };
    }
    
    // OTP is valid - delete it
    await OTP.deleteOne({ _id: otpRecord._id });

    return {
      success: true,
      message: 'OTP verified successfully'
    };
    
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      success: false,
      error: 'Failed to verify OTP. Please try again.',
      serverError: true
    };
  }
}

/**
 * Clean up expired OTPs (called periodically)
 */
async function cleanupExpiredOTPs() {
  try {
    const result = await OTP.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up expired OTPs:', error);
    return 0;
  }
}

/**
 * Get OTP status for an email
 */
async function getOTPStatus(email, type = 'signup') {
  try {
    const otpRecord = await OTP.findOne({ email, type });
    
    if (!otpRecord) {
      return {
        exists: false,
        canRequest: true
      };
    }
    
    return {
      exists: true,
      canRequest: otpRecord.canResend(),
      isExpired: otpRecord.isExpired(),
      isRateLimited: otpRecord.isRateLimited(),
      attemptsLeft: Math.max(0, 3 - otpRecord.attempts),
      resendsLeft: Math.max(0, 3 - otpRecord.resendAttempts),
      expiresAt: otpRecord.expiresAt,
      rateLimitResetAt: otpRecord.rateLimitResetAt
    };
  } catch (error) {
    console.error('Error getting OTP status:', error);
    return {
      exists: false,
      canRequest: true,
      error: error.message
    };
  }
}

module.exports = {
  generateOTP,
  createAndSendOTP,
  verifyOTP,
  cleanupExpiredOTPs,
  getOTPStatus
};