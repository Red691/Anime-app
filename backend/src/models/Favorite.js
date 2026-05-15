// src/models/Favorite.js
const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  anime: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Anime',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

favoriteSchema.index({ user: 1, createdAt: -1 });
favoriteSchema.index({ user: 1, anime: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);

// src/models/Rating.js
const ratingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  anime: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Anime',
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  review: {
    type: String,
    maxlength: 2000
  },
  isSpoiler: {
    type: Boolean,
    default: false
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

ratingSchema.index({ anime: 1, createdAt: -1 });
ratingSchema.index({ user: 1, anime: 1 }, { unique: true });

// Update anime average rating on save
ratingSchema.post('save', async function() {
  const Anime = mongoose.model('Anime');
  const stats = await this.constructor.aggregate([
    { $match: { anime: this.anime } },
    {
      $group: {
        _id: '$anime',
        avgRating: { $avg: '$score' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  if (stats.length > 0) {
    await Anime.findByIdAndUpdate(this.anime, {
      averageRating: Math.round(stats[0].avgRating * 10) / 10,
      ratingCount: stats[0].count
    });
  }
});

module.exports = mongoose.model('Rating', ratingSchema);
