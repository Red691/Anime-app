

// src/routes/episodeRoutes.js
const express = require('express');
const router = express.Router();
const episodeController = require('../controllers/episodeController');
const { authenticate, authorize } = require('../middleware/auth');
const { standardLimiter, streamingLimiter } = require('../middleware/security');

router.get('/:animeSlug/:episodeNumber', standardLimiter, authenticate, episodeController.getEpisode);
router.post('/:episodeId/progress', streamingLimiter, authenticate, episodeController.updateProgress);
router.get('/continue-watching', standardLimiter, authenticate, episodeController.getContinueWatching);
router.post('/', authenticate, authorize('admin', 'superadmin'), episodeController.createEpisode);

module.exports = router;

