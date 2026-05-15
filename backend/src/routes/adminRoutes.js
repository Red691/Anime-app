

// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const { standardLimiter } = require('../middleware/security');

router.get('/dashboard', standardLimiter, authenticate, authorize('admin', 'superadmin', 'moderator'), adminController.getDashboardStats);
router.get('/users', standardLimiter, authenticate, authorize('admin', 'superadmin'), adminController.getUsers);
router.put('/users/:userId', standardLimiter, authenticate, authorize('admin', 'superadmin'), adminController.updateUserStatus);
router.get('/moderation', standardLimiter, authenticate, authorize('moderator', 'admin', 'superadmin'), adminController.getCommentsForModeration);

module.exports = router;
