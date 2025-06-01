const catchAsync = require('../utils/catchAsync');
const quitPlanService = require('../services/quitPlan.service');
const { OK, CREATED, BAD_REQUEST } = require("../configs/response.config");


class QuitPlanController {
  async createQuitPlan(req, res) {
    try {
      const quitPlan = await quitPlanService.createQuitPlan(req.body);
      return new OK(res, 'Quit plan created successfully', quitPlan);
    } catch (error) {
      return new BAD_REQUEST(res, error.message);
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
      return new OK(res, 'Quit plans fetched successfully', quitPlans);
    } catch (error) {
      return new BAD_REQUEST(res, error.message);
    }
  }
  async getQuitPlan(req, res) {
    try {
      const { quitPlan, badges } = await quitPlanService.getQuitPlanById(req.params.id)
      return new OK(res, 'Quit plan fetched successfully', { quitPlan, badges });
    } catch (error) {
      return new BAD_REQUEST(res, error.message);
    }
  }
  async updateQuitPlan(req, res) {
    try {
      const quitPlan = await quitPlanService.updateQuitPlan(req.params.id, req.body)
      return new OK(res, 'Quit plan updated successfully', quitPlan);
    } catch (error) {
      return new BAD_REQUEST(res, error.message);
    }
  }
  async deleteQuitPlan(req, res) {
    try {
      await quitPlanService.deleteQuitPlan(req.params.id);
      return new OK(res, 'Quit plan deleted successfully');
    } catch (error) {
      return new BAD_REQUEST(res, error.message);
    }
  }
  async createQuitPlanStage(req, res) {
    try {
      const stages = await quitPlanService.createQuitPlanStage(req.body);
      return new OK(res, 'Quit plan stages created successfully', stages);
    } catch (error) {
      return new BAD_REQUEST(res, error.message);
    }
  }
  async getQuitPlanStages(req, res) {
    try {
      const stages = await quitPlanService.getQuitPlanStages(req.params.quitPlanId);
      return new OK(res, 'Quit plan stages fetched successfully', stages);
    } catch (error) {
      return new BAD_REQUEST(res, error.message);
    }
  }
  async updateQuitPlanStage(req, res) {
    try {
      const stage = await quitPlanService.updateQuitPlanStage(req.params.id, req.body)
      return new OK(res, 'Quit plan stage updated successfully', stage);
    } catch (error) {
      return new BAD_REQUEST(res, error.message);
    }
  }
  async deleteQuitPlanStage(req, res) {
    try {
      await quitPlanService.deleteQuitPlanStage(req.params.id);
      return new OK(res, 'Quit plan stage deleted successfully');
    } catch (error) {
      return new BAD_REQUEST(res, error.message);
    }
  }
  async awardBadgeToQuitPlan(req, res) {
    try {
      const badge = await quitPlanService.awardBadgeToQuitPlan(req.params.quitPlanId, req.body)
      return new OK(res, 'Badge awarded to quit plan successfully', badge);
    } catch (error) {
      return new BAD_REQUEST(res, error.message);
    }
  }
  async getQuitPlanBadges(req, res) {
    try {
      const badges = await quitPlanService.getQuitPlanBadges(req.params.quitPlanId)
      return new OK(res, 'Quit plan badges fetched successfully', badges);
    } catch (error) {
      return new BAD_REQUEST(res, error.message);
    }
  }
  async selectQuitPlan(req, res) {
    try {
      const { userId } = req.user;
      const { quitPlanId } = req.body
      const plan = await quitPlanService.selectQuitPlan(userId, quitPlanId)
      return new OK(res, 'Quit plan selected successfully', plan);
    } catch (error) {
      return new BAD_REQUEST(res, error.message);
    }
  }
  async getUserCurrentPlan(req, res) {
    try {
      const { userId } = req.user;
      const data = await quitPlanService.getUserCurrentPlan(userId)
      return new OK(res, 'User current plan fetched successfully', data);
    } catch (error) {
      return new BAD_REQUEST(res, error.message);
    }
  }
  async completeStage(req, res) {
    try {
      const { userId } = req.user
      const { stageId } = req.params
      const stage = await quitPlanService.completeStage(stageId, userId)
      return new OK(res, 'Stage completed successfully', stage);
    } catch (error) {
      return new BAD_REQUEST(res, error.message);
    }
  }
  async failQuitPlan(req, res) {
    try {
      const { userId } = req.user
      const { planId } = req.params
      const plan = await quitPlanService.failQuitPlan(planId, userId)
      return new OK(res, 'Quit plan failed successfully', plan);
    } catch (error) {
      return new BAD_REQUEST(res, error.message);
    }
  }
  async getTemplatePlans(req, res) {
    try {
      const { coachId } = req.query
      const plans = await quitPlanService.getTemplatePlans(coachId)
      return new OK(res, 'Template plans fetched successfully', plans);
    } catch (error) {
      return new BAD_REQUEST(res, error.message);
    }
  }
}

module.exports = new QuitPlanController();