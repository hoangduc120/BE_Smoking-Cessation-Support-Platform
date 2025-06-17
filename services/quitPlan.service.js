const QuitPlan = require('../models/quitPlan.model');
const QuitPlanStage = require("../models/quitPlanStage.model");
const Badge = require('../models/badge.model');
const QuitProgress = require('../models/quitProgress.model');
const mongoose = require('mongoose');


class QuitPlanService {
  async createQuitPlan(data) {
    try {
      const planData = {
        ...data,
        status: 'template'
      };

      if (planData.status === 'template') {
        delete planData.startDate;
        delete planData.endDate;
      }

      const quitPlan = new QuitPlan(planData);
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
        .populate('coachId', 'userName email')
        .populate('userId', 'userName email')
        .sort({ createdAt: -1 });
      return quitPlans;
    } catch (error) {
      throw new Error('Failed to get quit plans');
    }
  }
  async getQuitPlanById(id) {
    try {
      const quitPlan = await QuitPlan.findById(id)
        .populate('coachId', 'userName email')
        .populate('userId', 'userName email');
      if (!quitPlan) {
        throw new Error('Quit plan not found');
      }
      const badges = await Badge.find({ quitPlanId: id })
        .populate('userId', 'userName email')
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

      const stageData = { ...data };

      // Nếu là template plan, không cần start_date/end_date, chỉ cần duration
      if (quitPlan.status === 'template') {
        delete stageData.start_date;
        delete stageData.end_date;

        // Validate duration không được vượt quá duration của plan
        if (quitPlan.duration) {
          const existingStages = await QuitPlanStage.find({ quitPlanId: quitPlan._id });
          const totalExistingDuration = existingStages.reduce((sum, stage) => sum + stage.duration, 0);

          if (totalExistingDuration + stageData.duration > quitPlan.duration) {
            throw new Error(`Tổng số ngày của các stages (${totalExistingDuration + stageData.duration}) không được vượt quá số ngày của kế hoạch (${quitPlan.duration})`);
          }
        }
      }

      const stage = new QuitPlanStage(stageData);
      await stage.save();
      return stage;
    } catch (error) {
      throw new Error(`Failed to create quit plan stage: ${error.message}`);
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

  async getQuitPlanDurationStats(quitPlanId) {
    try {
      const quitPlan = await QuitPlan.findById(quitPlanId);
      if (!quitPlan) {
        throw new Error('Quit plan not found');
      }

      const stages = await QuitPlanStage.find({ quitPlanId })
        .sort({ order_index: 1 });

      const totalStageDuration = stages.reduce((sum, stage) => sum + stage.duration, 0);
      const remainingDuration = quitPlan.duration ? quitPlan.duration - totalStageDuration : 0;

      return {
        planDuration: quitPlan.duration || 0,
        totalStageDuration,
        remainingDuration,
        stagesCount: stages.length,
        stages: stages.map(stage => ({
          _id: stage._id,
          stage_name: stage.stage_name,
          duration: stage.duration,
          order_index: stage.order_index
        }))
      };
    } catch (error) {
      throw new Error(`Failed to get quit plan duration stats: ${error.message}`);
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
  async awardBadgeToQuitPlan(quitPlanId, badgeData, userId = null) {
    try {
      const quitPlan = await QuitPlan.findById(quitPlanId);
      if (!quitPlan) {
        throw new Error('Quit plan not found');
      }
      let targetUserId = userId || quitPlan.userId;
      if (!targetUserId) {
        throw new Error('Cannot award badge to template plan without specifying userId');
      }
      const badge = new Badge({
        ...badgeData,
        quitPlanId,
        userId: targetUserId,
        awardedAt: new Date(),
      })
      await badge.save();
      return badge;
    } catch (error) {
      console.error('Award badge error:', error);
      throw new Error(`Failed to award badge to quit plan: ${error.message}`);
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

      if (templatePlan.status !== "template") {
        throw new Error('Can only select template plans');
      }

      // Tính toán dates dựa trên duration và ngày đăng ký
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + (templatePlan.duration * 24 * 60 * 60 * 1000));

      const newPlan = new QuitPlan({
        ...templatePlan.toObject(),
        userId,
        status: "ongoing",
        startDate,
        endDate,
        _id: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await newPlan.save();

      // Lấy template stages và tính toán dates cho từng stage
      const templateStages = await QuitPlanStage.find({ quitPlanId: templatePlan._id })
        .sort({ order_index: 1 });

      if (templateStages.length > 0) {
        let currentStageStartDate = new Date(startDate);

        const newStages = templateStages.map(stage => {
          const stageStartDate = new Date(currentStageStartDate);
          const stageEndDate = new Date(stageStartDate.getTime() + (stage.duration * 24 * 60 * 60 * 1000));

          // Cập nhật start date cho stage tiếp theo
          currentStageStartDate = new Date(stageEndDate.getTime() + (24 * 60 * 60 * 1000)); // +1 ngày

          return {
            ...stage.toObject(),
            quitPlanId: newPlan._id,
            start_date: stageStartDate,
            end_date: stageEndDate,
            completed: false,
            _id: undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        });

        await QuitPlanStage.insertMany(newStages);
      }

      // Populate để trả về thông tin đầy đủ
      const populatedPlan = await QuitPlan.findById(newPlan._id)
        .populate('coachId', 'userName email')
        .populate('userId', 'userName email');

      return populatedPlan;
    } catch (error) {
      throw new Error(`Failed to select quit plan: ${error.message}`);
    }
  }
  async getUserCurrentPlan(userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }
      const plan = await QuitPlan.findOne({ userId, status: "ongoing" })
        .populate('coachId', 'userName email')
        .populate('userId', 'userName email');
      if (!plan) {
        return null;
      }
      const stages = await QuitPlanStage.find({ quitPlanId: plan._id })
        .sort({ order_index: 1 });
      const progress = await QuitProgress.find({ userId, stageId: { $in: stages.map(s => s._id) } });
      return { plan, stages, progress };
    } catch (error) {
      console.error('Service error:', error);
      throw new Error(`Failed to get user current plan: ${error.message}`);
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

      let message = "Stage completed successfully";
      let planCompleted = false;

      if (allCompleted) {
        await this.completePlan(plan._id, userId);
        message = "Plan completed successfully! Badge awarded.";
        planCompleted = true;
      }

      return {
        success: true,
        message,
        planCompleted,
        completedStages: allStages.filter(s => s.completed).length,
        totalStages: allStages.length
      };
    } catch (error) {
      throw new Error(`Failed to complete stage: ${error.message}`);
    }
  }

  async completePlan(planId, userId) {
    try {
      const plan = await QuitPlan.findOne({ _id: planId, userId, status: "ongoing" });
      if (!plan) {
        throw new Error('Quit plan not found or not ongoing');
      }
      plan.status = "completed";
      await plan.save();

      const badge = await this.awardBadgeToQuitPlan(plan._id, {
        name: "Plan Completed",
        description: `Hoàn thành kế hoạch cai thuốc: ${plan.title}`,
        icon_url: "/badges/plan-completed.png"
      }, userId);

      return { plan, badge };
    } catch (error) {
      throw new Error(`Failed to complete plan: ${error.message}`);
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
        .populate('coachId', 'userName email')
        .sort({ createdAt: -1 });
    } catch (error) {
      throw new Error('Failed to get template plans');
    }
  }

  async getCompleteByPlanId(planId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(planId)) {
        throw new Error('Invalid plan ID format');
      }

      const plan = await QuitPlan.findById(planId)
        .populate('coachId', 'userName email')
        .populate('userId', 'userName email');

      if (!plan) {
        throw new Error('Plan not found');
      }

      const stages = await QuitPlanStage.find({ quitPlanId: planId })
        .sort({ order_index: 1 });

      const completedStages = stages.filter(stage => stage.completed);
      const totalStages = stages.length;
      const completionPercentage = totalStages > 0 ? (completedStages.length / totalStages) * 100 : 0;

      const badges = await Badge.find({ quitPlanId: planId })
        .populate('userId', 'userName email')
        .sort({ awardedAt: -1 });

      return {
        plan,
        stages,
        completedStages: completedStages.length,
        totalStages,
        completionPercentage: Math.round(completionPercentage),
        badges,
        isCompleted: plan.status === 'completed'
      };
    } catch (error) {
      throw new Error(`Failed to get plan completion details: ${error.message}`);
    }
  }

  async getAllUserPlanHistory(userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }

      const plans = await QuitPlan.find({ userId })
        .populate('coachId', 'userName email')
        .populate('userId', 'userName email')
        .sort({ createdAt: -1 });

      const planHistory = await Promise.all(
        plans.map(async (plan) => {
          const stages = await QuitPlanStage.find({ quitPlanId: plan._id })
            .sort({ order_index: 1 });

          const completedStages = stages.filter(stage => stage.completed);
          const totalStages = stages.length;
          const completionPercentage = totalStages > 0 ? (completedStages.length / totalStages) * 100 : 0;

          const badges = await Badge.find({ quitPlanId: plan._id, userId })
            .sort({ awardedAt: -1 });

          return {
            plan: plan.toObject(),
            completedStages: completedStages.length,
            totalStages,
            completionPercentage: Math.round(completionPercentage),
            badgeCount: badges.length,
            badges,
            duration: plan.endDate && plan.startDate ?
              Math.ceil((plan.endDate - plan.startDate) / (1000 * 60 * 60 * 24)) : null
          };
        })
      );

      const summary = {
        totalPlans: plans.length,
        completedPlans: plans.filter(p => p.status === 'completed').length,
        ongoingPlans: plans.filter(p => p.status === 'ongoing').length,
        failedPlans: plans.filter(p => p.status === 'failed').length,
        templatePlans: plans.filter(p => p.status === 'template').length,
        totalBadges: planHistory.reduce((sum, plan) => sum + plan.badgeCount, 0)
      };

      return {
        planHistory,
        summary
      };
    } catch (error) {
      throw new Error(`Failed to get user plan history: ${error.message}`);
    }
  }
}
module.exports = new QuitPlanService();