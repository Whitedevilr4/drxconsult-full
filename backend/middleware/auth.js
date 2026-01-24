const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is not suspended
    const user = await User.findById(decoded.userId).select('isSuspended suspensionReason role');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Check if user is suspended (except for admin routes)
    if (user.isSuspended && !req.path.includes('/admin/')) {
      return res.status(403).json({ 
        message: 'Account suspended', 
        reason: user.suspensionReason,
        suspended: true 
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const isPharmacist = (req, res, next) => {
  if (req.user.role !== 'pharmacist' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Pharmacist only.' });
  }
  next();
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

module.exports = { auth, isPharmacist, isAdmin };
