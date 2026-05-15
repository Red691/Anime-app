// src/controllers/animeController.js
const Anime = require('../models/Anime');
const Episode = require('../models/Episode');
const WatchHistory = require('../models/WatchHistory');
const Favorite = require('../models/Favorite');
const Rating = require('../models/Rating');
const cache = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Advanced anime listing with filtering, sorting, and pagination
 */
exports.getAnimeList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = 'popularity',
      order = 'desc',
      status,
      type,
      genre,
      year,
      season,
      search,
      isPremium
    } = req.query;

    // Build cache key
    const cacheKey = `anime:list:${Buffer.from(JSON.stringify(req.query)).toString('base64')}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, fromCache: true });
    }

    // Build query
    const query = { isActive: true };
    
    if (status) query.status = status;
    if (type) query.type = type;
    if (genre) query.genres = genre;
    if (year) query['season.year'] = parseInt(year);
    if (season) query['season.name'] = season;
    if (isPremium !== undefined) query.isPremium = isPremium === 'true';
    if (search) {
      query.$text = { $search: search };
    }

    // Sorting configuration
    const sortOptions = {};
    const allowedSorts = ['popularity', 'averageRating', 'createdAt', 'title', 'totalViews'];
    const sortField = allowedSorts.includes(sort) ? sort : 'popularity';
    sortOptions[sortField] = order === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [anime, total] = await Promise.all([
      Anime.find(query)
        .populate('genres', 'name slug color')
        .select('-__v')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Anime.countDocuments(query)
    ]);

    const result = {
      data: anime,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasMore: skip + anime.length < total
      }
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, result, 300);
    
    res.json({ success: true, ...result });
    
  } catch (error) {
    logger.error('Get anime list error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch anime list' });
  }
};

/**
 * Get single anime with episodes and user-specific data
 */
exports.getAnimeDetails = async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?._id;

    const cacheKey = `anime:details:${slug}:${userId || 'guest'}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const anime = await Anime.findOne({ slug, isActive: true })
      .populate('genres', 'name slug color icon')
      .lean();

    if (!anime) {
      return res.status(404).json({ success: false, message: 'Anime not found' });
    }

    // Get episodes
    const episodes = await Episode.find({ anime: anime._id, status: 'released' })
      .select('number title thumbnail duration synopsis releaseDate isFiller introStart introEnd')
      .sort({ number: 1 })
      .lean();

    // Get user-specific data if authenticated
    let userData = null;
    if (userId) {
      const [isFavorite, userRating, watchProgress] = await Promise.all([
        Favorite.exists({ user: userId, anime: anime._id }),
        Rating.findOne({ user: userId, anime: anime._id }).select('score review').lean(),
        WatchHistory.find({ user: userId, anime: anime._id })
          .select('episode progress completed completionPercentage')
          .lean()
      ]);

      userData = {
        isFavorite: !!isFavorite,
        userRating,
        watchProgress: watchProgress.reduce((acc, curr) => {
          acc[curr.episode.toString()] = curr;
          return acc;
        }, {})
      };
    }

    const result = {
      anime,
      episodes,
      userData,
      meta: {
        totalEpisodes: episodes.length,
        airedEpisodes: episodes.filter(e => e.status === 'released').length
      }
    };

    await cache.set(cacheKey, result, 600);  // Cache 10 minutes
    
    res.json({ success: true, data: result });
    
  } catch (error) {
    logger.error('Get anime details error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch anime details' });
  }
};

/**
 * Get trending anime (calculated by popularity algorithm)
 */
exports.getTrending = async (req, res) => {
  try {
    const { limit = 10, period = 'week' } = req.query;
    
    const cacheKey = `anime:trending:${period}:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    let dateFilter = new Date();
    if (period === 'day') dateFilter.setDate(dateFilter.getDate() - 1);
    else if (period === 'week') dateFilter.setDate(dateFilter.getDate() - 7);
    else if (period === 'month') dateFilter.setMonth(dateFilter.getMonth() - 1);

    // Aggregate trending based on recent watch history and ratings
    const trending = await WatchHistory.aggregate([
      {
        $match: {
          lastWatched: { $gte: dateFilter }
        }
      },
      {
        $group: {
          _id: '$anime',
          watchCount: { $sum: 1 },
          avgProgress: { $avg: '$completionPercentage' }
        }
      },
      {
        $lookup: {
          from: 'animes',
          localField: '_id',
          foreignField: '_id',
          as: 'anime'
        }
      },
      { $unwind: '$anime' },
      { $match: { 'anime.isActive': true } },
      {
        $project: {
          _id: '$anime._id',
          title: '$anime.title',
          slug: '$anime.slug',
          coverImage: '$anime.coverImage',
          bannerImage: '$anime.bannerImage',
          averageRating: '$anime.averageRating',
          type: '$anime.type',
          status: '$anime.status',
          watchCount: 1,
          trendingScore: {
            $multiply: [
              '$watchCount',
              { $add: [1, { $divide: ['$avgProgress', 100] }] }
            ]
          }
        }
      },
      { $sort: { trendingScore: -1 } },
      { $limit: parseInt(limit) }
    ]);

    await cache.set(cacheKey, trending, 1800);  // Cache 30 minutes
    
    res.json({ success: true, data: trending });
    
  } catch (error) {
    logger.error('Get trending error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trending anime' });
  }
};

/**
 * Get latest released episodes across all anime
 */
exports.getLatestEpisodes = async (req, res) => {
  try {
    const { limit = 12, page = 1 } = req.query;
    const cacheKey = `anime:latest:${page}:${limit}`;
    
    const cached = await cache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const episodes = await Episode.find({ status: 'released' })
      .populate({
        path: 'anime',
        select: 'title slug coverImage type status'
      })
      .select('number title thumbnail duration releaseDate anime')
      .sort({ releaseDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    await cache.set(cacheKey, episodes, 300);
    
    res.json({ success: true, data: episodes });
    
  } catch (error) {
    logger.error('Get latest episodes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch latest episodes' });
  }
};

/**
 * Create new anime (Admin only)
 */
exports.createAnime = async (req, res) => {
  try {
    const animeData = req.body;
    
    // Upload images to Cloudinary if provided as base64 or URLs
    if (animeData.coverImage && animeData.coverImage.startsWith('data:')) {
      // Cloudinary upload logic here
    }

    const anime = await Anime.create(animeData);
    
    // Invalidate relevant caches
    await cache.delete('anime:list:*');
    
    res.status(201).json({ 
      success: true, 
      message: 'Anime created successfully',
      data: anime 
    });
    
  } catch (error) {
    logger.error('Create anime error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ 
        success: false, 
        message: 'Anime with this title already exists' 
      });
    }
    res.status(500).json({ success: false, message: 'Failed to create anime' });
  }
};

/**
 * Update anime (Admin only)
 */
exports.updateAnime = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Prevent changing immutable fields
    delete updates.createdAt;
    delete updates.slug;  // Slug auto-generated from title
    
    const anime = await Anime.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!anime) {
      return res.status(404).json({ success: false, message: 'Anime not found' });
    }

    // Invalidate caches
    await cache.delete(`anime:details:${anime.slug}:*`);
    await cache.delete('anime:list:*');
    await cache.delete('anime:trending:*');

    res.json({ 
      success: true, 
      message: 'Anime updated successfully',
      data: anime 
    });
    
  } catch (error) {
    logger.error('Update anime error:', error);
    res.status(500).json({ success: false, message: 'Failed to update anime' });
  }
};

/**
 * Delete anime (Admin only)
 */
exports.deleteAnime = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Soft delete - set isActive to false
    const anime = await Anime.findByIdAndUpdate(id, { 
      isActive: false,
      updatedAt: new Date()
    });

    if (!anime) {
      return res.status(404).json({ success: false, message: 'Anime not found' });
    }

    // Cascade: mark episodes as unavailable
    await Episode.updateMany({ anime: id }, { status: 'unavailable' });

    // Invalidate caches
    await cache.delete(`anime:details:${anime.slug}:*`);
    await cache.delete('anime:list:*');

    res.json({ success: true, message: 'Anime deleted successfully' });
    
  } catch (error) {
    logger.error('Delete anime error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete anime' });
  }
};
