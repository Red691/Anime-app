// src/controllers/userController.js
const User = require('../models/User');
const WatchHistory = require('../models/WatchHistory');
const Favorite = require('../models/Favorite');
const Rating = require('../models/Rating');
const cache = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Get current user profile
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -refreshTokens -loginHistory')
      .lean();
    
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const { displayName, bio, avatar, preferences } = req.body;
    
    const updates = {};
    if (displayName) updates.displayName = displayName.trim();
    if (bio !== undefined) updates.bio = bio;
    if (avatar) updates.avatar = avatar;
    if (preferences) updates.preferences = { ...req.user.preferences, ...preferences };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password -refreshTokens -loginHistory');

    // Update cache
    await cache.delete(`user:${req.user.firebaseUid}`);
    
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

/**
 * Get user's watch history
 */
exports.getWatchHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const history = await WatchHistory.find({ user: userId })
      .populate('anime', 'title slug coverImage type')
      .populate('episode', 'number title thumbnail duration')
      .sort({ lastWatched: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await WatchHistory.countDocuments({ user: userId });

    res.json({
      success: true,
      data: history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Get watch history error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch watch history' });
  }
};

/**
 * Toggle favorite anime
 */
exports.toggleFavorite = async (req, res) => {
  try {
    const { animeId } = req.body;
    const userId = req.user._id;

    const existing = await Favorite.findOne({ user: userId, anime: animeId });

    if (existing) {
      await Favorite.deleteOne({ _id: existing._id });
      res.json({ success: true, message: 'Removed from favorites', isFavorite: false });
    } else {
      await Favorite.create({ user: userId, anime: animeId });
      res.json({ success: true, message: 'Added to favorites', isFavorite: true });
    }
  } catch (error) {
    logger.error('Toggle favorite error:', error);
    res.status(500).json({ success: false, message: 'Failed to update favorites' });
  }
};

/**
 * Get user's favorites
 */
exports.getFavorites = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const favorites = await Favorite.find({ user: userId })
      .populate({
        path: 'anime',
        select: 'title slug coverImage averageRating type status',
        match: { isActive: true }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const validFavorites = favorites.filter(f => f.anime !== null);

    res.json({
      success: true,
      data: validFavorites,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: validFavorites.length
      }
    });
  } catch (error) {
    logger.error('Get favorites error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch favorites' });
  }
};

/**
 * Rate anime
 */
exports.rateAnime = async (req, res) => {
  try {
    const { animeId, score, review, isSpoiler } = req.body;
    const userId = req.user._id;

    if (score < 1 || score > 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'Score must be between 1 and 10' 
      });
    }

    const rating = await Rating.findOneAndUpdate(
      { user: userId, anime: animeId },
      { score, review, isSpoiler, updatedAt: new Date() },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ success: true, data: rating });
  } catch (error) {
    logger.error('Rate anime error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit rating' });
  }
};

/**
 * Sync with MyAnimeList
 */
exports.syncMal = async (req, res) => {
  try {
    const { malUsername } = req.body;
    
    // In production, integrate with MAL API
    // For now, store username for future sync
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { malUsername, updatedAt: new Date() },
      { new: true }
    ).select('malUsername');

    res.json({ 
      success: true, 
      message: 'MAL username saved. Full sync will be processed in background.',
      data: user 
    });
  } catch (error) {
    logger.error('MAL sync error:', error);
    res.status(500).json({ success: false, message: 'Failed to sync MAL' });
  }
};
