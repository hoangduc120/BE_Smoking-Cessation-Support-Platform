const QuitPlan = require('../models/quitPlan.model');
const mongoose = require('mongoose');
const badgeService = require('./badge.service'); // 🆕 Import để tặng huy hiệu

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

// 🆕 Đánh dấu kế hoạch hoàn thành và tặng huy hiệu
exports.markPlanAsCompleted = async (planId, userId) => {
  const plan = await QuitPlan.findOne({ _id: planId, userId });
  if (!plan) throw new Error('Plan not found');

  plan.status = "completed";
  await plan.save();

  // 🏅 Thưởng huy hiệu milestone
  await badgeService.awardBadgeIfNeeded(userId, "milestone");

  return plan;
};
