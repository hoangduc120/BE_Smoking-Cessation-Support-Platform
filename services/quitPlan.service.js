const QuitPlan = require('../models/quitPlan.model');
const mongoose = require('mongoose');
const badgeService = require('./badge.service');
const QuitPlanStage = require("../models/quit_plan_stage.model");

exports.createPlan = async ({ coachId, title, description, expectedQuitDate }) => {
  return await QuitPlan.create({
    coachId,
    title,
    description,
    expectedQuitDate,
    status: 'template'
  });
};

exports.applyPlan = async (planId, userId) => {
  const basePlan = await QuitPlan.findById(planId);
  if (!basePlan || basePlan.status !== 'template') throw new Error('Invalid plan');

  return await QuitPlan.create({
    coachId: basePlan.coachId,
    userId,
    title: basePlan.title,
    description: basePlan.description,
    expectedQuitDate: basePlan.expectedQuitDate,
    status: 'pending'
  });
};

exports.getCoachPlans = async (coachId) => {
  return await QuitPlan.find({ coachId, userId: null });
};

exports.getPlanById = async (id) => {
  return await QuitPlan.findById(id);
};

exports.updatePlan = async (id, data) => {
  return await QuitPlan.findByIdAndUpdate(id, data, { new: true });
};

exports.deletePlan = async (id) => {
  return await QuitPlan.findByIdAndDelete(id);
};

// ✅ Đánh dấu hoàn thành kế hoạch + tặng huy hiệu milestone
exports.markPlanAsCompleted = async (planId, userId) => {
  const plan = await QuitPlan.findOne({ _id: planId, userId });
  if (!plan) throw new Error('Plan not found');

  plan.status = "completed";
  await plan.save();

  // 🏅 Thưởng huy hiệu milestone
  await badgeService.awardBadgeIfNeeded(userId, "milestone");

  return plan;
};

// ✅ STAGE: Thêm stage vào kế hoạch
exports.addStageToPlan = async (planId, stageData) => {
  return await QuitPlanStage.create({
    ...stageData,
    quitPlanId: planId
  });
};

// ✅ STAGE: Lấy danh sách stages theo kế hoạch
exports.getStagesByPlan = async (planId) => {
  return await QuitPlanStage.find({ quitPlanId: planId }).sort("order_index");
};

// ✅ STAGE: Cập nhật 1 stage
exports.updateStage = async (stageId, data) => {
  return await QuitPlanStage.findByIdAndUpdate(stageId, data, { new: true });
};

// ✅ STAGE: Xóa 1 stage
exports.deleteStage = async (stageId) => {
  return await QuitPlanStage.findByIdAndDelete(stageId);
};
