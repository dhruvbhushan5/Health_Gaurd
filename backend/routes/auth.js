const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { cache, invalidateCache } = require('../middleware/cache');
const { validatePasswordStrength } = require('../utils/encryption');
const redisClient = require('../config/redis');

const router = express.Router();

// Test endpoint to verify routing works
router.get('/test', (req, res) => {
  res.json({ message: 'Auth route is working!', path: req.path, originalUrl: req.originalUrl });
});

// Helper function to warm cache with user data
const warmCache = async (userId, userData) => {
  try {
    if (redisClient && redisClient.isConnected && redisClient.client) {
      const cacheKey = `user:${userId}:profile`;
      await redisClient.client.set(cacheKey, JSON.stringify(userData), { EX: 3600 }); // 1 hour
      console.log(`✅ Warmed cache for user ${userId}`);
    }
  } catch (error) {
    console.warn('⚠️ Failed to warm cache:', error.message);
  }
};

// Register a new user
router.post('/register', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    console.log('📝 Registration attempt:', { email: req.body.email, name: req.body.name });

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password } = req.body;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      console.log('❌ Weak password:', passwordValidation);
      return res.status(400).json({
        message: 'Password is too weak',
        strength: passwordValidation.strength,
        suggestions: passwordValidation.suggestions
      });
    }

    // Check if user already exists
    console.log('🔍 Checking for existing user with email:', email);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ User already exists');
      return res.status(400).json({
        message: 'User with this email already exists'
      });
    }

    // Create new user
    console.log('✨ Creating new user...');
    const user = new User({
      name,
      email,
      password
    });

    await user.save();
    console.log('✅ User created successfully:', email);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 🎯 REDIS SESSION MANAGEMENT (Registration)
    // Store session in Redis with TTL (7 days = 604800 seconds)
    if (redisClient && redisClient.isConnected) {
      try {
        await redisClient.setSession(user._id, token, 604800);
        // Warm cache with user data for better performance
        await warmCache(user._id, user);
      } catch (error) {
        console.warn('⚠️ Failed to store session in Redis:', error.message);
      }
    }

    // Store session in Redis (legacy - keeping for compatibility)
    if (redisClient && redisClient.isConnected && redisClient.client) {
      try {
        await redisClient.client.set(
          `session:legacy:${user._id}`,
          JSON.stringify({ userId: user._id, loginTime: new Date() }),
          { EX: 604800 } // 7 days in seconds
        );
      } catch (error) {
        console.warn('⚠️ Failed to store legacy session:', error.message);
      }
    }

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Handle specific MongoDB errors
    if (error.name === 'MongooseError' || error.name === 'MongoNetworkError') {
      return res.status(500).json({
        message: 'Database connection error. Please ensure MongoDB is running.',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Database unavailable'
      });
    }

    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'User with this email already exists'
      });
    }

    res.status(500).json({
      message: 'Internal server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// Login user
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .exists()
    .withMessage('Password is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    console.log('🔍 Login attempt for email:', email);

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    console.log('✅ User found, checking password...');
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    console.log('🔐 Password validation result:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('❌ Password validation failed for user:', email);
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    console.log('✅ Login successful for user:', email);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 🎯 REDIS SESSION MANAGEMENT (Login)
    // Store session in Redis with TTL (7 days = 604800 seconds)
    if (redisClient && redisClient.isConnected) {
      try {
        await redisClient.setSession(user._id, token, 604800);
        // Warm cache with user data for better performance
        await warmCache(user._id, user);
      } catch (error) {
        console.warn('⚠️ Failed to store session in Redis:', error.message);
      }
    }

    // Store session in Redis (legacy - keeping for compatibility)
    if (redisClient && redisClient.isConnected && redisClient.client) {
      try {
        await redisClient.client.set(
          `session:legacy:${user._id}`,
          JSON.stringify({ userId: user._id, loginTime: new Date() }),
          { EX: 604800 } // 7 days in seconds
        );
      } catch (error) {
        console.warn('⚠️ Failed to store legacy session:', error.message);
      }
    }

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        message: 'Invalid token'
      });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      message: 'Invalid token'
    });
  }
});

// Logout user (cleanup session and cache)
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // 🎯 REDIS SESSION CLEANUP
    // Delete session using new Redis methods
    await redisClient.deleteSession(userId);

    // Clean up Redis session and cache (legacy)
    if (redisClient.isConnected) {
      const sessionKey = `session:legacy:${userId}`;
      const cacheKey = `user:${userId}:profile`;
      const healthKey = `healthData:${userId}`;

      await redisClient.del(sessionKey);
      await redisClient.del(cacheKey);
      await redisClient.del(healthKey);
      console.log(`✅ Cleaned up all sessions and cache for user ${userId}`);
    }

    // Invalidate related caches
    await invalidateCache([
      `user:${userId}:*`,
      `health:${userId}:*`,
      `meals:${userId}:*`
    ]);

    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      message: 'Error during logout',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

module.exports = router;
