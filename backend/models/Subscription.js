const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planType: { 
    type: String, 
    enum: ['essential', 'family'], 
    required: true 
  },
  planName: { type: String, required: true },
  billingCycle: { 
    type: String, 
    enum: ['monthly', 'yearly'], 
    required: true 
  },
  price: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  
  // Plan limits and usage
  sessionsLimit: { type: Number, required: true }, // Monthly sessions allowed
  sessionsUsed: { type: Number, default: 0 }, // Sessions used this month
  doctorConsultationsLimit: { type: Number, default: 0 }, // For family plan
  doctorConsultationsUsed: { type: Number, default: 0 },
  familyMembersLimit: { type: Number, default: 1 }, // 1 for essential, 4 for family
  
  // Subscription status
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'cancelled', 'expired'], 
    default: 'active' 
  },
  
  // Dates
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  nextBillingDate: { type: Date, required: true },
  lastResetDate: { type: Date, default: Date.now }, // For monthly usage reset
  
  // Payment details
  razorpaySubscriptionId: String,
  razorpayCustomerId: String,
  lastPaymentId: String,
  lastPaymentDate: Date,
  paymentId: String, // Current payment ID
  orderId: String, // Current order ID
  
  // Features enabled
  features: {
    prescriptionExplanation: { type: Boolean, default: true },
    medicineGuidance: { type: Boolean, default: true },
    whatsappSupport: { type: Boolean, default: false },
    verifiedContent: { type: Boolean, default: true },
    chronicCareGuidance: { type: Boolean, default: false },
    labReportExplanation: { type: Boolean, default: false },
    medicationReminders: { type: Boolean, default: false },
    priorityBooking: { type: Boolean, default: false }
  },
  
  // Auto-renewal
  autoRenewal: { type: Boolean, default: true },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Reset monthly usage on the first of each month
subscriptionSchema.methods.resetMonthlyUsage = function() {
  const now = new Date();
  const lastReset = new Date(this.lastResetDate);
  
  // Check if it's a new month
  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    this.sessionsUsed = 0;
    this.doctorConsultationsUsed = 0;
    this.lastResetDate = now;
    return this.save();
  }
  return Promise.resolve(this);
};

// Check if user can book a session
subscriptionSchema.methods.canBookSession = function() {
  return this.status === 'active' && this.sessionsUsed < this.sessionsLimit;
};

// Check if user can book doctor consultation (family plan only)
subscriptionSchema.methods.canBookDoctorConsultation = function() {
  return this.status === 'active' && 
         this.planType === 'family' && 
         this.doctorConsultationsUsed < this.doctorConsultationsLimit;
};

// Use a session
subscriptionSchema.methods.useSession = function() {
  if (this.canBookSession()) {
    this.sessionsUsed += 1;
    this.updatedAt = new Date();
    return this.save();
  }
  throw new Error('Session limit exceeded or subscription inactive');
};

// Use a doctor consultation
subscriptionSchema.methods.useDoctorConsultation = function() {
  if (this.canBookDoctorConsultation()) {
    this.doctorConsultationsUsed += 1;
    this.updatedAt = new Date();
    return this.save();
  }
  throw new Error('Doctor consultation limit exceeded or not available in plan');
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
