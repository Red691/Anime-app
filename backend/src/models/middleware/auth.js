// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const User = require('../models/User');
const cache = require('../config/redis');
const logger = require('../utils/logger');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    })
  });
}

/**
 * Verify Firebase ID Token and sync with local user database
 * Supports both Firebase Auth and custom JWT strategies
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.substring(7);
    
    // Try Firebase verification first
    let decodedToken;
    let authStrategy = 'firebase';
    
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (firebaseError) {
      // Fallback to custom JWT
      try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        authStrategy = 'jwt';
      } catch (jwtError) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid or expired token.' 
        });
      }
    }

    // Check cache first
    const cacheKey = `user:${decodedToken.uid || decodedToken.id}`;
    let user = await cache.get(cacheKey);
    
    if (!user) {
      // Find or create user in database
      const firebaseUid = decodedToken.uid || decodedToken.id;
      user = await User.findOne({ firebaseUid }).select('-password -refreshTokens');
      
      if (!user) {
        // Auto-create user if not exists (Firebase auth flow)
        if (authStrategy === 'firebase') {
          user = await User.create({
            firebaseUid,
            email: decodedToken.email,
            displayName: decodedToken.name || decodedToken.email.split('@')[0],
            avatar: decodedToken.picture || null,
            authProvider: 'google',
            lastLogin: new Date()
          });
        } else {
          return res.status(401).json({ 
            success: false, 
            message: 'User not found.' 
          });
        }
      }
      
      // Cache user for 1 hour
      await cache.set(cacheKey, user, 3600);
    }

    // Check if user is banned
    if (user.isBanned) {
      if (user.bannedUntil && user.bannedUntil > new Date()) {
        return res.status(403).json({
          success: false,
          message: `Account suspended until ${user.bannedUntil.toISOString()}. Reason: ${user.banReason || 'Violation of terms'}`
        });
      } else if (!user.bannedUntil) {
        return res.status(403).json({
          success: false,
          message: `Account permanently suspended. Reason: ${user.banReason || 'Violation of terms'}`
        });
      }
    }

    // Attach user to request
    req.user = user;
    req.authStrategy = authStrategy;
    
    // Update last login (async, don't wait)
    User.findByIdAndUpdate(user._id, { 
      lastLogin: new Date(),
      $push: { 
        loginHistory: { 
          ip: req.ip, 
          device: req.headers['user-agent'],
          timestamp: new Date()
        } 
      }
    }).catch(err => logger.error('Login history update failed:', err));

    next();
    
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error.' 
    });
  }
};

/**
 * Role-based access control
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions.' 
      });
    }
    
    next();
  };
};

/**
 * Optional auth - doesn't fail if no token, but attaches user if valid
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(token);
    const user = await User.findOne({ firebaseUid: decodedToken.uid }).select('-password -refreshTokens');
    
    if (user && !user.isBanned) {
      req.user = user;
    }
    next();
  } catch {
    next();
  }
};

module.exports = { authenticate, authorize, optionalAuth };
