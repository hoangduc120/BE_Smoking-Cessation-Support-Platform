const QuitPlan = require('../models/quitPlan.model');
const QuitPlanStage = require("../models/quitPlanStage.model");
const Badge = require('../models/badge.model');
const QuitProgress = require('../models/quitProgress.model');
const mongoose = require('mongoose');
const CustomQuitPlan = require('../models/customQuitPlan.model');


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
      return { quitPlan };
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
      const quitPlan = await QuitPlan.findById(data.quitPlanId);
      if (!quitPlan) {
        throw new Error('Quit plan not found');
      }

      const stageData = { ...data };

      if (quitPlan.status === 'template') {
        delete stageData.start_date;
        delete stageData.end_date;

        if (quitPlan.duration) {
          const existingStages = await QuitPlanStage.find({ quitPlanId: quitPlan._id });
          const totalExistingDuration = existingStages.reduce((sum, stage) => sum + stage.duration, 0);

          if (totalExistingDuration + stageData.duration > quitPlan.duration) {
            throw new Error(`Tổng số ngày của các stages (${totalExistingDuration + stageData.duration}) không được vượt quá số ngày của kế hoạch (${quitPlan.duration})`);
          }
        }
      } else {
        if (!stageData.start_date || !stageData.end_date) {
          throw new Error('start_date và end_date là bắt buộc cho plans không phải template');
        }
      }

      const stage = new QuitPlanStage(stageData);
      await stage.save();
      return stage;
    } catch (error) {
      console.error('Error creating stage:', error);
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
      throw new Error(`Failed to award badge to quit plan: ${error.message}`);
    }
  }
  async getQuitPlanBadges(quitPlanId) {
    try {
      const quitPlan = await QuitPlan.findById(quitPlanId);
      if (!quitPlan) {
        throw new Error('Quit plan not found');
      }
      let badge = null;

      if (quitPlan.templateId) {
        badge = await Badge.findOne({ quitPlanId: quitPlan.templateId });
      }

      if (!badge) {
        badge = await Badge.findOne({ quitPlanId: quitPlanId });
      }

      if (!badge) {
        return [];
      }

      const UserBadge = require('../models/userBadge.model');
      const userBadges = await UserBadge.find({ badgeId: badge._id })
        .populate('userId', 'userName email')
        .populate('badgeId')
        .sort({ awardedAt: -1 });

      return userBadges.map(ub => ({
        _id: ub._id,
        badge: ub.badgeId,
        userId: ub.userId,
        awardedAt: ub.awardedAt
      }));
    } catch (error) {
      throw new Error('Failed to get quit plan badges');
    }
  }
  async getBadgeByPlanId(quitPlanId) {
    try {
      const quitPlan = await QuitPlan.findById(quitPlanId);
      if (!quitPlan) {
        throw new Error('Quit plan not found');
      }

      let badge = null;

      if (quitPlan.templateId) {
        badge = await Badge.findOne({ quitPlanId: quitPlan.templateId });
      }

      if (!badge) {
        badge = await Badge.findOne({ quitPlanId: quitPlanId });
      }

      return badge;
    } catch (error) {
      throw new Error('Failed to get badge for quit plan');
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

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + (templatePlan.duration * 24 * 60 * 60 * 1000));

      const newPlan = new QuitPlan({
        ...templatePlan.toObject(),
        userId,
        status: "ongoing",
        startDate,
        endDate,
        templateId: templatePlan._id,
        _id: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await newPlan.save();

      const templateStages = await QuitPlanStage.find({ quitPlanId: templatePlan._id })
        .sort({ order_index: 1 });

      if (templateStages.length > 0) {
        // Bắt đầu từ đầu ngày hôm nay (0h00)
        const startOfToday = new Date(startDate);
        startOfToday.setHours(0, 0, 0, 0);

        let currentDayOffset = 0;

        const newStages = templateStages.map(stage => {
          // Stage bắt đầu từ đầu ngày (0h00)
          const stageStartDate = new Date(startOfToday);
          stageStartDate.setDate(startOfToday.getDate() + currentDayOffset);

          // Stage kết thúc vào cuối ngày (23h59:59.999)
          const stageEndDate = new Date(stageStartDate);
          stageEndDate.setDate(stageStartDate.getDate() + stage.duration - 1);
          stageEndDate.setHours(23, 59, 59, 999);

          // Tăng offset cho stage tiếp theo
          currentDayOffset += stage.duration;

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
        const result = await this.completePlan(plan._id, userId);
        if (result.badge) {
          message = "Plan completed successfully! Badge awarded.";
        } else {
          message = "Plan completed successfully!";
        }
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

      console.log(`Completing plan ${planId} for user ${userId}`);
      plan.status = "completed";
      await plan.save();

      let badge = null;
      try {
        const badgeService = require('./badge.service');
        console.log(`Attempting to award badge for plan ${planId}...`);
        badge = await badgeService.awardPlanBadgeToUser(planId, userId);
        console.log(`Badge awarded successfully:`, badge ? badge._id : 'null');
      } catch (badgeError) {
        console.error(`Badge award failed:`, badgeError.message);
        // Không throw error cho badge để không làm thất bại việc complete plan
      }

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
  async cancelQuitPlan(userId, reason = null) {
    try {
      const plan = await QuitPlan.findOne({ userId, status: "ongoing" });
      if (!plan) {
        throw new Error('Không tìm thấy quit plan đang thực hiện');
      }

      const stages = await QuitPlanStage.find({ quitPlanId: plan._id }).sort({ order_index: 1 });
      const completedStages = stages.filter(stage => stage.completed);
      const progressCount = await QuitProgress.countDocuments({
        userId,
        stageId: { $in: stages.map(s => s._id) }
      });

      console.log(`Cancelling plan ${plan._id} for user ${userId}: ${completedStages.length}/${stages.length} stages completed, ${progressCount} progress entries`);

      plan.status = "cancelled";

      if (reason) {
        plan.cancelReason = reason;
        plan.cancelledAt = new Date();
      }

      await plan.save();

      const populatedPlan = await QuitPlan.findById(plan._id)
        .populate('coachId', 'userName email')
        .populate('userId', 'userName email');

      return {
        cancelledPlan: populatedPlan,
        progress: {
          completedStages: completedStages.length,
          totalStages: stages.length,
          progressEntries: progressCount,
          completionPercentage: stages.length > 0 ? Math.round((completedStages.length / stages.length) * 100) : 0
        }
      };
    } catch (error) {
      throw new Error(`Failed to cancel quit plan: ${error.message}`);
    }
  }
  async canCancelQuitPlan(userId) {
    try {
      const plan = await QuitPlan.findOne({ userId, status: "ongoing" });

      if (!plan) {
        return {
          canCancel: false,
          reason: 'Không có quit plan nào đang thực hiện'
        };
      }

      // Lấy thông tin tiến trình
      const stages = await QuitPlanStage.find({ quitPlanId: plan._id }).sort({ order_index: 1 });
      const completedStages = stages.filter(stage => stage.completed);
      const progressCount = await QuitProgress.countDocuments({
        userId,
        stageId: { $in: stages.map(s => s._id) }
      });

      const completionPercentage = stages.length > 0 ? Math.round((completedStages.length / stages.length) * 100) : 0;

      return {
        canCancel: true,
        reason: 'Có thể hủy quit plan',
        planInfo: {
          id: plan._id,
          title: plan.title,
          startDate: plan.startDate,
          completedStages: completedStages.length,
          totalStages: stages.length,
          progressEntries: progressCount,
          completionPercentage
        }
      };
    } catch (error) {
      throw new Error(`Failed to check cancel eligibility: ${error.message}`);
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

      const UserBadge = require('../models/userBadge.model');
      const userBadgesForPlan = await UserBadge.find({})
        .populate('badgeId')
        .populate('userId', 'userName email')
        .sort({ awardedAt: -1 });

      const badges = userBadgesForPlan
        .filter(ub => {
          if (!ub.badgeId) return false;

          // Ưu tiên tìm badge theo templateId của plan trước (nếu có)
          if (plan.templateId) {
            return ub.badgeId.quitPlanId.toString() === plan.templateId.toString();
          }

          // Nếu không có templateId thì tìm theo planId
          return ub.badgeId.quitPlanId.toString() === planId.toString();
        })
        .map(ub => ({
          ...ub.badgeId.toObject(),
          userId: ub.userId,
          awardedAt: ub.awardedAt
        }));

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

          const UserBadge = require('../models/userBadge.model');
          const userBadges = await UserBadge.find({ userId })
            .populate('badgeId')
            .sort({ awardedAt: -1 });

          const badges = userBadges
            .filter(ub => {
              if (!ub.badgeId) return false;

              // Ưu tiên tìm badge theo templateId trước (nếu có)
              if (plan.templateId) {
                return ub.badgeId.quitPlanId.toString() === plan.templateId.toString();
              }

              // Nếu không có templateId thì tìm theo plan._id
              return ub.badgeId.quitPlanId.toString() === plan._id.toString();
            })
            .map(ub => ub.badgeId);

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
        cancelledPlans: plans.filter(p => p.status === 'cancelled').length,
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

  // Thêm method để fix stage timing
  async fixStageTiming(planId) {
    try {
      const plan = await QuitPlan.findById(planId);
      if (!plan || plan.status !== "ongoing") {
        throw new Error('Plan not found or not ongoing');
      }

      const stages = await QuitPlanStage.find({ quitPlanId: planId })
        .sort({ order_index: 1 });

      if (stages.length === 0) return;

      // Fix timing theo ngày calendar
      const startOfPlan = new Date(plan.startDate);
      startOfPlan.setHours(0, 0, 0, 0);

      let currentDayOffset = 0;

      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];

        // Stage bắt đầu từ đầu ngày (0h00)
        const stageStartDate = new Date(startOfPlan);
        stageStartDate.setDate(startOfPlan.getDate() + currentDayOffset);

        // Stage kết thúc vào cuối ngày (23h59:59.999)
        const stageEndDate = new Date(stageStartDate);
        stageEndDate.setDate(stageStartDate.getDate() + stage.duration - 1);
        stageEndDate.setHours(23, 59, 59, 999);

        await QuitPlanStage.findByIdAndUpdate(stage._id, {
          start_date: stageStartDate,
          end_date: stageEndDate
        });

        // Tăng offset cho stage tiếp theo
        currentDayOffset += stage.duration;
      }

      console.log(`Fixed timing for plan ${planId} with ${stages.length} stages`);
      return true;
    } catch (error) {
      console.error('Error fixing stage timing:', error);
      throw error;
    }
  }

  // Thêm method để kiểm tra và complete các stage đã hết hạn
  async checkExpiredStages(planId, userId) {
    try {
      const quitProgressService = require('./quitProgress.service');

      const stages = await QuitPlanStage.find({ quitPlanId: planId, completed: false })
        .sort({ order_index: 1 });

      const currentDate = new Date();
      let hasChanges = false;

      for (const stage of stages) {
        if (stage.start_date && stage.end_date) {
          const stageEndDate = new Date(stage.end_date);

          // Kiểm tra nếu stage đã hết hạn
          if (currentDate >= stageEndDate && !stage.completed) {
            await quitProgressService.checkAndCompleteStage(stage._id, userId);
            hasChanges = true;
          }
        }
      }

      return hasChanges;
    } catch (error) {
      console.error('Error checking expired stages:', error);
      throw error;
    }
  }
  async createCustomQuitPlan(data) {
    try {
      const existingPlan = await QuitPlan.findOne({ userId: data.userId, status: "ongoing" })
      if (existingPlan) {
        throw new Error('User already has an ongoing quit plan');
      }
      const request = new CustomQuitPlan(data)
      await request.save()
      return request
    } catch (error) {
      throw new Error(`Failed to create custom quit plan: ${error.message}`);
    }
  }
  async getCustomQuitPlan(userId, coachId, status) {
    try {
      const query = {}
      if (userId) query.userId = userId
      if (coachId) query.coachId = coachId
      if (status) query.status = status
      const requests = await CustomQuitPlan.find(query)
        .populate('userId', 'userName email')
        .populate('coachId', 'userName email')
        .sort({ createdAt: -1 })
      return requests
    } catch (error) {
      throw new Error(`Failed to get custom quit plan: ${error.message}`);
    }
  }
  async approveCustomQuitPlanRequest(requestId, coachId, quitPlanData, stagesData) {
    try {
      const request = await CustomQuitPlan.findById(requestId)
      if (!request) {
        throw new Error('Request not found');
      }
      // Check if request is already assigned to another coach
      if (request.coachId && request.coachId.toString() !== coachId.toString()) {
        throw new Error('This request is already assigned to another coach');
      }
      if (request.status !== 'pending') {
        throw new Error('Request is not pending');
      }

      // Check if user already has an ongoing plan
      const existingPlan = await QuitPlan.findOne({ userId: request.userId, status: "ongoing" });
      if (existingPlan) {
        throw new Error('User already has an ongoing quit plan');
      }

      // Tính thời gian từ lúc coach approve (tương tự selectQuitPlan)
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + (quitPlanData.duration * 24 * 60 * 60 * 1000));

      const quitPlan = new QuitPlan({
        ...quitPlanData,
        userId: request.userId,
        coachId,
        templateId: null,
        status: 'ongoing',
        startDate,
        endDate
      });
      await quitPlan.save();

      if (stagesData && stagesData.length > 0) {
        const startOfToday = new Date(startDate);
        startOfToday.setHours(0, 0, 0, 0);

        let currentDayOffset = 0;

        const newStages = stagesData.map(stage => {
          const stageStartDate = new Date(startOfToday);
          stageStartDate.setDate(startOfToday.getDate() + currentDayOffset);

          const stageEndDate = new Date(stageStartDate);
          stageEndDate.setDate(stageStartDate.getDate() + stage.duration - 1);
          stageEndDate.setHours(23, 59, 59, 999);

          currentDayOffset += stage.duration;

          return {
            ...stage,
            quitPlanId: quitPlan._id,
            start_date: stageStartDate,
            end_date: stageEndDate,
            completed: false
          };
        });

        await QuitPlanStage.insertMany(newStages);
      }

      request.status = 'approved'
      request.coachId = coachId
      request.quitPlanId = quitPlan._id
      request.approvedAt = new Date()
      await request.save()

      const populatedPlan = await QuitPlan.findById(quitPlan._id)
        .populate('coachId', 'userName email')
        .populate('userId', 'userName email');

      return { request, quitPlan: populatedPlan }
    } catch (error) {
      throw new Error(`Failed to approve custom quit plan request: ${error.message}`);
    }
  }
  async rejectCustomQuitPlanRequest(requestId, coachId, reason) {
    try {
      const request = await CustomQuitPlan.findById(requestId)
      if (!request) {
        throw new Error('Request not found');
      }
      // Check if request is already assigned to another coach
      if (request.coachId && request.coachId.toString() !== coachId.toString()) {
        throw new Error('This request is already assigned to another coach');
      }
      if (request.status !== 'pending') {
        throw new Error('Request is not pending');
      }
      request.status = 'rejected'
      request.coachId = coachId
      request.rejectionReason = reason
      request.rejectedAt = new Date()
      await request.save()
      return request
    } catch (error) {
      throw new Error(`Failed to reject custom quit plan request: ${error.message}`);
    }
  }
}
module.exports = new QuitPlanService();