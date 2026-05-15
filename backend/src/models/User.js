// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Firebase UID (primary auth identifier)
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Profile
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  avatar: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  
  // Authentication
  authProvider: {
    type: String,
    enum: ['google', 'email', 'apple'],
    default: 'email'
  },
  password: {
    type: String,
    select: false,  // Never return password in queries
    required: function() {
      return this.authProvider === 'email';
    }
  },
  refreshTokens: [{
    token: String,
    createdAt: { type: Date, default: Date.now },
    expiresAt: Date,
    deviceInfo: String
  }],
  
  // Roles & Permissions
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin', 'superadmin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: String,
  bannedUntil: Date,
  
  // Preferences
  preferences: {
    language: { type: String, default: 'en' },
    subtitleLanguage: { type: String, default: 'en' },
    videoQuality: { type: String, default: 'auto', enum: ['auto', '1080p', '720p', '480p', '360p'] },
    autoSkipIntro: { type: Boolean, default: false },
    autoNextEpisode: { type: Boolean, default: true },
    notificationsEnabled: { type: Boolean, default: true },
    matureContent: { type: Boolean, default: false }
  },
  
  // External Sync
  malUsername: String,
  anilistUsername: String,
  
  // Metadata
  lastLogin: Date,
  loginHistory: [{
    ip: String,
    device: String,
    timestamp: { type: Date, default: Date.now }
  }],
  
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for user's watch history count
userSchema.virtual('watchHistoryCount', {
  ref: 'WatchHistory',
  localField: '_id',
  foreignField: 'user',
  count: true
});

module.exports = mongoose.model('User', userSchema);
