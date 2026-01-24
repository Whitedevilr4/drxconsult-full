const express = require('express');
const { body, validationResult } = require('express-validator');
const WebsiteSettings = require('../models/WebsiteSettings');
const FAQ = require('../models/FAQ');
const CustomerService = require('../models/CustomerService');
const LegalPage = require('../models/LegalPage');
const { auth, isAdmin } = require('../middleware/auth');

const router = express.Router();

// ============ WEBSITE SETTINGS ============

// Get website settings (public)
router.get('/settings', async (req, res) => {
  try {
    let settings = await WebsiteSettings.findOne();
    
    // Create default settings if none exist using findOneAndUpdate
    if (!settings) {
      settings = await WebsiteSettings.findOneAndUpdate(
        {},
        { updatedAt: new Date() },
        { new: true, upsert: true }
      );
    }
    
    res.json(settings);
  } catch (err) {
    console.error('Error fetching website settings:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update website settings (admin only)
router.put('/settings', [
  auth,
  isAdmin,
  body('websiteName').optional().trim().isLength({ min: 1, max: 100 }),
  body('websiteDescription').optional().trim().isLength({ min: 1, max: 500 }),
  body('heroSection.title').optional().trim().isLength({ max: 200 }),
  body('heroSection.subtitle').optional().trim().isLength({ max: 200 }),
  body('heroSection.description').optional().trim().isLength({ max: 500 }),
  body('contactInfo.email').optional().isEmail(),
  body('contactInfo.phone').optional().trim().isLength({ max: 20 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    let settings = await WebsiteSettings.findOne();
    
    if (!settings) {
      // Create new settings with the provided data
      const newSettings = {
        updatedAt: new Date(),
        ...req.body
      };
      settings = await WebsiteSettings.create(newSettings);
    } else {
      // Update existing settings using findOneAndUpdate to avoid middleware issues
      const updateData = { updatedAt: new Date() };
      
      // Update fields that are provided
      const updateFields = [
        'websiteName', 'websiteDescription', 'logo', 'favicon',
        'heroSection', 'contactInfo', 'socialMedia', 'seo', 
        'footerText', 'maintenanceMode'
      ];

      updateFields.forEach(field => {
        if (req.body[field] !== undefined) {
          if (typeof req.body[field] === 'object' && req.body[field] !== null) {
            // For nested objects, merge with existing data
            updateData[field] = { ...settings[field]?.toObject(), ...req.body[field] };
          } else {
            updateData[field] = req.body[field];
          }
        }
      });

      settings = await WebsiteSettings.findOneAndUpdate(
        {},
        updateData,
        { new: true, upsert: true }
      );
    }

    res.json({
      message: 'Website settings updated successfully',
      settings
    });
  } catch (err) {
    console.error('Error updating website settings:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============ FAQ MANAGEMENT ============

// Get all FAQs (public)
router.get('/faqs', async (req, res) => {
  try {
    const { category, active = 'true' } = req.query;
    
    const filter = {};
    if (category) filter.category = category;
    if (active === 'true') filter.isActive = true;
    
    const faqs = await FAQ.find(filter)
      .populate('createdBy', 'name')
      .sort({ order: 1, createdAt: -1 });
    
    res.json(faqs);
  } catch (err) {
    console.error('Error fetching FAQs:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create FAQ (admin only)
router.post('/faqs', [
  auth,
  isAdmin,
  body('question').notEmpty().trim().isLength({ max: 500 }),
  body('answer').notEmpty().trim().isLength({ max: 2000 }),
  body('category').optional().isIn(['general', 'booking', 'payment', 'consultation', 'technical', 'other']),
  body('order').optional().isInt({ min: 0 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { question, answer, category = 'general', order = 0 } = req.body;

    const faqData = {
      question,
      answer,
      category,
      order,
      createdBy: req.user.userId,
      updatedAt: new Date()
    };

    const faq = await FAQ.create(faqData);
    await faq.populate('createdBy', 'name');

    res.status(201).json({
      message: 'FAQ created successfully',
      faq
    });
  } catch (err) {
    console.error('Error creating FAQ:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update FAQ (admin only)
router.put('/faqs/:id', [
  auth,
  isAdmin,
  body('question').optional().trim().isLength({ max: 500 }),
  body('answer').optional().trim().isLength({ max: 2000 }),
  body('category').optional().isIn(['general', 'booking', 'payment', 'consultation', 'technical', 'other']),
  body('order').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const faq = await FAQ.findById(req.params.id);
    
    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }

    const updateData = { updatedAt: new Date() };
    const { question, answer, category, order, isActive } = req.body;

    if (question) updateData.question = question;
    if (answer) updateData.answer = answer;
    if (category) updateData.category = category;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedFaq = await FAQ.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('createdBy', 'name');

    res.json({
      message: 'FAQ updated successfully',
      faq: updatedFaq
    });
  } catch (err) {
    console.error('Error updating FAQ:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete FAQ (admin only)
router.delete('/faqs/:id', auth, isAdmin, async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    
    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }

    res.json({ message: 'FAQ deleted successfully' });
  } catch (err) {
    console.error('Error deleting FAQ:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============ CUSTOMER SERVICE MANAGEMENT ============

// Get all customer service options (public)
router.get('/customer-service', async (req, res) => {
  try {
    const { active = 'true' } = req.query;
    
    const filter = {};
    if (active === 'true') filter.isActive = true;
    
    const services = await CustomerService.find(filter)
      .populate('createdBy', 'name')
      .sort({ order: 1, createdAt: -1 });
    
    res.json(services);
  } catch (err) {
    console.error('Error fetching customer service options:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create customer service option (admin only)
router.post('/customer-service', [
  auth,
  isAdmin,
  body('title').notEmpty().trim().isLength({ max: 200 }),
  body('description').notEmpty().trim().isLength({ max: 1000 }),
  body('contactMethod').isIn(['phone', 'email', 'chat', 'form', 'whatsapp']),
  body('contactValue').notEmpty().trim(),
  body('workingHours').optional().trim().isLength({ max: 100 }),
  body('order').optional().isInt({ min: 0 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, description, icon = '📞', contactMethod, contactValue, workingHours = '24/7', order = 0 } = req.body;

    const serviceData = {
      title,
      description,
      icon,
      contactMethod,
      contactValue,
      workingHours,
      order,
      createdBy: req.user.userId,
      updatedAt: new Date()
    };

    const service = await CustomerService.create(serviceData);
    await service.populate('createdBy', 'name');

    res.status(201).json({
      message: 'Customer service option created successfully',
      service
    });
  } catch (err) {
    console.error('Error creating customer service option:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update customer service option (admin only)
router.put('/customer-service/:id', [
  auth,
  isAdmin,
  body('title').optional().trim().isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('contactMethod').optional().isIn(['phone', 'email', 'chat', 'form', 'whatsapp']),
  body('contactValue').optional().trim(),
  body('workingHours').optional().trim().isLength({ max: 100 }),
  body('order').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const service = await CustomerService.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Customer service option not found' });
    }

    const updateData = { updatedAt: new Date() };
    const { title, description, icon, contactMethod, contactValue, workingHours, order, isActive } = req.body;

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (icon) updateData.icon = icon;
    if (contactMethod) updateData.contactMethod = contactMethod;
    if (contactValue) updateData.contactValue = contactValue;
    if (workingHours) updateData.workingHours = workingHours;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedService = await CustomerService.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('createdBy', 'name');

    res.json({
      message: 'Customer service option updated successfully',
      service: updatedService
    });
  } catch (err) {
    console.error('Error updating customer service option:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete customer service option (admin only)
router.delete('/customer-service/:id', auth, isAdmin, async (req, res) => {
  try {
    const service = await CustomerService.findByIdAndDelete(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Customer service option not found' });
    }

    res.json({ message: 'Customer service option deleted successfully' });
  } catch (err) {
    console.error('Error deleting customer service option:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
// ============ LEGAL PAGES MANAGEMENT ============

// Get legal page by type (public)
router.get('/legal/:pageType', async (req, res) => {
  try {
    const { pageType } = req.params;
    
    if (!['privacy-policy', 'terms-and-conditions', 'refund-policy', 'disclaimer'].includes(pageType)) {
      return res.status(400).json({ message: 'Invalid page type' });
    }
    
    const page = await LegalPage.findOne({ pageType, isActive: true })
      .populate('updatedBy', 'name');
    
    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }
    
    res.json(page);
  } catch (err) {
    console.error('Error fetching legal page:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all legal pages (admin only)
router.get('/admin/legal', auth, isAdmin, async (req, res) => {
  try {
    const pages = await LegalPage.find()
      .populate('updatedBy', 'name')
      .sort({ pageType: 1 });
    
    res.json(pages);
  } catch (err) {
    console.error('Error fetching legal pages:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create or update legal page (admin only)
router.put('/admin/legal/:pageType', [
  auth,
  isAdmin,
  body('title').notEmpty().trim().isLength({ max: 200 }),
  body('content').notEmpty().trim(),
  body('version').optional().trim().isLength({ max: 10 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { pageType } = req.params;
    const { title, content, version = '1.0' } = req.body;
    
    if (!['privacy-policy', 'terms-and-conditions', 'refund-policy', 'disclaimer'].includes(pageType)) {
      return res.status(400).json({ message: 'Invalid page type' });
    }

    const updateData = {
      pageType,
      title,
      content,
      version,
      lastUpdated: new Date(),
      updatedBy: req.user.userId,
      updatedAt: new Date()
    };

    const page = await LegalPage.findOneAndUpdate(
      { pageType },
      updateData,
      { new: true, upsert: true }
    ).populate('updatedBy', 'name');

    res.json({
      message: 'Legal page updated successfully',
      page
    });
  } catch (err) {
    console.error('Error updating legal page:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete legal page (admin only)
router.delete('/admin/legal/:pageType', auth, isAdmin, async (req, res) => {
  try {
    const { pageType } = req.params;
    
    const page = await LegalPage.findOneAndDelete({ pageType });
    
    if (!page) {
      return res.status(404).json({ message: 'Legal page not found' });
    }

    res.json({ message: 'Legal page deleted successfully' });
  } catch (err) {
    console.error('Error deleting legal page:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Toggle legal page status (admin only)
router.patch('/admin/legal/:pageType/toggle', auth, isAdmin, async (req, res) => {
  try {
    const { pageType } = req.params;
    
    const page = await LegalPage.findOne({ pageType });
    
    if (!page) {
      return res.status(404).json({ message: 'Legal page not found' });
    }

    const updatedPage = await LegalPage.findOneAndUpdate(
      { pageType },
      { 
        isActive: !page.isActive,
        updatedAt: new Date(),
        updatedBy: req.user.userId
      },
      { new: true }
    ).populate('updatedBy', 'name');

    res.json({
      message: `Legal page ${updatedPage.isActive ? 'activated' : 'deactivated'} successfully`,
      page: updatedPage
    });
  } catch (err) {
    console.error('Error toggling legal page status:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});