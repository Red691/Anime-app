// src/controllers/episodeController.js
const Episode = require('../models/Episode');
const Anime = require('../models/Anime');
const WatchHistory = require('../models/WatchHistory');
const cache = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Get episode details with streaming sources
 */
exports.getEpisode = async (req, res) => {
  try {
    const { animeSlug, episodeNumber } = req.params;
    const userId = req.user?._id;

    // Find anime first
    const anime = await Anime.findOne({ slug: animeSlug, isActive: true }).lean();
    if (!anime) {
      return res.status(404).json({ success: false, message: 'Anime not found' });
    }

    const episode = await Episode.findOne({ 
      anime: anime._id, 
      number: parseInt(episodeNumber),
      status: { $ne: 'unavailable' }
    }).lean();

    if (!episode) {
      return res.status(404).json({ success: false, message: 'Episode not found' });
    }

    // Get user's watch progress
    let watchProgress = null;
    if (userId) {
      watchProgress = await WatchHistory.findOne({
        user: userId,
        anime: anime._id,
        episode: episode._id
      }).select('progress duration completed completionPercentage').lean();
    }

    // Get adjacent episodes for navigation
    const [prevEpisode, nextEpisode] = await Promise.all([
      Episode.findOne({ 
        anime: anime._id, 
        number: { $lt: episode.number },
        status: 'released'
      })
        .select('number title thumbnail')
        .sort({ number: -1 })
        .lean(),
      Episode.findOne({ 
        anime: anime._id, 
        number: { $gt: episode.number },
        status: 'released'
      })
        .select('number title thumbnail')
        .sort({ number: 1 })
        .lean()
    ]);

    // Increment view count (async, don't wait)
    Episode.findByIdAndUpdate(episode._id, { $inc: { views: 1 } }).catch(err => 
      logger.error('View count update failed:', err)
    );

    res.json({
      success: true,
      data: {
        episode,
        anime: {
          id: anime._id,
          title: anime.title,
          slug: anime.slug,
          coverImage: anime.coverImage
        },
        watchProgress,
        navigation: {
          previous: prevEpisode,
          next: nextEpisode
        }
      }
    });
    
  } catch (error) {
    logger.error('Get episode error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch episode' });
  }
};

/**
 * Update watch progress (called periodically by video player)
 */
exports.updateProgress = async (req, res) => {
  try {
    const { episodeId } = req.params;
    const { progress, duration, quality, subtitleLanguage, playbackSpeed, device } = req.body;
    const userId = req.user._id;

    if (!progress || !duration) {
      return res.status(400).json({ 
        success: false, 
        message: 'Progress and duration are required' 
      });
    }

    const episode = await Episode.findById(episodeId).select('anime duration').lean();
    if (!episode) {
      return res.status(404).json({ success: false, message: 'Episode not found' });
    }

    // Upsert watch history
    const watchHistory = await WatchHistory.findOneAndUpdate(
      { user: userId, anime: episode.anime, episode: episodeId },
      {
        $set: {
          progress: Math.min(progress, duration),
          duration: duration || episode.duration,
          quality: quality || 'auto',
          subtitleLanguage: subtitleLanguage || 'en',
          playbackSpeed: playbackSpeed || 1.0,
          device: device || 'mobile'
        },
        $setOnInsert: {
          user: userId,
          anime: episode.anime,
          episode: episodeId
        }
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: {
        progress: watchHistory.progress,
        completed: watchHistory.completed,
        completionPercentage: watchHistory.completionPercentage
      }
    });
    
  } catch (error) {
    logger.error('Update progress error:', error);
    res.status(500).json({ success: false, message: 'Failed to update progress' });
  }
};

/**
 * Get continue watching list for user
 */
exports.getContinueWatching = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 10 } = req.query;

    const cacheKey = `continue:${userId}:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const history = await WatchHistory.find({ 
      user: userId,
      completed: false,
      completionPercentage: { $gt: 5, $lt: 90 }  // Started but not finished
    })
      .populate({
        path: 'anime',
        select: 'title slug coverImage type status'
      })
      .populate({
        path: 'episode',
        select: 'number title thumbnail duration'
      })
      .sort({ lastWatched: -1 })
      .limit(parseInt(limit))
      .lean();

    await cache.set(cacheKey, history, 60);  // Short cache due to frequent updates
    
    res.json({ success: true, data: history });
    
  } catch (error) {
    logger.error('Get continue watching error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch continue watching' });
  }
};

/**
 * Create episode (Admin only)
 */
exports.createEpisode = async (req, res) => {
  try {
    const episodeData = req.body;
    
    // Validate anime exists
    const anime = await Anime.findById(episodeData.anime);
    if (!anime) {
      return res.status(404).json({ success: false, message: 'Anime not found' });
    }

    const episode = await Episode.create(episodeData);
    
    // Update anime episode count
    await Anime.findByIdAndUpdate(episodeData.anime, {
      $inc: { episodesCount: 1 }
    });

    // Invalidate caches
    await cache.delete(`anime:details:${anime.slug}:*`);
    await cache.delete('anime:latest:*');

    res.status(201).json({
      success: true,
      message: 'Episode created successfully',
      data: episode
    });
    
  } catch (error) {
    logger.error('Create episode error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ 
        success: false, 
        message: 'Episode number already exists for this anime' 
      });
    }
    res.status(500).json({ success: false, message: 'Failed to create episode' });
  }
};
