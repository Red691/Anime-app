// src/controllers/adminController.js
const User = require('../models/User');
const Anime = require('../models/Anime');
const Episode = require('../models/Episode');
const Rating = require('../models/Rating');
const WatchHistory = require('../models/WatchHistory');
const logger = require('../utils/logger');

/**
 * Dashboard analytics
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      newUsersToday,
      totalAnime,
      totalEpisodes,
      totalViews,
      viewsToday,
      activeUsers,
      premiumUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      Anime.countDocuments(),
      Episode.countDocuments(),
      WatchHistory.aggregate([{ $group: { _id: null, total: { $sum: '$progress' } } }]),
      WatchHistory.countDocuments({ lastWatched: { $gte: today } }),
      User.countDocuments({ lastLogin: { $gte: new Date(now - 24 * 60 * 60 * 1000) } }),
      User.countDocuments({ 'preferences.isPremium': true })  // If you add premium flag
    ]);

    // Top anime by views this month
    const topAnime = await WatchHistory.aggregate([
      { $match: { lastWatched: { $gte: thisMonth } } },
      {
        $group: {
          _id: '$anime',
          totalViews: { $sum: 1 },
          avgCompletion: { $avg: '$completionPercentage' }
        }
      },
      { $sort: { totalViews: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'animes',
          localField: '_id',
          foreignField: '_id',
          as: 'anime'
        }
      },
      { $unwind: '$anime' },
      {
        $project: {
          title: '$anime.title',
          coverImage: '$anime.coverImage',
          totalViews: 1,
          avgCompletion: { $round: ['$avgCompletion', 1] }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          newUsersToday,
          totalAnime,
          totalEpisodes,
          totalViews: totalViews[0]?.total || 0,
          viewsToday,
          activeUsers,
          premiumUsers
        },
        topAnime,
        serverHealth: {
          status: 'healthy',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    logger.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
};

/**
 * Get all users with filtering (Admin/Mod only)
 */
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, role, isBanned, sort = 'createdAt' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (search) {
      query.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) query.role = role;
    if (isBanned !== undefined) query.isBanned = isBanned === 'true';

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -refreshTokens')
        .sort({ [sort]: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

/**
 * Ban/unban user
 */
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isBanned, banReason, bannedUntil, role } = req.body;

    const updates = { updatedAt: new Date() };
    if (isBanned !== undefined) updates.isBanned = isBanned;
    if (banReason) updates.banReason = banReason;
    if (bannedUntil) updates.bannedUntil = new Date(bannedUntil);
    if (role) updates.role = role;

    const user = await User.findByIdAndUpdate(userId, updates, { new: true })
      .select('-password -refreshTokens');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // If banning, invalidate all their sessions
    if (isBanned) {
      await cache.delete(`user:${user.firebaseUid}`);
      // Also clear refresh tokens
      await User.findByIdAndUpdate(userId, { refreshTokens: [] });
    }

    res.json({ success: true, message: 'User updated successfully', data: user });
  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

/**
 * Get comments/reviews for moderation
 */
exports.getCommentsForModeration = async (req, res) => {
  try {
    const { page = 1, limit = 50, status = 'pending' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Assuming you have a Comment model; using Rating as review proxy here
    const reviews = await Rating.find({ isSpoiler: true })  // Moderate spoilers
      .populate('user', 'displayName email avatar')
      .populate('anime', 'title slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, data: reviews });
  } catch (error) {
    logger.error('Moderation error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch comments' });
  }
};
