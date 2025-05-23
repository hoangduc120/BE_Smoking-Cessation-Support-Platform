const Badge = require('../models/badge.model');
const UserBadge = require('../models/userBadge.model');

exports.awardBadgeIfNeeded = async (userId, badgeType = "milestone") => {
  const badge = await Badge.findOne({ type: badgeType, name: "Hoàn thành kế hoạch" });
  if (!badge) return;

  const existing = await UserBadge.findOne({ userId, badgeId: badge._id });
  if (existing) return;

  return await UserBadge.create({ userId, badgeId: badge._id, awardedAt: new Date() });
};
