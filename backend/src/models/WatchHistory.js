// src/models/WatchHistory.js
const mongoose = require('mongoose');

const watchHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  anime: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Anime',
    required: true
  },
  episode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Episode',
    required: true
  },
  
  // Playback state
  progress: {
    type: Number,  // seconds watched
    default: 0
  },
  duration: {
    type: Number,  // total episode duration
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Playback settings at time of watch
  quality: String,
  subtitleLanguage: String,
  playbackSpeed: {
    type: Number,
    default: 1.0
  },
  
  // Device info
  device: {
    type: String,  // 'mobile', 'web', 'tv'
    default: 'mobile'
  },
  
  lastWatched: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes
watchHistorySchema.index({ user: 1, lastWatched: -1 });
watchHistorySchema.index({ user: 1, anime: 1, episode: 1 }, { unique: true });
watchHistorySchema.index({ user: 1, completed: 1 });

// Pre-save hook to calculate completion percentage
watchHistorySchema.pre('save', function(next) {
  if (this.duration > 0) {
    this.completionPercentage = Math.min(100, (this.progress / this.duration) * 100);
    this.completed = this.completionPercentage >= 90;
  }
  this.lastWatched = new Date();
  next();
});

module.exports = mongoose.model('WatchHistory', watchHistorySchema);
