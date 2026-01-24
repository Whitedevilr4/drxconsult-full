const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true,
    index: true
  },
  otp: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['signup', 'login', 'password_reset'], 
    required: true 
  },
  attempts: { 
    type: Number, 
    default: 0,
    max: 3
  },
  resendAttempts: { 
    type: Number, 
    default: 0,
    max: 3
  },
  lastResendAt: { 
    type: Date, 
    default: Date.now 
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    expires: 600 // 10 minutes TTL
  },
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
  },
  // Track rate limiting
  rateLimitResetAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 3 * 60 * 60 * 1000) // 3 hours from now
  }
});

// Index for automatic cleanup
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

// Method to check if rate limit is exceeded
otpSchema.methods.isRateLimited = function() {
  const now = new Date();
  
  // If rate limit period has passed, reset counters
  if (now > this.rateLimitResetAt) {
    this.attempts = 0;
    this.resendAttempts = 0;
    this.rateLimitResetAt = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    return false;
  }
  
  return this.attempts >= 3 || this.resendAttempts >= 3;
};

// Method to check if OTP is expired
otpSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Method to check if resend is allowed
otpSchema.methods.canResend = function() {
  const now = new Date();
  const timeSinceLastResend = now - this.lastResendAt;
  const oneMinute = 60 * 1000;
  
  // Must wait at least 1 minute between resends
  if (timeSinceLastResend < oneMinute) {
    return false;
  }
  
  // Check rate limit
  if (this.isRateLimited()) {
    return false;
  }
  
  return this.resendAttempts < 3;
};

module.exports = mongoose.model('OTP', otpSchema);