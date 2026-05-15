// src/models/Episode.js
const mongoose = require('mongoose');

const streamServerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true  // 'Server 1', 'Server 2', 'Backup'
  },
  url: {
    type: String,
    required: true  // HLS .m3u8 URL
  },
  type: {
    type: String,
    enum: ['hls', 'dash', 'mp4'],
    default: 'hls'
  },
  quality: [{
    label: String,   // '1080p', '720p'
    url: String,
    bandwidth: Number
  }],
  subtitles: [{
    language: String,  // 'en', 'es', 'jp'
    label: String,     // 'English', 'Español'
    url: String,       // .vtt or .srt URL
    isDefault: Boolean
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 0  // Lower = higher priority
  }
}, { _id: true });

const episodeSchema = new mongoose.Schema({
  anime: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Anime',
    required: true,
    index: true
  },
  
  number: {
    type: Number,
    required: true,
    min: 1
  },
  
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  synopsis: {
    type: String,
    maxlength: 2000,
    default: ''
  },
  
  thumbnail: {
    type: String,
    required: true
  },
  
  // Duration in seconds
  duration: {
    type: Number,
    default: 1440  // 24 minutes
  },
  
  // Streaming sources
  servers: [streamServerSchema],
  
  // Intro/outro timestamps for skip feature
  introStart: Number,  // seconds
  introEnd: Number,
  outroStart: Number,
  
  // Release info
  releaseDate: {
    type: Date,
    default: Date.now
  },
  isFiller: {
    type: Boolean,
    default: false
  },
  isRecap: {
    type: Boolean,
    default: false
  },
  
  // Stats
  views: {
    type: Number,
    default: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['upcoming', 'released', 'unavailable'],
    default: 'upcoming'
  },
  
  // Download support
  downloadLinks: [{
    quality: String,
    url: String,
    size: String,  // '500MB'
    format: String  // 'mp4', 'mkv'
  }]
}, {
  timestamps: true
});

// Compound index for anime + episode number (unique constraint)
episodeSchema.index({ anime: 1, number: 1 }, { unique: true });
episodeSchema.index({ status: 1, releaseDate: -1 });
episodeSchema.index({ anime: 1, createdAt: -1 });

module.exports = mongoose.model('Episode', episodeSchema);
