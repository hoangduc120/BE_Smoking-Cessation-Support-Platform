const quitPlanService = require('../services/quitPlan.service');
const { OK, CREATED, BAD_REQUEST } = require("../configs/response.config");
const mongoose = require('mongoose');


class QuitPlanController {
  async createQuitPlan(req, res) {
    try {
      if (!req.user) {
        return BAD_REQUEST(res, 'User authentication required');
      }

      const userIdFromToken = req.user._id;
      const role = req.user.role;

      if (!userIdFromToken) {
        return BAD_REQUEST(res, 'User ID not found in authentication token');
      }

      const quitPlanData = { ...req.body };

      if (role !== 'coach') {
        return BAD_REQUEST(res, 'Only coaches can create quit plans');
      }

      quitPlanData.userId = null;
      quitPlanData.coachId = userIdFromToken;
      quitPlanData.status = 'template';

      const quitPlan = await quitPlanService.createQuitPlan(quitPlanData);
      return OK(res, 'Quit plan created successfully', quitPlan);
    } catch (error) {
      return BAD_REQUEST(res, `Failed to create quit plan: ${error.message}`);
    }
  }
  async getQuitPlans(req, res) {
    try {
      const { userId, coachId, status } = req.query;
      const quitPlans = await quitPlanService.getQuitPlans({
        userId,
        coachId,
        status,
      });
      return OK(res, 'Quit plans fetched successfully', quitPlans);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  }
  async getQuitPlan(req, res) {
    try {
      const { quitPlan } = await quitPlanService.getQuitPlanById(req.params.id)
      return OK(res, 'Quit plan fetched successfully', { quitPlan });
    } catch (error) {
      console.log(error);
      return BAD_REQUEST(res, error.message);
    }
  }
  async updateQuitPlan(req, res) {
    try {
      const quitPlan = await quitPlanService.updateQuitPlan(req.params.id, req.body)
      return OK(res, 'Quit plan updated successfully', quitPlan);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  }
  async deleteQuitPlan(req, res) {
    try {
      await quitPlanService.deleteQuitPlan(req.params.id);
      return OK(res, 'Quit plan deleted successfully');
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  }
  async createQuitPlanStage(req, res) {
    try {
      const stageData = {
        ...req.body,
        quitPlanId: req.params.quitPlanId
      };
      const stages = await quitPlanService.createQuitPlanStage(stageData);
      return OK(res, 'Quit plan stages created successfully', stages);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  }
  async getQuitPlanStages(req, res) {
    try {
      const stages = await quitPlanService.getQuitPlanStages(req.params.quitPlanId);
      return OK(res, 'Quit plan stages fetched successfully', stages);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  }

  async getQuitPlanDurationStats(req, res) {
    try {
      const stats = await quitPlanService.getQuitPlanDurationStats(req.params.quitPlanId);
      return OK(res, 'Quit plan duration stats fetched successfully', stats);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  }
  async updateQuitPlanStage(req, res) {
    try {
      const stage = await quitPlanService.updateQuitPlanStage(req.params.id, req.body)
      return OK(res, 'Quit plan stage updated successfully', stage);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  }
  async deleteQuitPlanStage(req, res) {
    try {
      await quitPlanService.deleteQuitPlanStage(req.params.id);
      return OK(res, 'Quit plan stage deleted successfully');
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  }
  async awardBadgeToQuitPlan(req, res) {
    try {
      const { userId } = req.body;
      const authUserId = req.user?._id;

      const targetUserId = userId || authUserId;

      const badge = await quitPlanService.awardBadgeToQuitPlan(
        req.params.quitPlanId,
        req.body,
        targetUserId
      );
      return OK(res, 'Badge awarded to quit plan successfully', badge);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  }
  async getQuitPlanBadges(req, res) {
    try {
      const badges = await quitPlanService.getQuitPlanBadges(req.params.quitPlanId)
      return OK(res, 'Quit plan badges fetched successfully', badges);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  }
  async getBadgeByPlanId(req, res) {
    try {
      const badge = await quitPlanService.getBadgeByPlanId(req.params.quitPlanId);
      if (!badge) {
        return OK(res, 'No badge found for this quit plan', null);
      }
      return OK(res, 'Badge fetched successfully', badge);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  }
  async selectQuitPlan(req, res) {
    try {
      const userId = req.user._id;
      const { quitPlanId } = req.body
      const plan = await quitPlanService.selectQuitPlan(userId, quitPlanId)
      return OK(res, 'Quit plan selected successfully', plan);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  }
  async getUserCurrentPlan(req, res) {
    try {
      const userId = req.user?._id;
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return BAD_REQUEST(res, 'Invalid user ID');
      }
      const data = await quitPlanService.getUserCurrentPlan(userId);
      if (!data) {
        return OK(res, 'No ongoing plan found', null);
      }
      return OK(res, 'User current plan fetched successfully', data);
    } catch (error) {
      console.error('Controller error:', error);
      return BAD_REQUEST(res, error.message || 'Failed to fetch plan');
    }
  }
  async completeStage(req, res) {
    try {
      const userId = req.user._id
      const { id } = req.params
      const result = await quitPlanService.completeStage(id, userId)
      return OK(res, result.message, result);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  }
  async completePlan(req, res) {
    try {
      const userId = req.user._id
      const { planId } = req.params
      const result = await quitPlanService.completePlan(planId, userId)
      return OK(res, 'Plan completed successfully! Badge awarded.', result);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  }
  async failQuitPlan(req, res) {
    try {
      const userId = req.user._id
      const { id } = req.params
      const plan = await quitPlanService.failQuitPlan(id, userId)
      return OK(res, 'Quit plan failed successfully', plan);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  }
  async getTemplatePlans(req, res) {
    try {
      const { coachId } = req.query
      const plans = await quitPlanService.getTemplatePlans(coachId)
      return OK(res, 'Template plans fetched successfully', plans);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  }

  async getCompleteByPlanId(req, res) {
    try {
      const { planId } = req.params;
      const completionData = await quitPlanService.getCompleteByPlanId(planId);
      return OK(res, 'Plan completion details fetched successfully', completionData);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  }

  async getAllUserPlanHistory(req, res) {
    try {
      const userId = req.user._id;
      const historyData = await quitPlanService.getAllUserPlanHistory(userId);
      return OK(res, 'User plan history fetched successfully', historyData);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  }

  async fixStageTimingAndCheck(req, res) {
    try {
      const userId = req.user._id;
      const { planId } = req.params;

      await quitPlanService.fixStageTiming(planId);

      const hasChanges = await quitPlanService.checkExpiredStages(planId, userId);

      const updatedData = await quitPlanService.getUserCurrentPlan(userId);

      return OK(res, hasChanges ? 'Stage timing fixed and expired stages processed' : 'Stage timing fixed, no expired stages', {
        hasChanges,
        plan: updatedData
      });
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  }

  async cancelQuitPlan(req, res) {
    try {
      const userId = req.user._id;
      const { reason } = req.body; // Optional reason for cancellation

      const result = await quitPlanService.cancelQuitPlan(userId, reason);

      return OK(res, 'Quit plan cancelled successfully', result);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  }

  async canCancelQuitPlan(req, res) {
    try {
      const userId = req.user._id;
      const result = await quitPlanService.canCancelQuitPlan(userId);

      return OK(res, 'Cancel eligibility checked successfully', result);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  }
}

module.exports = new QuitPlanController();