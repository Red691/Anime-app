// src/models/Genre.js
const mongoose = require('mongoose');

const genreSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  icon: String,  // Icon URL or class
  color: String, // Hex color for UI
  isActive: {
    type: Boolean,
    default: true
  },
  animeCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

genreSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
  next();
});

module.exports = mongoose.model('Genre', genreSchema);

// src/models/Notification.js
const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['episode_release', 'announcement', 'reply', 'system', 'recommendation'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: String,
  data: {
    animeId: mongoose.Schema.Types.ObjectId,
    episodeId: mongoose.Schema.Types.ObjectId,
    url: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  sentAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

notificationSchema.index({ user: 1, isRead: 1, sentAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
