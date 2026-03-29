const express = require('express');
const { body, validationResult } = require('express-validator');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { auth, isAdmin } = require('../middleware/auth');
const { sendSubscriptionWelcomeEmail, sendSubscriptionCancelledEmail } = require('../utils/emailService');

const router = express.Router();

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  womensCare: {
    name: "Women's Care",
    description: "Comprehensive women's health plan with gynaecologist, dietitian, yoga, and more",
    threeMonths: {
      price: 13999,
      sessionsLimit: 0,
      doctorConsultationsLimit: 1, // 1-to-1 gynaecologist
      nutritionistConsultationsLimit: 1, // 1-to-1 dietitian
      familyMembersLimit: 1
    },
    sixMonths: {
      price: 27499,
      sessionsLimit: 0,
      doctorConsultationsLimit: 1,
      nutritionistConsultationsLimit: 1,
      familyMembersLimit: 1
    },
    twelveMonths: {
      price: 54999,
      sessionsLimit: 0,
      doctorConsultationsLimit: 1,
      nutritionistConsultationsLimit: 1,
      familyMembersLimit: 1
    },
    features: {
      prescriptionExplanation: false,
      medicineGuidance: false,
      whatsappSupport: true,
      verifiedContent: true,
      chronicCareGuidance: false,
      labReportExplanation: false,
      medicationReminders: false,
      priorityBooking: true,
      dietChart: true,
      gynaecologistConsultation: true,
      personalizedDietChart: true,
      dieticianConsultation: true,
      comprehensiveMedicalHistory: true,
      hairAndSkinCare: true,
      liveYogaSession: true,
      periodAndPcosCare: true,
      weightManagement: true,
      whatsappSupportOneToOne: true,
      priorityCare: true
    }
  },
  chronic: {
    name: 'Chronic Care',
    description: 'Complete chronic disease management with dedicated doctor and diet coach',
    threeMonths: {
      price: 18999,
      sessionsLimit: 0,
      doctorConsultationsLimit: 1,
      nutritionistConsultationsLimit: 1,
      familyMembersLimit: 1
    },
    sixMonths: {
      price: 37499,
      sessionsLimit: 0,
      doctorConsultationsLimit: 1,
      nutritionistConsultationsLimit: 1,
      familyMembersLimit: 1
    },
    twelveMonths: {
      price: 73999,
      sessionsLimit: 0,
      doctorConsultationsLimit: 1,
      nutritionistConsultationsLimit: 1,
      familyMembersLimit: 1
    },
    features: {
      prescriptionExplanation: false,
      medicineGuidance: false,
      whatsappSupport: true,
      verifiedContent: true,
      chronicCareGuidance: true,
      labReportExplanation: false,
      medicationReminders: false,
      priorityBooking: true,
      dietChart: true,
      doctorConsultationMonthly: true,
      dedicatedDietCoach: true,
      personalizedDietChart: true,
      comprehensiveMedicalHistory: true,
      bpManagement: true,
      diabetesManagement: true,
      thyroidCare: true,
      liveYogaSession: true,
      weightSession: true,
      whatsappSupportOneToOne: true,
      priorityCare: true
    }
  },
  fatToFit: {
    name: 'Fat to Fit',
    description: 'Dedicated weight management with personal diet coach and weekly follow-ups',
    threeMonths: {
      price: 12999,
      sessionsLimit: 0,
      doctorConsultationsLimit: 0,
      nutritionistConsultationsLimit: 0,
      familyMembersLimit: 1
    },
    sixMonths: {
      price: 23999,
      sessionsLimit: 0,
      doctorConsultationsLimit: 0,
      nutritionistConsultationsLimit: 0,
      familyMembersLimit: 1
    },
    twelveMonths: {
      price: 35999,
      sessionsLimit: 0,
      doctorConsultationsLimit: 0,
      nutritionistConsultationsLimit: 0,
      familyMembersLimit: 1
    },
    features: {
      prescriptionExplanation: false,
      medicineGuidance: false,
      whatsappSupport: true,
      verifiedContent: true,
      chronicCareGuidance: false,
      labReportExplanation: false,
      medicationReminders: false,
      priorityBooking: true,
      dietChart: true,
      dietCoachOneToOne: true,
      coachFollowUpWeekly: true,
      liveYogaSession: true,
      comprehensiveMedicalHistory: true,
      personalizedDietChart: true,
      weightManagement: true,
      whatsappSupportOneToOne: true,
      cravingCare: true,
      motivatedWeekPlanning: true,
      cheatMeal: true
    }
  }
};

// Get available subscription plans
router.get('/plans', (req, res) => {
  res.json({
    plans: SUBSCRIPTION_PLANS,
    message: 'Available subscription plans'
  });
});

// Get user's current subscription
router.get('/current', auth, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ 
      userId: req.user.userId, 
      status: 'active' 
    });
    
    if (!subscription) {
      return res.json({ 
        subscription: null, 
        message: 'No active subscription found' 
      });
    }

    // Reset monthly usage if needed
    await subscription.resetMonthlyUsage();
    
    res.json({ subscription });
  } catch (err) {
    console.error('Error fetching subscription:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create new subscription
router.post('/create', [
  auth,
  body('planType').isIn(['womensCare', 'chronic', 'fatToFit']).withMessage('Invalid plan type'),
  body('billingCycle').isIn(['monthly', 'yearly', 'threeMonths', 'sixMonths', 'twelveMonths']).withMessage('Invalid billing cycle'),
  body('paymentId').optional().isString().withMessage('Payment ID must be a string'),
  body('orderId').optional().isString().withMessage('Order ID must be a string')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { planType, billingCycle, paymentId, orderId } = req.body;
    
    // Check if user already has an active subscription
    const existingSubscription = await Subscription.findOne({
      userId: req.user.userId,
      status: 'active'
    });

    if (existingSubscription) {
      return res.status(400).json({ 
        message: 'User already has an active subscription' 
      });
    }

    const planConfig = SUBSCRIPTION_PLANS[planType][billingCycle];
    const planInfo = SUBSCRIPTION_PLANS[planType];
    
    const startDate = new Date();
    const endDate = new Date();
    const nextBillingDate = new Date();
    
    if (billingCycle === 'threeMonths') {
      endDate.setMonth(endDate.getMonth() + 3);
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
    } else if (billingCycle === 'sixMonths') {
      endDate.setMonth(endDate.getMonth() + 6);
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 6);
    } else if (billingCycle === 'twelveMonths') {
      endDate.setFullYear(endDate.getFullYear() + 1);
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    } else if (billingCycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    const subscription = new Subscription({
      userId: req.user.userId,
      planType,
      planName: planInfo.name,
      billingCycle,
      price: planConfig.price,
      sessionsLimit: planConfig.sessionsLimit,
      doctorConsultationsLimit: planConfig.doctorConsultationsLimit,
      nutritionistConsultationsLimit: planConfig.nutritionistConsultationsLimit || 0,
      familyMembersLimit: planConfig.familyMembersLimit,
      startDate,
      endDate,
      nextBillingDate,
      features: planInfo.features,
      paymentId: paymentId || null,
      orderId: orderId || null
    });

    await subscription.save();

    // Send subscription welcome email
    try {
      const user = await User.findById(req.user.userId);
      if (user) {
        await sendSubscriptionWelcomeEmail(user.email, user.name, subscription);
        console.log(`✅ Subscription welcome email sent to ${user.email}`);
      }
    } catch (emailError) {
      console.error(`❌ Failed to send subscription welcome email:`, emailError);
      // Don't fail the subscription creation if email fails
    }

    res.status(201).json({
      message: 'Subscription created successfully',
      subscription
    });
  } catch (err) {
    console.error('Error creating subscription:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update subscription (upgrade/downgrade)
router.put('/update', [
  auth,
  body('planType').isIn(['womensCare', 'chronic', 'fatToFit']).withMessage('Invalid plan type'),
  body('billingCycle').isIn(['monthly', 'yearly', 'threeMonths', 'sixMonths', 'twelveMonths']).withMessage('Invalid billing cycle'),
  body('paymentId').optional().isString().withMessage('Payment ID must be a string'),
  body('orderId').optional().isString().withMessage('Order ID must be a string')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { planType, billingCycle, paymentId, orderId } = req.body;
    
    const subscription = await Subscription.findOne({
      userId: req.user.userId,
      status: 'active'
    });

    if (!subscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    const planConfig = SUBSCRIPTION_PLANS[planType][billingCycle];
    const planInfo = SUBSCRIPTION_PLANS[planType];

    // Update subscription details
    subscription.planType = planType;
    subscription.planName = planInfo.name;
    subscription.billingCycle = billingCycle;
    subscription.price = planConfig.price;
    subscription.sessionsLimit = planConfig.sessionsLimit;
    subscription.doctorConsultationsLimit = planConfig.doctorConsultationsLimit;
    subscription.nutritionistConsultationsLimit = planConfig.nutritionistConsultationsLimit || 0;
    subscription.familyMembersLimit = planConfig.familyMembersLimit;
    subscription.features = planInfo.features;
    subscription.updatedAt = new Date();
    
    // Update payment information if provided
    if (paymentId) {
      subscription.paymentId = paymentId;
      subscription.lastPaymentId = paymentId;
      subscription.lastPaymentDate = new Date();
    }
    if (orderId) {
      subscription.orderId = orderId;
    }

    await subscription.save();

    res.json({
      message: 'Subscription updated successfully',
      subscription
    });
  } catch (err) {
    console.error('Error updating subscription:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Cancel subscription
router.post('/cancel', auth, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user.userId,
      status: 'active'
    });

    if (!subscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    subscription.status = 'cancelled';
    subscription.autoRenewal = false;
    subscription.updatedAt = new Date();
    
    await subscription.save();

    // Send cancellation email
    try {
      const user = await User.findById(req.user.userId);
      if (user?.email) {
        await sendSubscriptionCancelledEmail(user.email, user.name, subscription);
      }
    } catch (emailErr) {
      console.error('Error sending cancellation email:', emailErr.message);
    }

    res.json({
      message: 'Subscription cancelled successfully',
      subscription
    });
  } catch (err) {
    console.error('Error cancelling subscription:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Check if user can book a session
router.get('/can-book-session', auth, async (req, res) => {
  try {
    const { professionalType } = req.query; // 'pharmacist', 'doctor', or 'nutritionist'
    
    const subscription = await Subscription.findOne({
      userId: req.user.userId,
      status: 'active'
    });

    if (!subscription) {
      return res.json({ 
        canBook: true, // Allow booking at normal price
        canBookWithSubscription: false,
        reason: 'No active subscription - will be charged normal price',
        requiresSubscription: false,
        bookingType: 'normal_price'
      });
    }

    await subscription.resetMonthlyUsage();
    
    let canBookWithSubscription = false;
    let reason = null;
    let sessionsUsed = 0;
    let sessionsLimit = 0;
    
    if (professionalType === 'nutritionist') {
      // Nutritionist consultations
      canBookWithSubscription = subscription.canBookNutritionistConsultation();
      reason = canBookWithSubscription ? null : 
        subscription.nutritionistConsultationsLimit === 0 ? 'Nutritionist consultations not included in plan - will be charged normal price' :
        'Nutritionist consultation limit exceeded - will be charged normal price';
      sessionsUsed = subscription.nutritionistConsultationsUsed;
      sessionsLimit = subscription.nutritionistConsultationsLimit;
    } else if (professionalType === 'doctor') {
      // Doctor consultations
      canBookWithSubscription = subscription.canBookDoctorConsultation();
      reason = canBookWithSubscription ? null : 
        subscription.doctorConsultationsLimit === 0 ? 'Doctor consultations not included in plan - will be charged normal price' :
        'Doctor consultation limit exceeded - will be charged normal price';
      sessionsUsed = subscription.doctorConsultationsUsed;
      sessionsLimit = subscription.doctorConsultationsLimit;
    } else {
      // Regular pharmacist sessions
      canBookWithSubscription = subscription.canBookSession();
      reason = canBookWithSubscription ? null : 
        subscription.sessionsLimit === 0 ? 'Pharmacist consultations not included in plan - will be charged normal price' :
        'Session limit exceeded - will be charged normal price';
      sessionsUsed = subscription.sessionsUsed;
      sessionsLimit = subscription.sessionsLimit;
    }
    
    res.json({
      canBook: true, // Always allow booking
      canBookWithSubscription,
      reason,
      sessionsUsed,
      sessionsLimit,
      bookingType: canBookWithSubscription ? 'subscription' : 'normal_price',
      professionalType: professionalType || 'pharmacist',
      subscription: {
        planName: subscription.planName,
        planType: subscription.planType
      }
    });
  } catch (err) {
    console.error('Error checking session availability:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Use a session (called when booking is confirmed)
router.post('/use-session', auth, async (req, res) => {
  try {
    const { bookingType, professionalType } = req.body; // 'subscription' or 'normal_price', 'pharmacist', 'doctor', or 'nutritionist'
    
    const subscription = await Subscription.findOne({
      userId: req.user.userId,
      status: 'active'
    });

    // If no subscription or booking at normal price, just return success
    if (!subscription || bookingType === 'normal_price') {
      return res.json({
        message: 'Booking confirmed at normal price',
        bookingType: 'normal_price',
        professionalType: professionalType || 'pharmacist',
        sessionsUsed: subscription ? 
          (professionalType === 'nutritionist' ? subscription.nutritionistConsultationsUsed :
           professionalType === 'doctor' ? subscription.doctorConsultationsUsed : 
           subscription.sessionsUsed) : 0,
        sessionsLimit: subscription ? 
          (professionalType === 'nutritionist' ? subscription.nutritionistConsultationsLimit :
           professionalType === 'doctor' ? subscription.doctorConsultationsLimit : 
           subscription.sessionsLimit) : 0
      });
    }

    // If booking with subscription, try to use subscription session
    await subscription.resetMonthlyUsage();
    
    if (professionalType === 'nutritionist') {
      // Use nutritionist consultation
      if (subscription.canBookNutritionistConsultation()) {
        await subscription.useNutritionistConsultation();
        res.json({
          message: 'Nutritionist consultation used from subscription',
          bookingType: 'subscription',
          professionalType: 'nutritionist',
          sessionsUsed: subscription.nutritionistConsultationsUsed,
          sessionsLimit: subscription.nutritionistConsultationsLimit
        });
      } else {
        // Nutritionist consultation limit exceeded, book at normal price
        res.json({
          message: subscription.nutritionistConsultationsLimit === 0 ? 
            'Nutritionist consultations not included in plan - booked at normal price' :
            'Nutritionist consultation limit exceeded - booked at normal price',
          bookingType: 'normal_price',
          professionalType: 'nutritionist',
          sessionsUsed: subscription.nutritionistConsultationsUsed,
          sessionsLimit: subscription.nutritionistConsultationsLimit
        });
      }
    } else if (professionalType === 'doctor') {
      // Use doctor consultation
      if (subscription.canBookDoctorConsultation()) {
        await subscription.useDoctorConsultation();
        res.json({
          message: 'Doctor consultation used from subscription',
          bookingType: 'subscription',
          professionalType: 'doctor',
          sessionsUsed: subscription.doctorConsultationsUsed,
          sessionsLimit: subscription.doctorConsultationsLimit
        });
      } else {
        // Doctor consultation limit exceeded, book at normal price
        res.json({
          message: subscription.doctorConsultationsLimit === 0 ? 
            'Doctor consultations not included in plan - booked at normal price' :
            'Doctor consultation limit exceeded - booked at normal price',
          bookingType: 'normal_price',
          professionalType: 'doctor',
          sessionsUsed: subscription.doctorConsultationsUsed,
          sessionsLimit: subscription.doctorConsultationsLimit
        });
      }
    } else {
      // Use regular pharmacist session
      if (subscription.canBookSession()) {
        await subscription.useSession();
        res.json({
          message: 'Session used from subscription',
          bookingType: 'subscription',
          professionalType: 'pharmacist',
          sessionsUsed: subscription.sessionsUsed,
          sessionsLimit: subscription.sessionsLimit
        });
      } else {
        // Subscription limit exceeded, book at normal price
        res.json({
          message: subscription.sessionsLimit === 0 ?
            'Pharmacist consultations not included in plan - booked at normal price' :
            'Subscription limit exceeded - booked at normal price',
          bookingType: 'normal_price',
          professionalType: 'pharmacist',
          sessionsUsed: subscription.sessionsUsed,
          sessionsLimit: subscription.sessionsLimit
        });
      }
    }
  } catch (err) {
    console.error('Error using session:', err);
    res.status(400).json({ message: err.message });
  }
});

// Admin: Get all subscriptions
router.get('/admin/all', auth, isAdmin, async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ subscriptions });
  } catch (err) {
    console.error('Error fetching all subscriptions:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: Get subscription analytics
router.get('/admin/analytics', auth, isAdmin, async (req, res) => {
  try {
    const totalSubscriptions = await Subscription.countDocuments();
    const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });

    const womensCareSubscriptions = await Subscription.countDocuments({ planType: 'womensCare', status: 'active' });
    const chronicSubscriptions = await Subscription.countDocuments({ planType: 'chronic', status: 'active' });
    const fatToFitSubscriptions = await Subscription.countDocuments({ planType: 'fatToFit', status: 'active' });
    const essentialSubscriptions = await Subscription.countDocuments({ planType: 'essential', status: 'active' });
    const familySubscriptions = await Subscription.countDocuments({ planType: 'family', status: 'active' });

    const threeMonthsSubscriptions = await Subscription.countDocuments({ billingCycle: 'threeMonths', status: 'active' });
    const sixMonthsSubscriptions = await Subscription.countDocuments({ billingCycle: 'sixMonths', status: 'active' });
    const twelveMonthsSubscriptions = await Subscription.countDocuments({ billingCycle: 'twelveMonths', status: 'active' });

    // Calculate total revenue from all active subscriptions
    const subscriptions = await Subscription.find({ status: 'active' });
    const totalRevenue = subscriptions.reduce((sum, s) => sum + s.price, 0);

    res.json({
      analytics: {
        totalSubscriptions,
        activeSubscriptions,
        planBreakdown: {
          womensCare: womensCareSubscriptions,
          chronic: chronicSubscriptions,
          fatToFit: fatToFitSubscriptions,
          essential: essentialSubscriptions,
          family: familySubscriptions
        },
        billingBreakdown: {
          threeMonths: threeMonthsSubscriptions,
          sixMonths: sixMonthsSubscriptions,
          twelveMonths: twelveMonthsSubscriptions
        },
        revenue: {
          total: totalRevenue,
          monthlyRecurring: 0,
          yearlyRecurring: 0,
          totalRecurring: totalRevenue
        }
      }
    });
  } catch (err) {
    console.error('Error fetching subscription analytics:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
