const catchAsync = require('../utils/catchAsync');
const quitPlanService = require('../services/quitPlan.service');
const { OK, CREATED, BAD_REQUEST } = require("../configs/response.config");

exports.createPlan = catchAsync(async (req, res) => {
  const coachId = req.id;
  const data = await quitPlanService.createPlan({ ...req.body, coachId });
  return CREATED(res, 'Plan created successfully', data);
});

exports.applyPlan = catchAsync(async (req, res) => {
  const userId = req.id;
  const { planId } = req.params;
  const data = await quitPlanService.applyPlan(planId, userId);
  return OK(res, 'Plan applied successfully', data);
});

exports.getCoachPlans = catchAsync(async (req, res) => {
  const coachId = req.params.coachId;
  const data = await quitPlanService.getCoachPlans(coachId);
  return OK(res, 'Plans fetched', data);
});

// 🆕 Hoàn thành kế hoạch và tặng huy hiệu
exports.completePlan = catchAsync(async (req, res) => {
  const userId = req.id;
  const { planId } = req.params;
  const plan = await quitPlanService.markPlanAsCompleted(planId, userId);
  return OK(res, 'Plan completed and badge awarded!', { plan });
});
