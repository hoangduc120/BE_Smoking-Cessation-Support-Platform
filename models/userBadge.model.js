const mongoose = require('mongoose');

const userBadgeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  badgeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Badge",
    required: true
  },
  awardedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Đảm bảo mỗi user chỉ nhận 1 lần mỗi badge
userBadgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true });

module.exports = mongoose.model('UserBadge', userBadgeSchema);
