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
