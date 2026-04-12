const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const HospitalQuery = require('../models/HospitalQuery');
const Hospital = require('../models/Hospital');
const HospitalChat = require('../models/HospitalChat');
const { createNotification } = require('../utils/notificationHelper');
const { notifyNearbyHospitals } = require('../utils/socketEmitter');

// Create new query
router.post('/', auth, async (req, res) => {
  try {
    const { queryType, bedType, specialization, description, userLatitude, userLongitude, userLocation } = req.body;

    const query = await HospitalQuery.create({
      userId: req.user.userId,
      queryType,
      bedType,
      specialization,
      description,
      userLatitude,
      userLongitude,
      userLocation
    });

    // Populate user data for response
    await query.populate('userId', 'name email phone');

    // Find nearby hospitals and notify them
    const hospitals = await Hospital.find({ isActive: true, isVerified: true });

    const nearbyHospitalUserIds = [];

    // Notify hospitals within range
    for (const hospital of hospitals) {
      if (hospital.latitude && hospital.longitude && userLatitude && userLongitude) {
        const distance = calculateDistance(
          userLatitude,
          userLongitude,
          hospital.latitude,
          hospital.longitude
        );

        if (distance <= 50) { // 50km radius
          nearbyHospitalUserIds.push(hospital.userId.toString());
          
          // Send in-app notification
          await createNotification({
            userId: hospital.userId,
            type: 'hospital_query_new',
            title: 'New Hospital Query',
            message: `New ${queryType.replace('_', ' ')} query from nearby location`
          });
        }
      } else {
        // Notify all hospitals if location not available
        nearbyHospitalUserIds.push(hospital.userId.toString());
        
        await createNotification({
          userId: hospital.userId,
          type: 'hospital_query_new',
          title: 'New Hospital Query',
          message: `New ${queryType.replace('_', ' ')} query`
        });
      }
    }

    // Send real-time Socket.IO notification to nearby hospitals
    const io = req.app.get('io');
    if (io) {
      notifyNearbyHospitals(io, nearbyHospitalUserIds, {
        queryId: query._id,
        queryType: query.queryType,
        bedType: query.bedType,
        specialization: query.specialization,
        description: query.description,
        userLocation: query.userLocation,
        userName: query.userId.name,
        createdAt: query.createdAt
      });
    }

    res.status(201).json({ message: 'Query created successfully', query });
  } catch (error) {
    console.error('Error creating query:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's queries
router.get('/my-queries', auth, async (req, res) => {
  try {
    const queries = await HospitalQuery.find({ userId: req.user.userId })
      .populate('acceptedByHospitalId', 'hospitalName contactNumber address')
      .sort({ createdAt: -1 });

    res.json(queries);
  } catch (error) {
    console.error('Error fetching queries:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single query by ID
router.get('/:queryId', auth, async (req, res) => {
  try {
    const { queryId } = req.params;
    
    const query = await HospitalQuery.findById(queryId)
      .populate('userId', 'name email')
      .populate('acceptedByHospitalId', 'hospitalName contactNumber address');

    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    // Verify user has access to this query
    const hospital = await Hospital.findOne({ userId: req.user.userId });
    const isHospital = !!hospital;
    const isQueryOwner = query.userId._id.toString() === req.user.userId.toString();

    if (!isQueryOwner && !isHospital) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(query);
  } catch (error) {
    console.error('Error fetching query:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get nearby hospitals
router.post('/nearby-hospitals', auth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.body;

    const hospitals = await Hospital.find({
      isActive: true,
      isVerified: true
    });

    if (!latitude || !longitude) {
      return res.json(hospitals);
    }

    // Filter by distance
    const nearbyHospitals = hospitals.filter(hospital => {
      if (!hospital.latitude || !hospital.longitude) return false;

      const distance = calculateDistance(
        latitude,
        longitude,
        hospital.latitude,
        hospital.longitude
      );

      return distance <= radius;
    }).map(hospital => ({
      ...hospital.toObject(),
      distance: calculateDistance(
        latitude,
        longitude,
        hospital.latitude,
        hospital.longitude
      ).toFixed(2)
    })).sort((a, b) => a.distance - b.distance);

    res.json(nearbyHospitals);
  } catch (error) {
    console.error('Error fetching nearby hospitals:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
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
