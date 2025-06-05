const QuitPlan = require('../models/quitPlan.model');
const QuitPlanStage = require("../models/quitPlanStage.model");
const Badge = require('../models/badge.model');
const QuitProgress = require('../models/quitProgress.model');


class QuitPlanService {
  async createQuitPlan(data) {
    try {
      const quitPlan = new QuitPlan(data);
      await quitPlan.save();
      return quitPlan;
    } catch (error) {
      throw new Error(`Failed to create quit plan: ${error.message || error}`);
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
      // Validate that the quit plan exists
      const quitPlan = await QuitPlan.findById(data.quitPlanId);
      if (!quitPlan) {
        throw new Error('Quit plan not found');
      }

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
  async selectQuitPlan(userId, quitPlanId) {
    try {
      const existingPlan = await QuitPlan.findOne({ userId, status: "ongoing" });
      if (existingPlan) {
        throw new Error('User already has an ongoing quit plan');
      }

      const templatePlan = await QuitPlan.findById(quitPlanId);
      if (!templatePlan) {
        throw new Error('Quit plan not found');
      }

      if (templatePlan.status !== "template" && templatePlan.status !== "ongoing") {
        throw new Error('Can only select template or ongoing plans');
      }
      if (templatePlan.userId && templatePlan.userId.toString() === userId.toString()) {
        throw new Error('Cannot select your own plan');
      }

      const newPlan = new QuitPlan({
        ...templatePlan.toObject(),
        userId,
        status: "ongoing",
        _id: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await newPlan.save();

      const stages = await QuitPlanStage.find({ quitPlanId: templatePlan._id })
      const newStages = stages.map(stage => ({
        ...stage.toObject(),
        quitPlanId: newPlan._id,
        _id: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
      await QuitPlanStage.insertMany(newStages);

      return newPlan;
    } catch (error) {
      throw new Error(`Failed to select quit plan: ${error.message}`);
    }
  }
  async getUserCurrentPlan(userId) {
    try {
      const plan = await QuitPlan.findOne({ userId, status: "ongoing" })
        .populate('coachId', 'name email')
        .populate('userId', 'name email');
      if (!plan) {
        return null
      }

      const stages = await QuitPlanStage.find({ quitPlanId: plan._id })
        .sort({ order_index: 1 });
      const progress = await QuitProgress.find({ userId, stageId: { $in: stages.map(s => s._id) } })
      return { plan, stages, progress };
    } catch (error) {
      throw new Error('Failed to get user current plan');
    }
  }
  async completeStage(stageId, userId) {
    try {
      const stage = await QuitPlanStage.findById(stageId);
      if (!stage) {
        throw new Error('Stage not found');
      }
      const plan = await QuitPlan.findOne({ _id: stage.quitPlanId, userId, status: "ongoing" });
      if (!plan) {
        throw new Error('Quit plan not found');
      }
      stage.completed = true;
      await stage.save();

      const allStages = await QuitPlanStage.find({ quitPlanId: plan._id });
      const allCompleted = allStages.every(s => s.completed);
      if (allCompleted) {
        plan.status = "completed";
        await plan.save();
      }

      await this.awardBadgeToQuitPlan(plan._id, {
        name: "Stage Completed",
        description: `Completed stage: ${stage.stage_name}`,
      })
      return { success: true, message: "Stage completed successfully" };
    } catch (error) {
      throw new Error('Failed to complete stage');
    }
  }
  async failQuitPlan(planId, userId) {
    try {
      const plan = await QuitPlan.findOne({ _id: planId, userId, status: "ongoing" });
      if (!plan) {
        throw new Error('Quit plan not found');
      }
      plan.status = "failed";
      await plan.save();
      return plan
    } catch (error) {
      throw new Error('Failed to fail quit plan');
    }
  }
  async getTemplatePlans(coachId) {
    try {
      return await QuitPlan.find({ coachId, status: "template" })
        .populate('coachId', 'name email')
        .sort({ createdAt: -1 });
    } catch (error) {
      throw new Error('Failed to get template plans');
    }
  }
}
module.exports = new QuitPlanService();