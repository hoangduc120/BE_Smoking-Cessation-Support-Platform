const QuitPlan = require('../models/quitPlan.model');
const QuitPlanStage = require("../models/quitPlanStage.model");
const Badge = require('../models/badge.model');


class QuitPlanService {
  async createQuitPlan(data) {
    try {
      const quitPlan = new QuitPlan(data);
      await quitPlan.save();
      return quitPlan;
    } catch (error) {
      throw new Error('Failed to create quit plan');
    }
  }
  async getQuitPlans({ userId, coachId, status }) {
    try {
      const query = {};
      if (userId) query.userId = userId;
      if (coachId) query.coachId = coachId;
      if (status) query.status = status;

      const quitPlans = await QuitPlan.find(query)
        .populate('coachId', 'name email')
        .populate('userId', 'name email')
        .sort({ createdAt: -1 });
      return quitPlans;
    } catch (error) {
      throw new Error('Failed to get quit plans');
    }
  }
  async getQuitPlanById(id) {
    try {
      const quitPlan = await QuitPlan.findById(id)
        .populate('coachId', 'name email')
        .populate('userId', 'name email');
      if (!quitPlan) {
        throw new Error('Quit plan not found');
      }
      const badges = await Badge.find({ quitPlanId: id })
        .populate('userId', 'name email')
      return { quitPlan, badges };
    } catch (error) {
      throw new Error('Failed to get quit plan');
    }
  }
  async updateQuitPlan(id, data) {
    try {
      const quitPlan = await QuitPlan.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      )
      if (!quitPlan) {
        throw new Error('Quit plan not found');
      }
      return quitPlan;
    } catch (error) {
      throw new Error('Failed to update quit plan');
    }
  }
  async deleteQuitPlan(id) {
    try {
      const quitPlan = await QuitPlan.findByIdAndDelete(id);
      if (!quitPlan) {
        throw new Error('Quit plan not found');
      }
      await QuitPlanStage.deleteMany({ quitPlanId: id });
      await Badge.deleteMany({ quitPlanId: id });
      return quitPlan;
    } catch (error) {
      throw new Error('Failed to delete quit plan');
    }
  }
  async createQuitPlanStage(data) {
    try {
      const stage = new QuitPlanStage(data)
      await stage.save();
      return stage;
    } catch (error) {
      throw new Error('Failed to create quit plan stage');
    }
  }
  async getQuitPlanStages(quitPlanId) {
    try {
      return await QuitPlanStage.find({ quitPlanId })
        .sort({ order_index: 1 });
    } catch (error) {
      throw new Error('Failed to get quit plan stages');
    }
  }
  async updateQuitPlanStage(id, data) {
    try {
      const stage = await QuitPlanStage.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      )
      if (!stage) {
        throw new Error('Quit plan stage not found');
      }
      return stage;
    } catch (error) {
      throw new Error('Failed to update quit plan stage');
    }
  }
  async deleteQuitPlanStage(id) {
    try {
      const stage = await QuitPlanStage.findByIdAndDelete(id);
      if (!stage) {
        throw new Error('Quit plan stage not found');
      }
      return stage;
    } catch (error) {
      throw new Error('Failed to delete quit plan stage');
    }
  }
  async awardBadgeToQuitPlan(quitPlanId, badgeData) {
    try {
      const quitPlan = await QuitPlan.findById(quitPlanId);
      if (!quitPlan) {
        throw new Error('Quit plan not found');
      }
      const badge = new Badge({
        ...badgeData,
        quitPlanId,
        userId: quitPlan.userId,
        awardedAt: new Date(),
      })
      await badge.save();
      return badge;
    } catch (error) {
      throw new Error('Failed to award badge to quit plan');
    }
  }
  async getQuitPlanBadges(quitPlanId) {
    try {
      const quitPlan = await QuitPlan.findById(quitPlanId)
      if (!quitPlan) {
        throw new Error('Quit plan not found');
      }
      return await Badge.find({ quitPlanId })
        .populate('userId', 'name email')
        .sort({ awardedAt: -1 });
    } catch (error) {
      throw new Error('Failed to get quit plan badges');
    }
  }
}
module.exports = new QuitPlanService();