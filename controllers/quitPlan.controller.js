const catchAsync = require('../utils/catchAsync');
const quitPlanService = require('../services/quitPlan.service');
const { OK, CREATED } = require("../configs/response.config");

// ✅ Tạo kế hoạch mẫu
exports.createPlan = catchAsync(async (req, res) => {
  const coachId = req.id;
  const data = await quitPlanService.createPlan({ ...req.body, coachId });
  return CREATED(res, 'Plan created successfully', data);
});

// ✅ User apply kế hoạch mẫu
exports.applyPlan = catchAsync(async (req, res) => {
  const userId = req.id;
  const { planId } = req.params;
  const data = await quitPlanService.applyPlan(planId, userId);
  return OK(res, 'Plan applied successfully', data);
});

// ✅ Lấy danh sách kế hoạch mẫu của coach
exports.getCoachPlans = catchAsync(async (req, res) => {
  const coachId = req.params.coachId;
  const data = await quitPlanService.getCoachPlans(coachId);
  return OK(res, 'Plans fetched', data);
});

// ✅ Lấy chi tiết kế hoạch
exports.getPlan = catchAsync(async (req, res) => {
  const data = await quitPlanService.getPlanById(req.params.id);
  return OK(res, 'Plan fetched', data);
});

// ✅ Cập nhật kế hoạch mẫu
exports.updatePlan = catchAsync(async (req, res) => {
  const data = await quitPlanService.updatePlan(req.params.id, req.body);
  return OK(res, 'Plan updated', data);
});

// ✅ Xoá kế hoạch
exports.deletePlan = catchAsync(async (req, res) => {
  const data = await quitPlanService.deletePlan(req.params.id);
  return OK(res, 'Plan deleted', data);
});

// ✅ Hoàn thành kế hoạch + tặng huy hiệu
exports.completePlan = catchAsync(async (req, res) => {
  const userId = req.id;
  const { planId } = req.params;
  const plan = await quitPlanService.markPlanAsCompleted(planId, userId);
  return OK(res, 'Plan completed and badge awarded!', { plan });
});

// ✅ Thêm stage vào plan
exports.addStage = catchAsync(async (req, res) => {
  const { planId } = req.params;
  const stage = await quitPlanService.addStageToPlan(planId, req.body);
  return CREATED(res, "Stage added successfully", stage);
});

// ✅ Lấy stage theo plan
exports.getStages = catchAsync(async (req, res) => {
  const { planId } = req.params;
  const stages = await quitPlanService.getStagesByPlan(planId);
  return OK(res, "Stages fetched", stages);
});

// ✅ Cập nhật 1 stage
exports.updateStage = catchAsync(async (req, res) => {
  const stage = await quitPlanService.updateStage(req.params.stageId, req.body);
  return OK(res, "Stage updated", stage);
});

// ✅ Xoá 1 stage
exports.deleteStage = catchAsync(async (req, res) => {
  const stage = await quitPlanService.deleteStage(req.params.stageId);
  return OK(res, "Stage deleted", stage);
});
