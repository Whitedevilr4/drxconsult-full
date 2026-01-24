const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { sendPasswordResetEmail } = require('../utils/emailService');
const { createAndSendOTP, verifyOTP, getOTPStatus } = require('../utils/otpService');
const { admin, isFirebaseInitialized, getFirebaseAuth } = require('../config/firebase-admin');

const router = express.Router();

// Step 1: Request OTP for signup (email verification)
router.post('/signup/request-otp', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('name').notEmpty().withMessage('Name is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, name } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'An account with this email already exists. Please login instead.',
        userExists: true
      });
    }

    // Create and send OTP
    const otpResult = await createAndSendOTP(email, 'signup', name);
    
    if (!otpResult.success) {
      return res.status(400).json({ 
        message: otpResult.error,
        rateLimited: otpResult.rateLimited,
        waitTime: otpResult.waitTime
      });
    }

    res.json({
      message: 'OTP sent to your email address',
      expiresAt: otpResult.expiresAt,
      attemptsLeft: otpResult.attemptsLeft,
      resendsLeft: otpResult.resendsLeft
    });

  } catch (err) {
    console.error('Request OTP error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Step 2: Verify OTP and complete signup
router.post('/signup/verify-otp', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().withMessage('Name is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, otp, password, name, phone } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'An account with this email already exists.',
        userExists: true
      });
    }

    // Verify OTP
    const otpResult = await verifyOTP(email, otp, 'signup');
    
    if (!otpResult.success) {
      return res.status(400).json({ 
        message: otpResult.error,
        rateLimited: otpResult.rateLimited,
        attemptsLeft: otpResult.attemptsLeft,
        expired: otpResult.expired,
        invalidOTP: otpResult.invalidOTP
      });
    }

    // OTP verified - create user account
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ 
      name, 
      email, 
      password: hashedPassword, 
      phone, 
      role: 'patient',
      isEmailVerified: true,
      emailVerifiedAt: new Date()
    });
    
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
      message: 'Account created successfully!',
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        isEmailVerified: user.isEmailVerified
      } 
    });

  } catch (err) {
    console.error('Verify OTP signup error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Resend OTP for signup
router.post('/signup/resend-otp', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('name').notEmpty().withMessage('Name is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, name } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'An account with this email already exists.',
        userExists: true
      });
    }

    // Resend OTP
    const otpResult = await createAndSendOTP(email, 'signup', name);
    
    if (!otpResult.success) {
      return res.status(400).json({ 
        message: otpResult.error,
        rateLimited: otpResult.rateLimited,
        waitTime: otpResult.waitTime
      });
    }

    res.json({
      message: 'OTP resent to your email address',
      expiresAt: otpResult.expiresAt,
      attemptsLeft: otpResult.attemptsLeft,
      resendsLeft: otpResult.resendsLeft
    });

  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get OTP status
router.get('/signup/otp-status/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    const status = await getOTPStatus(email, 'signup');
    res.json(status);

  } catch (err) {
    console.error('Get OTP status error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Original signup route (kept for backward compatibility but now requires OTP)
router.post('/signup', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty()
], async (req, res) => {
  res.status(400).json({ 
    message: 'Email verification is required for new accounts. Please use the OTP verification process.',
    requiresOTP: true
  });
});

// Login (Patient & Pharmacist) - Only verified users
router.post('/login', [
  body('email').notEmpty().withMessage('Email/Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if email is verified (for patients)
    if (user.role === 'patient' && !user.isEmailVerified) {
      // Auto-verify existing users (created before OTP system was implemented)
      // This ensures backward compatibility for existing accounts
      
      user.isEmailVerified = true;
      user.emailVerifiedAt = new Date();
      await user.save();
      
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        isEmailVerified: user.isEmailVerified
      } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Forgot Password
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Send reset email
    const emailResult = await sendPasswordResetEmail(email, resetToken, user.name);
    
    if (emailResult.success) {
      res.json({ message: 'Password reset link has been sent to your email.' });
    } else {
      console.error('Failed to send reset email:', emailResult.error);
      res.status(500).json({ message: 'Failed to send reset email. Please try again.' });
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Reset Password
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { token, password } = req.body;
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update user password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset successfully. You can now login with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Firebase Authentication Routes

// Firebase Login
router.post('/firebase-login', [
  body('idToken').notEmpty().withMessage('Firebase ID token is required'),
  body('userData').isObject().withMessage('User data is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { idToken, userData } = req.body;
    
    // Check if Firebase is properly initialized
    if (!isFirebaseInitialized()) {
      return res.status(503).json({ 
        message: 'Firebase authentication is not configured. Please use email/password login.',
        firebaseNotConfigured: true
      });
    }
    
    // Verify Firebase ID token
    let decodedToken;
    try {
      const firebaseAuth = getFirebaseAuth();
      decodedToken = await firebaseAuth.verifyIdToken(idToken);
    } catch (firebaseError) {
      console.error('Firebase token verification error:', firebaseError);
      return res.status(401).json({ message: 'Invalid Firebase token' });
    }
    
    const { email, uid } = decodedToken;
    
    // Check if user exists
    let user = await User.findOne({ 
      $or: [
        { email: email },
        { firebaseUid: uid }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ 
        message: 'Account not found. Please sign up first.',
        requiresSignup: true 
      });
    }
    
    // Update Firebase UID if not set
    if (!user.firebaseUid) {
      user.firebaseUid = uid;
      user.isEmailVerified = true; // Firebase emails are pre-verified
      await user.save();
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        firebaseUid: user.firebaseUid
      } 
    });
    
  } catch (err) {
    console.error('Firebase login error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Firebase Signup
router.post('/firebase-signup', [
  body('idToken').notEmpty().withMessage('Firebase ID token is required'),
  body('userData').isObject().withMessage('User data is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { idToken, userData } = req.body;
    
    // Check if Firebase is properly initialized
    if (!isFirebaseInitialized()) {
      return res.status(503).json({ 
        message: 'Firebase authentication is not configured. Please use email/password signup.',
        firebaseNotConfigured: true
      });
    }
    
    // Verify Firebase ID token
    let decodedToken;
    try {
      const firebaseAuth = getFirebaseAuth();
      decodedToken = await firebaseAuth.verifyIdToken(idToken);
    } catch (firebaseError) {
      console.error('Firebase token verification error:', firebaseError);
      return res.status(401).json({ message: 'Invalid Firebase token' });
    }
    
    const { email, uid, email_verified } = decodedToken;
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: email },
        { firebaseUid: uid }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'An account with this email already exists. Please login instead.',
        userExists: true
      });
    }
    
    // Create new user account
    const user = new User({ 
      name: userData.name || userData.displayName || 'User',
      email: email,
      firebaseUid: uid,
      role: 'patient',
      isEmailVerified: email_verified || true, // Firebase emails are typically verified
      emailVerifiedAt: new Date(),
      profilePicture: userData.photoURL || null
    });
    
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
      message: 'Account created successfully!',
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        firebaseUid: user.firebaseUid,
        profilePicture: user.profilePicture
      } 
    });
    
  } catch (err) {
    console.error('Firebase signup error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
