const express = require('express');
const User = require('../models/User');
const Pharmacist = require('../models/Pharmacist');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    
    let profile = { user };
    
    if (user.role === 'pharmacist' || user.role === 'admin') {
      const pharmacist = await Pharmacist.findOne({ userId: user._id });
      profile.pharmacist = pharmacist;
    }
    
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update profile picture
router.put('/picture', auth, async (req, res) => {
  try {
    const { profilePicture } = req.body;
    
    const user = await User.findById(req.user.userId);
    user.profilePicture = profilePicture;
    await user.save();

    // If pharmacist, also update pharmacist photo
    if (user.role === 'pharmacist' || user.role === 'admin') {
      await Pharmacist.updateOne(
        { userId: user._id },
        { $set: { photo: profilePicture } }
      );
    }

    res.json({
      message: 'Profile picture updated successfully',
      profilePicture
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update profile details
router.put('/', auth, async (req, res) => {
  try {
    const { name, phone } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (name) user.name = name;
    if (phone) user.phone = phone;
    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
