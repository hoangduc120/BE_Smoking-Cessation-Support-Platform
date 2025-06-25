const quitProgressService = require("../services/quitProgress.service")
const QuitPlanStage = require("../models/quitPlanStage.model")
const QuitProgress = require("../models/quitProgress.model")


class QuitProgressController {
    async createQuitProgress(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Unauthorized" })
            }
            const userId = req.user._id
            const quitProgressData = { ...req.body, userId }
            const quitProgress = await quitProgressService.createQuitProgress(quitProgressData)
            res.status(201).json(quitProgress)
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }

    async getQuitProgressById(req, res) {
        try {
            const { userId, stageId, date } = req.query
            const quitProgress = await quitProgressService.getQuitProgressById(userId, stageId, date)
            res.json(quitProgress)
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
    async getQuitProgress(req, res) {
        try {
            const quitProgress = await quitProgressService.getQuitProgressById(req.params.id)
            res.json(quitProgress)
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
    async updateQuitProgress(req, res) {
        try {
            const quitProgress = await quitProgressService.updateQuitProgress(req.params.id, req.body)
            res.json(quitProgress)
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
    async deleteQuitProgress(req, res) {
        try {
            await quitProgressService.deleteQuitProgress(req.params.id)
            res.json({ message: "Quit progress deleted successfully" })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }

    async getStageProgressStats(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Unauthorized" })
            }
            const userId = req.user._id
            const { stageId } = req.params
            const stats = await quitProgressService.getStageProgressStats(stageId, userId)
            res.json(stats)
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }

    async checkFailedPlans(req, res) {
        try {
            await quitProgressService.checkFailedPlans()
            res.json({ message: "Checked failed plans successfully" })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }

    async checkAndAutoCompleteStages(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Unauthorized" })
            }
            const userId = req.user._id
            await quitProgressService.checkAndAutoCompleteStages(userId)
            res.json({ message: "Checked and auto-completed stages successfully" })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }

    async processExpiredStages(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Unauthorized" })
            }
            const userId = req.user._id
            await quitProgressService.checkFailedPlans()
            res.json({ message: "Processed expired stages successfully" })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }

    async sendTestReminder(req, res) {
        try {
            await quitProgressService.sendDailyReminders()
            res.json({ message: "Test reminder emails sent successfully" })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }

    async debugStageCompletion(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Unauthorized" })
            }
            const userId = req.user._id
            const { stageId } = req.params

            const stage = await QuitPlanStage.findById(stageId);
            if (!stage) {
                return res.status(404).json({ message: "Stage not found" })
            }

            const currentDate = new Date();

            // Logic điểm danh mới - không phụ thuộc vào thời gian
            const checkInCount = await QuitProgress.countDocuments({
                userId,
                stageId
            });

            const totalDays = stage.duration;
            const completionPercentage = (checkInCount / totalDays) * 100;

            const debugInfo = {
                stageInfo: {
                    id: stage._id,
                    name: stage.stage_name,
                    duration: stage.duration,
                    completed: stage.completed,
                    startDate: stage.start_date,
                    endDate: stage.end_date
                },
                timeInfo: {
                    currentDate: currentDate.toISOString(),
                    stageStartDate: stage.start_date ? new Date(stage.start_date).toISOString() : null,
                    stageEndDate: stage.end_date ? new Date(stage.end_date).toISOString() : null,
                    note: "Using check-in based logic - time expiry no longer used"
                },
                progressInfo: {
                    checkInCount: checkInCount,
                    totalDays: totalDays,
                    completionPercentage: Math.round(completionPercentage * 10) / 10,
                    canComplete: completionPercentage >= 75,
                    checkInsNeeded: Math.max(0, Math.ceil(totalDays * 0.75) - checkInCount),
                    checkInRate: `${checkInCount}/${totalDays}`
                }
            };

            // Kiểm tra và thử hoàn thành stage dựa trên logic điểm danh
            if (!stage.completed) {
                await quitProgressService.checkAndCompleteStage(stageId, userId);

                const updatedStage = await QuitPlanStage.findById(stageId);
                debugInfo.stageInfo.completed = updatedStage.completed;

                if (updatedStage.completed) {
                    debugInfo.action = "Stage completed (reached >= 75% check-ins)";
                } else {
                    debugInfo.action = `Stage in progress (${Math.round(completionPercentage * 10) / 10}% check-ins, need ${Math.ceil(totalDays * 0.75) - checkInCount} more)`;
                }
            } else {
                debugInfo.action = "Stage already completed";
            }

            res.json({
                message: "Debug stage completion info",
                debug: debugInfo
            });
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }

    async testExpiredStagesCheck(req, res) {
        try {
            const { runManualExpiredStagesCheck } = require("../cron/checkExpiredStages");
            await runManualExpiredStagesCheck();
            res.json({
                message: "Manual expired stages check completed successfully",
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }

    async debugPlanStatus(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Unauthorized" })
            }
            const userId = req.user._id;
            const { planId } = req.params;

            const QuitPlan = require("../models/quitPlan.model");
            const UserBadge = require("../models/userBadge.model");
            const Badge = require("../models/badge.model");

            // Lấy thông tin plan
            const plan = await QuitPlan.findById(planId)
                .populate('coachId', 'userName email')
                .populate('userId', 'userName email');

            if (!plan) {
                return res.status(404).json({ message: "Plan not found" });
            }

            // Lấy các stages
            const QuitPlanStage = require("../models/quitPlanStage.model");
            const stages = await QuitPlanStage.find({ quitPlanId: planId })
                .sort({ order_index: 1 });

            // Tìm badge theo templateId hoặc planId
            const searchPlanId = plan.templateId || planId;
            const badge = await Badge.findOne({ quitPlanId: searchPlanId });

            // Tìm user badges
            const userBadge = badge ? await UserBadge.findOne({
                userId: userId,
                badgeId: badge._id
            }).populate('badgeId') : null;

            // Lấy tất cả user badges cho user này
            const allUserBadges = await UserBadge.find({ userId })
                .populate('badgeId')
                .sort({ awardedAt: -1 });

            const debugInfo = {
                planInfo: {
                    id: plan._id,
                    title: plan.title,
                    status: plan.status,
                    templateId: plan.templateId,
                    userId: plan.userId,
                    startDate: plan.startDate,
                    endDate: plan.endDate
                },
                stagesInfo: {
                    totalStages: stages.length,
                    completedStages: stages.filter(s => s.completed).length,
                    stages: stages.map(s => ({
                        id: s._id,
                        name: s.stage_name,
                        completed: s.completed,
                        order: s.order_index
                    }))
                },
                badgeInfo: {
                    searchPlanId: searchPlanId,
                    badgeExists: !!badge,
                    badge: badge ? {
                        id: badge._id,
                        name: badge.name,
                        description: badge.description,
                        quitPlanId: badge.quitPlanId
                    } : null,
                    userHasBadge: !!userBadge,
                    userBadge: userBadge ? {
                        id: userBadge._id,
                        awardedAt: userBadge.awardedAt
                    } : null
                },
                allUserBadges: allUserBadges.map(ub => ({
                    id: ub._id,
                    badgeName: ub.badgeId?.name,
                    badgeQuitPlanId: ub.badgeId?.quitPlanId,
                    awardedAt: ub.awardedAt
                }))
            };

            res.json({
                message: "Plan debug information",
                debug: debugInfo
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async canCompleteStageManually(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Unauthorized" })
            }
            const userId = req.user._id
            const { stageId } = req.params

            const result = await quitProgressService.canCompleteStageManually(stageId, userId)
            res.json({
                message: "Stage completion eligibility checked successfully",
                data: result
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
}

module.exports = new QuitProgressController()
