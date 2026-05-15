// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { standardLimiter } = require('../middleware/security');

router.get('/profile', standardLimiter, authenticate, userController.getProfile);
router.put('/profile', standardLimiter, authenticate, userController.updateProfile);
router.get('/history', standardLimiter, authenticate, userController.getWatchHistory);
router.post('/favorites', standardLimiter, authenticate, userController.toggleFavorite);
router.get('/favorites', standardLimiter, authenticate, userController.getFavorites);
router.post('/rate', standardLimiter, authenticate, userController.rateAnime);
router.post('/sync-mal', standardLimiter, authenticate, userController.syncMal);

module.exports = router;

