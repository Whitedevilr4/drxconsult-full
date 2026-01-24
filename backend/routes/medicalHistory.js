const express = require('express');
const MedicalHistory = require('../models/MedicalHistory');
const { auth, isPharmacist } = require('../middleware/auth');

const router = express.Router();

// Create/Update medical history
router.post('/', auth, async (req, res) => {
  try {
    let history = await MedicalHistory.findOne({ patientId: req.user.userId });
    
    if (history) {
      history.documents = req.body.documents || history.documents;
      history.details = req.body.details || history.details;
      history.updatedAt = Date.now();
    } else {
      history = new MedicalHistory({
        patientId: req.user.userId,
        documents: req.body.documents,
        details: req.body.details
      });
    }
    
    await history.save();
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get medical history
router.get('/', auth, async (req, res) => {
  try {
    const history = await MedicalHistory.findOne({ patientId: req.user.userId })
      .populate({
        path: 'assignedPharmacist',
        populate: { path: 'userId', select: 'name email' }
      });
    
    res.json(history || {});
  } catch (err) {
    console.error('Error fetching medical history:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Upload assessment report (pharmacist)
router.put('/:id/assessment', auth, isPharmacist, async (req, res) => {
  try {
    const history = await MedicalHistory.findById(req.params.id);
    if (!history) {
      return res.status(404).json({ message: 'Medical history not found' });
    }
    
    history.assessmentReport = req.body.reportUrl;
    await history.save();
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Pay for assessment
router.post('/:id/pay-assessment', auth, async (req, res) => {
  try {
    const history = await MedicalHistory.findById(req.params.id);
    if (!history) {
      return res.status(404).json({ message: 'Medical history not found' });
    }
    
    history.assessmentPaid = true;
    await history.save();
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Upload prescription (patient)
router.post('/prescription', auth, async (req, res) => {
  try {
    const { prescriptionUrl } = req.body;
    
    let history = await MedicalHistory.findOne({ patientId: req.user.userId });
    
    if (!history) {
      history = new MedicalHistory({
        patientId: req.user.userId,
        documents: [],
        details: {},
        prescriptions: []
      });
    }
    
    if (!history.prescriptions) {
      history.prescriptions = [];
    }
    
    history.prescriptions.push(prescriptionUrl);
    history.updatedAt = Date.now();
    
    await history.save();
    res.json({ message: 'Prescription uploaded successfully', history });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Submit review for assessment (patient only)
router.post('/:id/review', auth, async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    const history = await MedicalHistory.findById(req.params.id);
    if (!history) {
      return res.status(404).json({ message: 'Assessment not found' });
    }
    
    // Verify user is the patient
    if (history.patientId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to review this assessment' });
    }
    
    // Can only review completed assessments
    if (!history.pharmacistAssessment || !history.pharmacistAssessment.completed) {
      return res.status(400).json({ message: 'Can only review completed assessments' });
    }
    
    // Check if already reviewed
    if (history.review && history.review.rating) {
      return res.status(400).json({ message: 'You have already reviewed this assessment' });
    }
    
    history.review = {
      rating,
      feedback: feedback || '',
      submittedAt: new Date()
    };
    
    await history.save();
    
    res.json({
      message: 'Review submitted successfully',
      history
    });
  } catch (err) {
    console.error('Error submitting review:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all assessments for current patient
router.get('/my-assessments', auth, async (req, res) => {
  try {
    const assessments = await MedicalHistory.find({ 
      patientId: req.user.userId,
      'selfAssessment.submitted': true
    })
    .populate({
      path: 'assignedPharmacist',
      populate: { path: 'userId', select: 'name email' }
    })
    .sort({ 'selfAssessment.submittedAt': -1 });
    
    res.json(assessments);
  } catch (err) {
    console.error('Error fetching assessments:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Pay for assessment report (patient only)
router.post('/:id/pay-report', auth, async (req, res) => {
  try {
    const { paymentId } = req.body;
    
    const history = await MedicalHistory.findById(req.params.id);
    if (!history) {
      return res.status(404).json({ message: 'Assessment not found' });
    }
    
    // Verify user is the patient
    if (history.patientId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Check if report is completed
    if (!history.pharmacistAssessment || !history.pharmacistAssessment.completed) {
      return res.status(400).json({ message: 'Report not yet completed' });
    }
    
    // Check if already paid
    if (history.reportPayment && history.reportPayment.paid) {
      return res.status(400).json({ message: 'Report already paid for' });
    }
    
    // Record payment
    history.reportPayment = {
      paid: true,
      amount: 50,
      paymentId: paymentId,
      paidAt: new Date(),
      pharmacistShare: 25,
      adminShare: 25,
      pharmacistPaid: false
    };
    
    await history.save();
    
    res.json({
      message: 'Payment successful. You can now download the report.',
      history
    });
  } catch (err) {
    console.error('Error processing payment:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
