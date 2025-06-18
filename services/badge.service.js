const Badge = require('../models/badge.model');
const UserBadge = require('../models/userBadge.model');
const User = require('../models/user.models');
const QuitPlan = require('../models/quitPlan.model');

class BadgeService {
  async createBadgeForPlan(badgeData) {
    try {
      const badge = new Badge(badgeData);
      await badge.save();
      return badge;
    } catch (error) {
      throw new Error(`Failed to create badge: ${error.message}`);
    }
  }

  async getUserBadges(userId) {
    try {
      const userBadges = await UserBadge.find({ userId })
        .populate('badgeId')
        .sort({ awardedAt: -1 });

      return userBadges
        .filter(ub => ub.badgeId)
        .map(ub => ({
          _id: ub._id,
          badgeId: ub.badgeId._id,
          name: ub.badgeId.name,
          description: ub.badgeId.description,
          icon_url: ub.badgeId.icon_url,
          awardedAt: ub.awardedAt,
          quitPlanId: ub.badgeId.quitPlanId
        }));
    } catch (error) {
      throw new Error(`Failed to get user badges: ${error.message}`);
    }
  }

  async getAllBadges() {
    try {
      return await Badge.find().sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to get all badges: ${error.message}`);
    }
  }

  async getBadgeForPlan(quitPlanId) {
    try {
      return await Badge.findOne({ quitPlanId });
    } catch (error) {
      throw new Error(`Failed to get badge for plan: ${error.message}`);
    }
  }

  async awardPlanBadgeToUser(quitPlanId, userId) {
    try {

      const QuitPlan = require('../models/quitPlan.model');
      const userPlan = await QuitPlan.findById(quitPlanId);
      if (!userPlan) {
        throw new Error('Plan not found');
      }

      const searchPlanId = userPlan.templateId || quitPlanId;

      let badge = await Badge.findOne({ quitPlanId: searchPlanId });

      if (!badge && typeof searchPlanId === 'string') {
        const mongoose = require('mongoose');
        if (mongoose.Types.ObjectId.isValid(searchPlanId)) {
          const objectId = new mongoose.Types.ObjectId(searchPlanId);
          badge = await Badge.findOne({ quitPlanId: objectId });
        }
      }
      if (!badge) {
        throw new Error('No badge found for this plan');
      }

      const existingUserBadge = await UserBadge.findOne({
        userId,
        badgeId: badge._id
      });

      if (existingUserBadge) {
        throw new Error('User already has this badge');
      }

      const userBadge = new UserBadge({
        userId,
        badgeId: badge._id,
        awardedAt: new Date()
      });

      await userBadge.save();

      const populatedUserBadge = await UserBadge.findById(userBadge._id)
        .populate('badgeId')
        .populate('userId', 'userName email');

      return populatedUserBadge;
    } catch (error) {
      throw new Error(`Failed to award plan badge: ${error.message}`);
    }
  }

  async awardBadgeToUser(userId, badgeId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const badge = await Badge.findById(badgeId);
      if (!badge) {
        throw new Error('Badge not found');
      }

      const existingUserBadge = await UserBadge.findOne({ userId, badgeId });
      if (existingUserBadge) {
        throw new Error('User already has this badge');
      }

      const userBadge = new UserBadge({
        userId,
        badgeId,
        awardedAt: new Date()
      });

      await userBadge.save();

      const populatedUserBadge = await UserBadge.findById(userBadge._id)
        .populate('badgeId')
        .populate('userId', 'userName email');

      return populatedUserBadge;
    } catch (error) {
      throw new Error(`Failed to award badge: ${error.message}`);
    }
  }
}

module.exports = new BadgeService();
