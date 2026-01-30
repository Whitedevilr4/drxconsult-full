const express = require('express');
const MedicalForm = require('../models/MedicalForm');
const User = require('../models/User');
const Pharmacist = require('../models/Pharmacist');
const Doctor = require('../models/Doctor');
const { auth, isAdmin } = require('../middleware/auth');
const { sendEmail } = require('../utils/emailService');
const { 
  notifyMedicalFormSubmitted, 
  notifyMedicalFormAssigned, 
  notifyMedicalFormCompleted,
  notifyMedicalFormPaid
} = require('../utils/notificationHelper');

const router = express.Router();

// Create medical form (Patient)
router.post('/', auth, async (req, res) => {
  try {
    const { patientName, age, sex, prescriptionDetails, prescriptionUrl, additionalNotes } = req.body;
    
    // Validate required fields
    if (!patientName || !age || !sex || !prescriptionDetails || !prescriptionUrl) {
      return res.status(400).json({ 
        message: 'All fields are required: patientName, age, sex, prescriptionDetails, prescriptionUrl' 
      });
    }
    
    // Create medical form
    const medicalForm = new MedicalForm({
      patientId: req.user.userId,
      patientName,
      age,
      sex,
      prescriptionDetails,
      prescriptionUrl,
      additionalNotes: additionalNotes || '',
      status: 'pending'
    });
    
    await medicalForm.save();
    
    // Get patient details for notifications
    const patient = await User.findById(req.user.userId);
    
    // Send email notification to patient
    try {
      const { emailTemplates } = require('../utils/emailService');
      await sendEmail(patient.email, emailTemplates.medicalFormSubmitted, patient.name, patient.email, medicalForm._id);
    } catch (emailError) {
      console.error('Error sending medical form submission email:', emailError);
    }
    
    // Send in-app notifications
    try {
      await notifyMedicalFormSubmitted({
        patientId: req.user.userId,
        patientName: patient.name,
        formId: medicalForm._id
      });
    } catch (notificationError) {
      console.error('Error sending medical form submission notifications:', notificationError);
    }
    
    res.status(201).json({
      message: 'Medical form submitted successfully',
      medicalForm
    });
  } catch (error) {
    console.error('Error creating medical form:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get patient's medical forms
router.get('/my-forms', auth, async (req, res) => {
  try {
    const medicalForms = await MedicalForm.find({ patientId: req.user.userId })
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name')
      .sort({ createdAt: -1 });
    
    res.json(medicalForms);
  } catch (error) {
    console.error('Error fetching medical forms:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all pending medical forms (Admin only)
router.get('/pending', auth, isAdmin, async (req, res) => {
  try {
    const pendingForms = await MedicalForm.find({ status: 'pending' })
      .populate('patientId', 'name email phone')
      .sort({ createdAt: -1 });
    
    res.json(pendingForms);
  } catch (error) {
    console.error('Error fetching pending forms:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all medical forms (Admin only)
router.get('/all', auth, isAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = status ? { status } : {};
    
    const medicalForms = await MedicalForm.find(query)
      .populate('patientId', 'name email phone')
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await MedicalForm.countDocuments(query);
    
    res.json({
      medicalForms,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching medical forms:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Assign medical form to professional (Admin only)
router.patch('/:id/assign', auth, isAdmin, async (req, res) => {
  try {
    const { professionalId, professionalType } = req.body;
    
    if (!professionalId || !professionalType) {
      return res.status(400).json({ message: 'professionalId and professionalType are required' });
    }
    
    if (!['pharmacist', 'doctor'].includes(professionalType)) {
      return res.status(400).json({ message: 'professionalType must be either pharmacist or doctor' });
    }
    
    // Verify professional exists
    let professional;
    if (professionalType === 'pharmacist') {
      professional = await Pharmacist.findById(professionalId).populate('userId');
    } else {
      professional = await Doctor.findById(professionalId).populate('userId');
    }
    
    if (!professional) {
      return res.status(404).json({ message: `${professionalType} not found` });
    }
    
    // Update medical form
    const medicalForm = await MedicalForm.findById(req.params.id);
    if (!medicalForm) {
      return res.status(404).json({ message: 'Medical form not found' });
    }
    
    if (medicalForm.status !== 'pending') {
      return res.status(400).json({ message: 'Medical form is not in pending status' });
    }
    
    medicalForm.assignedTo = professional.userId._id;
    medicalForm.assignedType = professionalType;
    medicalForm.assignedAt = new Date();
    medicalForm.assignedBy = req.user.userId;
    medicalForm.status = 'assigned';
    
    await medicalForm.save();
    
    // Get patient and professional details for notifications
    const patient = await User.findById(medicalForm.patientId);
    
    // Send email notification to patient
    try {
      const { emailTemplates } = require('../utils/emailService');
      await sendEmail(patient.email, emailTemplates.medicalFormAssigned, patient.name, patient.email, professional.userId.name, professionalType, medicalForm._id);
    } catch (emailError) {
      console.error('Error sending medical form assignment email to patient:', emailError);
    }
    
    // Send email notification to professional
    try {
      const { emailTemplates } = require('../utils/emailService');
      await sendEmail(professional.userId.email, emailTemplates.professionalMedicalFormAssigned, professional.userId.name, professional.userId.email, patient.name, medicalForm._id, professionalType);
    } catch (emailError) {
      console.error('Error sending medical form assignment email to professional:', emailError);
    }
    
    // Send in-app notifications
    try {
      await notifyMedicalFormAssigned({
        patientId: medicalForm.patientId,
        patientName: patient.name,
        professionalId: professional.userId._id,
        professionalName: professional.userId.name,
        professionalType: professionalType,
        formId: medicalForm._id,
        assignedBy: req.user.userId
      });
    } catch (notificationError) {
      console.error('Error sending medical form assignment notifications:', notificationError);
    }
    
    res.json({
      message: `Medical form assigned to ${professionalType} successfully`,
      medicalForm
    });
  } catch (error) {
    console.error('Error assigning medical form:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get assigned medical forms (Pharmacist/Doctor)
router.get('/assigned-to-me', auth, async (req, res) => {
  try {
    const assignedForms = await MedicalForm.find({ 
      assignedTo: req.user.userId,
      status: { $in: ['assigned', 'completed'] }
    })
      .populate('patientId', 'name email phone')
      .populate('assignedBy', 'name')
      .sort({ assignedAt: -1 });
    
    res.json(assignedForms);
  } catch (error) {
    console.error('Error fetching assigned forms:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload result PDF (Pharmacist/Doctor)
router.patch('/:id/result', auth, async (req, res) => {
  try {
    const { resultPdfUrl, resultNotes } = req.body;
    
    if (!resultPdfUrl) {
      return res.status(400).json({ message: 'resultPdfUrl is required' });
    }
    
    const medicalForm = await MedicalForm.findById(req.params.id);
    if (!medicalForm) {
      return res.status(404).json({ message: 'Medical form not found' });
    }
    
    // Verify user is assigned to this form
    if (medicalForm.assignedTo.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to update this medical form' });
    }
    
    if (medicalForm.status !== 'assigned') {
      return res.status(400).json({ message: 'Medical form is not in assigned status' });
    }
    
    medicalForm.resultPdfUrl = resultPdfUrl;
    medicalForm.resultNotes = resultNotes || '';
    medicalForm.completedAt = new Date();
    medicalForm.status = 'completed';
    
    await medicalForm.save();
    
    // Get patient and professional details for notifications
    const patient = await User.findById(medicalForm.patientId);
    const professional = await User.findById(medicalForm.assignedTo);
    
    // Send email notification to patient
    try {
      const { emailTemplates } = require('../utils/emailService');
      await sendEmail(patient.email, emailTemplates.medicalFormCompleted, patient.name, patient.email, professional.name, medicalForm.assignedType, medicalForm._id, resultNotes);
    } catch (emailError) {
      console.error('Error sending medical form completion email to patient:', emailError);
    }
    
    // Send in-app notifications
    try {
      await notifyMedicalFormCompleted({
        patientId: medicalForm.patientId,
        patientName: patient.name,
        professionalId: professional._id,
        professionalName: professional.name,
        professionalType: medicalForm.assignedType,
        formId: medicalForm._id,
        resultNotes: resultNotes
      });
    } catch (notificationError) {
      console.error('Error sending medical form completion notifications:', notificationError);
    }
    
    res.json({
      message: 'Result uploaded successfully',
      medicalForm
    });
  } catch (error) {
    console.error('Error uploading result:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get medical form details
router.get('/:id', auth, async (req, res) => {
  try {
    const medicalForm = await MedicalForm.findById(req.params.id)
      .populate('patientId', 'name email phone')
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name');
    
    if (!medicalForm) {
      return res.status(404).json({ message: 'Medical form not found' });
    }
    
    // Check authorization
    const isPatient = medicalForm.patientId._id.toString() === req.user.userId;
    const isAssigned = medicalForm.assignedTo && medicalForm.assignedTo._id.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    
    if (!isPatient && !isAssigned && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to access this medical form' });
    }
    
    res.json(medicalForm);
  } catch (error) {
    console.error('Error fetching medical form:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;