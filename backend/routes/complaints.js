const express = require('express');
const { body, validationResult } = require('express-validator');
const Complaint = require('../models/Complaint');
const { auth, isAdmin } = require('../middleware/auth');
const { notifyComplaintSubmitted, notifyComplaintUpdated } = require('../utils/notificationHelper');

const router = express.Router();

// Get all complaints for current user
router.get('/my-complaints', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category } = req.query;
    
    const filter = { userId: req.user.userId };
    if (status) filter.status = status;
    if (category) filter.category = category;
    
    const complaints = await Complaint.find(filter)
      .populate('relatedBooking', 'slotDate slotTime')
      .populate('relatedPharmacist', 'designation')
      .populate('adminResponse.respondedBy', 'name')
      .populate('resolution.resolvedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Complaint.countDocuments(filter);
    
    res.json({
      complaints,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    console.error('Error fetching user complaints:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Submit a new complaint
router.post('/submit', [
  auth,
  body('title').notEmpty().trim().isLength({ max: 200 }),
  body('description').notEmpty().trim().isLength({ max: 2000 }),
  body('category').isIn([
    'technical_issue', 'service_quality', 'billing', 'pharmacist_behavior',
    'appointment_issue', 'platform_bug', 'privacy_concern', 'other'
  ]),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      title,
      description,
      category,
      priority = 'medium',
      relatedBooking,
      relatedPharmacist,
      attachments = []
    } = req.body;

    // Clean up optional ObjectId fields - convert empty strings to undefined
    const cleanRelatedBooking = relatedBooking && relatedBooking.trim() !== '' ? relatedBooking : undefined;
    const cleanRelatedPharmacist = relatedPharmacist && relatedPharmacist.trim() !== '' ? relatedPharmacist : undefined;

    const complaint = new Complaint({
      userId: req.user.userId,
      title,
      description,
      category,
      priority,
      relatedBooking: cleanRelatedBooking,
      relatedPharmacist: cleanRelatedPharmacist,
      attachments,
      updatedAt: new Date()
    });

    await complaint.save();

    // Populate the complaint for response
    await complaint.populate([
      { path: 'userId', select: 'name email' },
      { path: 'relatedBooking', select: 'slotDate slotTime' },
      { path: 'relatedPharmacist', select: 'designation' }
    ]);

    // Notify admins about new complaint
    await notifyComplaintSubmitted(complaint);

    res.status(201).json({
      message: 'Complaint submitted successfully',
      complaint
    });
  } catch (err) {
    console.error('Error submitting complaint:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get complaint details
router.get('/:id', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('relatedBooking', 'slotDate slotTime')
      .populate('relatedPharmacist', 'designation')
      .populate('adminResponse.respondedBy', 'name')
      .populate('resolution.resolvedBy', 'name')
      .populate('assignedTo', 'name')
      .populate('internalNotes.addedBy', 'name');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check if user owns the complaint or is admin
    if (complaint.userId._id.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(complaint);
  } catch (err) {
    console.error('Error fetching complaint:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update complaint (user can only update if status is 'open')
router.put('/:id', [
  auth,
  body('title').optional().trim().isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('category').optional().isIn([
    'technical_issue', 'service_quality', 'billing', 'pharmacist_behavior',
    'appointment_issue', 'platform_bug', 'privacy_concern', 'other'
  ]),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check ownership
    if (complaint.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only allow updates if complaint is still open
    if (complaint.status !== 'open') {
      return res.status(400).json({ message: 'Cannot update complaint that is no longer open' });
    }

    const { title, description, category, priority, attachments } = req.body;

    if (title) complaint.title = title;
    if (description) complaint.description = description;
    if (category) complaint.category = category;
    if (priority) complaint.priority = priority;
    if (attachments) complaint.attachments = attachments;

    complaint.updatedAt = new Date();
    await complaint.save();

    res.json({
      message: 'Complaint updated successfully',
      complaint
    });
  } catch (err) {
    console.error('Error updating complaint:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Submit satisfaction rating (after resolution)
router.post('/:id/rating', [
  auth,
  body('rating').isInt({ min: 1, max: 5 }),
  body('feedback').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check ownership
    if (complaint.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Can only rate resolved complaints
    if (complaint.status !== 'resolved') {
      return res.status(400).json({ message: 'Can only rate resolved complaints' });
    }

    const { rating, feedback } = req.body;

    complaint.resolution.satisfactionRating = rating;
    if (feedback) {
      complaint.resolution.feedback = feedback;
    }

    complaint.updatedAt = new Date();
    await complaint.save();

    res.json({
      message: 'Rating submitted successfully',
      complaint
    });
  } catch (err) {
    console.error('Error submitting rating:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ADMIN ROUTES

// Get all complaints (admin only)
router.get('/admin/all', auth, isAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      category, 
      priority, 
      assignedTo,
      search 
    } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    
    // Search in title and description
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const complaints = await Complaint.find(filter)
      .populate('userId', 'name email')
      .populate('relatedBooking', 'slotDate slotTime')
      .populate('relatedPharmacist', 'designation')
      .populate('assignedTo', 'name')
      .populate('adminResponse.respondedBy', 'name')
      .populate('resolution.resolvedBy', 'name')
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Complaint.countDocuments(filter);
    
    // Get statistics
    const stats = await Complaint.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      complaints,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      stats: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    });
  } catch (err) {
    console.error('Error fetching admin complaints:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Assign complaint to admin (admin only)
router.put('/admin/:id/assign', [
  auth,
  isAdmin,
  body('assignedTo').notEmpty()
], async (req, res) => {
  try {
    const { assignedTo } = req.body;
    
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { 
        assignedTo,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('assignedTo', 'name');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    res.json({
      message: 'Complaint assigned successfully',
      complaint
    });
  } catch (err) {
    console.error('Error assigning complaint:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update complaint status (admin only)
router.put('/admin/:id/status', [
  auth,
  isAdmin,
  body('status').isIn(['open', 'in_progress', 'resolved', 'closed']),
  body('message').optional().trim()
], async (req, res) => {
  try {
    const { status, message } = req.body;
    
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    complaint.status = status;

    if (status === 'resolved' && message) {
      complaint.resolution = {
        message,
        resolvedBy: req.user.userId,
        resolvedAt: new Date()
      };
    }

    complaint.updatedAt = new Date();
    await complaint.save();

    // Populate for response
    await complaint.populate([
      { path: 'userId', select: 'name email' },
      { path: 'resolution.resolvedBy', select: 'name' }
    ]);

    // Notify user about status update
    await notifyComplaintUpdated(complaint);

    res.json({
      message: 'Complaint status updated successfully',
      complaint
    });
  } catch (err) {
    console.error('Error updating complaint status:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add admin response (admin only)
router.post('/admin/:id/respond', [
  auth,
  isAdmin,
  body('message').notEmpty().trim().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const { message } = req.body;
    
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    complaint.adminResponse = {
      message,
      respondedBy: req.user.userId,
      respondedAt: new Date()
    };

    if (complaint.status === 'open') {
      complaint.status = 'in_progress';
    }

    complaint.updatedAt = new Date();
    await complaint.save();

    // Populate for response
    await complaint.populate([
      { path: 'userId', select: 'name email' },
      { path: 'adminResponse.respondedBy', select: 'name' }
    ]);

    // Notify user about admin response
    await notifyComplaintUpdated(complaint);

    res.json({
      message: 'Response added successfully',
      complaint
    });
  } catch (err) {
    console.error('Error adding admin response:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add internal note (admin only)
router.post('/admin/:id/note', [
  auth,
  isAdmin,
  body('note').notEmpty().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const { note } = req.body;
    
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    complaint.internalNotes.push({
      note,
      addedBy: req.user.userId,
      addedAt: new Date()
    });

    complaint.updatedAt = new Date();
    await complaint.save();

    res.json({
      message: 'Internal note added successfully',
      complaint
    });
  } catch (err) {
    console.error('Error adding internal note:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get complaint statistics (admin only)
router.get('/admin/statistics', auth, isAdmin, async (req, res) => {
  try {
    const stats = await Complaint.aggregate([
      {
        $facet: {
          statusStats: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          categoryStats: [
            { $group: { _id: '$category', count: { $sum: 1 } } }
          ],
          priorityStats: [
            { $group: { _id: '$priority', count: { $sum: 1 } } }
          ],
          monthlyStats: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
          ],
          avgResolutionTime: [
            {
              $match: { 
                status: 'resolved',
                'resolution.resolvedAt': { $exists: true }
              }
            },
            {
              $project: {
                resolutionTime: {
                  $divide: [
                    { $subtract: ['$resolution.resolvedAt', '$createdAt'] },
                    1000 * 60 * 60 * 24 // Convert to days
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                avgDays: { $avg: '$resolutionTime' }
              }
            }
          ]
        }
      }
    ]);

    res.json(stats[0]);
  } catch (err) {
    console.error('Error fetching complaint statistics:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;