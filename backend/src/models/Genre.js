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

