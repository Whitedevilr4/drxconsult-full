const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const HospitalQuery = require('../models/HospitalQuery');
const HospitalChat = require('../models/HospitalChat');
const { createNotification } = require('../utils/notificationHelper');
const { notifyQueryAccepted, notifyQueryRejected } = require('../utils/socketManager');

// Get hospital profile
router.get('/profile', auth, async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user.userId })
      .populate('userId', 'email name');

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }

    res.json(hospital);
  } catch (error) {
    console.error('Error fetching hospital profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update hospital profile
router.put('/profile', auth, async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user.userId });

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }

    Object.assign(hospital, req.body);
    await hospital.save();

    res.json({ message: 'Profile updated successfully', hospital });
  } catch (error) {
    console.error('Error updating hospital profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update bed availability
router.put('/beds', auth, async (req, res) => {
  try {
    const { availableBeds, availableIcuBeds } = req.body;
    const hospital = await Hospital.findOne({ userId: req.user.userId });

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }

    if (availableBeds !== undefined) hospital.availableBeds = availableBeds;
    if (availableIcuBeds !== undefined) hospital.availableIcuBeds = availableIcuBeds;
    
    await hospital.save();

    res.json({ message: 'Bed availability updated', hospital });
  } catch (error) {
    console.error('Error updating bed availability:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get pending queries for hospital (location-based)
router.get('/queries/pending', auth, async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user.userId });

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }

    // Find pending queries
    const queries = await HospitalQuery.find({ status: 'pending' })
      .populate('userId', 'name email phoneNumber')
      .sort({ createdAt: -1 });

    // Filter by distance if coordinates available
    const filteredQueries = queries.filter(query => {
      if (!query.userLatitude || !query.userLongitude || !hospital.latitude || !hospital.longitude) {
        return true; // Include if coordinates not available
      }

      const distance = calculateDistance(
        query.userLatitude,
        query.userLongitude,
        hospital.latitude,
        hospital.longitude
      );

      return distance <= 50; // 50km radius
    });

    res.json(filteredQueries);
  } catch (error) {
    console.error('Error fetching queries:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept query
router.post('/queries/:queryId/accept', auth, async (req, res) => {
  try {
    const { queryId } = req.params;
    const { availableBeds } = req.body;

    const hospital = await Hospital.findOne({ userId: req.user.userId });

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }

    const query = await HospitalQuery.findById(queryId).populate('userId', 'name email phone');

    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    if (query.status !== 'pending') {
      return res.status(400).json({ message: 'Query already processed' });
    }

    query.status = 'accepted';
    query.acceptedByHospitalId = hospital._id;
    query.acceptedAt = new Date();
    await query.save();

    // Send in-app notification to user
    const userIdToNotify = query.userId._id || query.userId;
    await createNotification({
      userId: userIdToNotify,
      type: 'hospital_query_accepted',
      title: 'Hospital Accepted Your Query',
      message: `${hospital.hospitalName} has accepted your query. Available beds: ${availableBeds}`
    });

    // Send real-time Socket.IO notification
    const io = req.app.get('io');
    if (io) {
      const notificationData = {
        queryId: query._id.toString(),
        hospitalId: hospital._id.toString(),
        hospitalName: hospital.hospitalName,
        hospitalContact: hospital.contactNumber,
        availableBeds,
        acceptedAt: query.acceptedAt
      };
      
      console.log('📤 Emitting query-accepted to user');
      
      notifyQueryAccepted(io, userIdToNotify.toString(), notificationData);
      
      console.log('✅ Query acceptance notification sent');
    } else {
      console.error('❌ Socket.IO not available');
    }

    res.json({ message: 'Query accepted successfully', query });
  } catch (error) {
    console.error('Error accepting query:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject query
router.post('/queries/:queryId/reject', auth, async (req, res) => {
  try {
    const { queryId } = req.params;
    const { reason } = req.body;

    const hospital = await Hospital.findOne({ userId: req.user.userId });

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }

    const query = await HospitalQuery.findById(queryId).populate('userId', 'name email phone');

    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    if (query.status !== 'pending') {
      return res.status(400).json({ message: 'Query already processed' });
    }

    query.status = 'rejected';
    await query.save();

    // Send in-app notification to user
    const userIdToNotify = query.userId._id || query.userId;
    await createNotification({
      userId: userIdToNotify,
      type: 'hospital_query_rejected',
      title: 'Hospital Rejected Your Query',
      message: `${hospital.hospitalName} cannot accommodate your request at this time.`
    });

    // Send real-time Socket.IO notification
    const io = req.app.get('io');
    if (io) {
      notifyQueryRejected(io, userIdToNotify.toString(), {
        queryId: query._id,
        hospitalName: hospital.hospitalName,
        reason: reason || 'No beds available'
      });
    }

    res.json({ message: 'Query rejected successfully', query });
  } catch (error) {
    console.error('Error rejecting query:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Close query (hospital only)
router.post('/queries/:queryId/close', auth, async (req, res) => {
  try {
    const { queryId } = req.params;

    const hospital = await Hospital.findOne({ userId: req.user.userId });

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }

    const query = await HospitalQuery.findById(queryId).populate('userId', 'name email phone');

    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    if (query.acceptedByHospitalId.toString() !== hospital._id.toString()) {
      return res.status(403).json({ message: 'You can only close queries you accepted' });
    }

    if (query.status === 'completed') {
      return res.status(400).json({ message: 'Query already closed' });
    }

    query.status = 'completed';
    await query.save();

    // Send notification to user
    const userIdToNotify = query.userId._id || query.userId;
    await createNotification({
      userId: userIdToNotify,
      type: 'hospital_query_closed',
      title: 'Query Closed',
      message: `${hospital.hospitalName} has closed your query. Thank you for using our service.`
    });

    // Send real-time Socket.IO notification
    const io = req.app.get('io');
    if (io) {
      io.to(`query:${queryId}`).emit('query-closed', {
        queryId: query._id,
        hospitalName: hospital.hospitalName,
        closedAt: new Date()
      });
    }

    res.json({ message: 'Query closed successfully', query });
  } catch (error) {
    console.error('Error closing query:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get accepted queries for hospital
router.get('/queries/accepted', auth, async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user.userId });

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }

    const queries = await HospitalQuery.find({
      acceptedByHospitalId: hospital._id,
      status: { $in: ['accepted', 'completed'] }
    })
      .populate('userId', 'name email phoneNumber')
      .sort({ acceptedAt: -1 });

    res.json(queries);
  } catch (error) {
    console.error('Error fetching accepted queries:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = router;
