const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { auth } = require('../middleware/auth');
const MedicalForm = require('../models/MedicalForm');
const User = require('../models/User');

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create order
router.post('/create-order', auth, async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;

    const options = {
      amount: amount * 100, // amount in paise
      currency,
      receipt: `rcpt_${Date.now().toString().slice(-10)}` // Keep under 40 chars
    };
    
    const order = await razorpay.orders.create(options);
    
    res.json(order);
  } catch (err) {
    console.error('Razorpay order creation error:', err);
    res.status(500).json({ 
      message: 'Payment error', 
      error: err.message,
      details: err.error?.description || 'Unknown error'
    });
  }
});

// Verify payment
router.post('/verify', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    // Create signature for verification
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');
    
    const isAuthentic = expectedSignature === razorpay_signature;
    
    if (isAuthentic) {
      res.json({ success: true, paymentId: razorpay_payment_id });
    } else {
      res.status(400).json({ success: false, message: 'Invalid signature' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Verification error', error: err.message });
  }
});

// Create order for medical form payment
router.post('/medical-form/create-order', auth, async (req, res) => {
  try {
    const { medicalFormId } = req.body;
    
    // Verify medical form exists and belongs to user
    const medicalForm = await MedicalForm.findById(medicalFormId);
    if (!medicalForm) {
      return res.status(404).json({ message: 'Medical form not found' });
    }
    
    if (medicalForm.patientId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to pay for this form' });
    }
    
    if (medicalForm.status !== 'completed') {
      return res.status(400).json({ message: 'Medical form result is not ready yet' });
    }
    
    if (medicalForm.status === 'paid') {
      return res.status(400).json({ message: 'Payment already completed for this form' });
    }
    
    const options = {
      amount: medicalForm.paymentAmount * 100, // amount in paise
      currency: 'INR',
      receipt: `mf_${medicalFormId.slice(-8)}_${Date.now().toString().slice(-8)}`, // Keep under 40 chars
      notes: {
        medicalFormId: medicalFormId,
        patientId: req.user.userId,
        type: 'medical_form_payment'
      }
    };
    
    const order = await razorpay.orders.create(options);
    
    res.json({
      ...order,
      medicalFormId,
      amount: medicalForm.paymentAmount
    });
  } catch (err) {
    console.error('Medical form payment order creation error:', err);
    
    let errorMessage = 'Payment error';
    if (err.error && err.error.description) {
      errorMessage = err.error.description;
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    res.status(500).json({ 
      message: errorMessage,
      error: err.message 
    });
  }
});

// Verify medical form payment
router.post('/medical-form/verify', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, medicalFormId } = req.body;
    
    // Create signature for verification
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');
    
    const isAuthentic = expectedSignature === razorpay_signature;
    
    if (!isAuthentic) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }
    
    // Update medical form with payment details
    const medicalForm = await MedicalForm.findById(medicalFormId);
    if (!medicalForm) {
      return res.status(404).json({ message: 'Medical form not found' });
    }
    
    if (medicalForm.patientId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to update this form' });
    }
    
    medicalForm.paymentId = razorpay_payment_id;
    medicalForm.paidAt = new Date();
    medicalForm.status = 'paid';
    
    await medicalForm.save();
    
    // Get patient and professional details for notifications
    const patient = await User.findById(medicalForm.patientId);
    const professional = await User.findById(medicalForm.assignedTo);
    
    // Send email notification to patient
    try {
      const { sendEmail, emailTemplates } = require('../utils/emailService');
      await sendEmail(patient.email, emailTemplates.medicalFormPaid, patient.name, patient.email, professional.name, medicalForm.assignedType, medicalForm._id, razorpay_payment_id);
    } catch (emailError) {
      console.error('Error sending medical form payment email to patient:', emailError);
    }
    
    // Send in-app notifications
    try {
      const { notifyMedicalFormPaid } = require('../utils/notificationHelper');
      await notifyMedicalFormPaid({
        patientId: medicalForm.patientId,
        patientName: patient.name,
        professionalId: professional._id,
        professionalName: professional.name,
        professionalType: medicalForm.assignedType,
        formId: medicalForm._id,
        paymentId: razorpay_payment_id,
        amount: medicalForm.paymentAmount
      });
    } catch (notificationError) {
      console.error('Error sending medical form payment notifications:', notificationError);
    }
    
    res.json({ 
      success: true, 
      paymentId: razorpay_payment_id,
      medicalForm,
      downloadUrl: medicalForm.resultPdfUrl
    });
  } catch (err) {
    console.error('Medical form payment verification error:', err);
    res.status(500).json({ message: 'Verification error', error: err.message });
  }
});

module.exports = router;
