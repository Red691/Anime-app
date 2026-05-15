// src/routes/animeRoutes.js
const express = require('express');
const router = express.Router();
const animeController = require('../controllers/animeController');
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');
const { standardLimiter, validate, validators } = require('../middleware/security');
const { query } = require('express-validator');

// Public routes
router.get('/', standardLimiter, animeController.getAnimeList);
router.get('/trending', standardLimiter, animeController.getTrending);
router.get('/latest', standardLimiter, animeController.getLatestEpisodes);
router.get('/search', standardLimiter, [
  query('q').trim().isLength({ min: 2 }).withMessage('Search query must be at least 2 characters')
], validate, animeController.getAnimeList);
router.get('/:slug', standardLimiter, optionalAuth, animeController.getAnimeDetails);

// Protected admin routes
router.post('/', authenticate, authorize('admin', 'superadmin'), animeController.createAnime);
router.put('/:id', authenticate, authorize('admin', 'superadmin'), animeController.updateAnime);
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), animeController.deleteAnime);

module.exports = router;

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
