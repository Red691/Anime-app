// src/models/Anime.js
const mongoose = require('mongoose');
const slugify = require('slugify');

const animeSchema = new mongoose.Schema({
  // Basic Info
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    unique: true,
    index: true
  },
  alternativeTitles: [{
    title: String,
    language: String  // 'en', 'jp', 'jp_romaji'
  }],
  synopsis: {
    type: String,
    required: true,
    maxlength: 5000
  },
  
  // Media
  coverImage: {
    type: String,
    required: true  // Cloudinary URL
  },
  bannerImage: {
    type: String,
    default: null
  },
  trailerUrl: String,  // YouTube embed URL
  
  // Categorization
  type: {
    type: String,
    enum: ['tv', 'movie', 'ova', 'ona', 'special', 'music'],
    required: true
  },
  status: {
    type: String,
    enum: ['airing', 'finished', 'upcoming', 'cancelled'],
    default: 'upcoming'
  },
  genres: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Genre'
  }],
  themes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Theme'
  }],
  
  // Content Info
  episodesCount: {
    type: Number,
    default: 0,
    min: 0
  },
  episodeDuration: {
    type: Number,  // in minutes
    default: 24
  },
  season: {
    name: String,   // 'Spring', 'Summer', 'Fall', 'Winter'
    year: Number
  },
  aired: {
    from: Date,
    to: Date
  },
  
  // Ratings & Stats
  averageRating: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  totalViews: {
    type: Number,
    default: 0
  },
  popularity: {
    type: Number,
    default: 0  // Calculated score for trending
  },
  ageRating: {
    type: String,
    enum: ['g', 'pg', 'pg13', 'r17', 'r', 'rx'],
    default: 'pg13'
  },
  
  // External IDs
  malId: Number,
  anilistId: Number,
  kitsuId: String,
  
  // Streaming
  isPremium: {
    type: Boolean,
    default: false  // Free vs premium content
  },
  availableRegions: [{
    type: String,
    default: ['global']
  }],
  
  // Metadata
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  scheduledRelease: Date,
  
  // SEO
  metaTags: {
    keywords: [String],
    description: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for common queries
animeSchema.index({ status: 1, isActive: 1, createdAt: -1 });
animeSchema.index({ genres: 1, averageRating: -1 });
animeSchema.index({ popularity: -1, isActive: 1 });
animeSchema.index({ title: 'text', synopsis: 'text', alternativeTitles: 'text' });

// Auto-generate slug
animeSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
  }
  next();
});

// Virtual for episodes
animeSchema.virtual('episodes', {
  ref: 'Episode',
  localField: '_id',
  foreignField: 'anime'
});

// Method to update popularity score
animeSchema.methods.calculatePopularity = function() {
  // Weighted algorithm: views (40%), ratings (30%), recency (20%), favorites (10%)
  const now = new Date();
  const daysSinceRelease = Math.max(1, (now - this.createdAt) / (1000 * 60 * 60 * 24));
  const recencyBoost = Math.max(0.1, 30 / daysSinceRelease);
  
  this.popularity = (
    (this.totalViews * 0.4) +
    (this.averageRating * this.ratingCount * 0.3) +
    (recencyBoost * 1000 * 0.2) +
    (this.ratingCount * 0.1)
  );
  return this.popularity;
};

module.exports = mongoose.model('Anime', animeSchema);
