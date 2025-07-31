const quitProgressService = require("../services/quitProgress.service")
const QuitPlan = require("../models/quitPlan.model");
const QuitPlanStage = require("../models/quitPlanStage.model");
const QuitProgress = require("../models/quitProgress.model");
const UserBadge = require("../models/userBadge.model");
const Badge = require("../models/badge.model");
const { runManualFailedPlansCheck } = require("../cron/checkFailedPlans");

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
            const { userId, stageId, date, page = 1, limit = 10 } = req.query

            const filters = {};
            if (userId) filters.userId = userId;
            if (stageId) filters.stageId = stageId;
            if (date) filters.date = date;

            const result = await quitProgressService.getQuitProgressList(filters, page, limit)
            res.json(result)
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

            // Check cigarette target compliance
            const latestProgress = await QuitProgress.findOne({
                userId,
                stageId
            }).sort({ date: -1 });

            const meetsCheckInRequirement = completionPercentage >= 75;
            let meetsCigaretteTarget = true;

            if (stage.targetCigarettesPerDay !== undefined && latestProgress) {
                meetsCigaretteTarget = latestProgress.cigarettesSmoked <= stage.targetCigarettesPerDay;
            }

            const debugInfo = {
                stageInfo: {
                    id: stage._id,
                    name: stage.stage_name,
                    goal: stage.goal,
                    targetCigarettesPerDay: stage.targetCigarettesPerDay,
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
                    canComplete: meetsCheckInRequirement && meetsCigaretteTarget,
                    checkInsNeeded: Math.max(0, Math.ceil(totalDays * 0.75) - checkInCount),
                    checkInRate: `${checkInCount}/${totalDays}`,
                    cigaretteTargetInfo: {
                        targetCigarettesPerDay: stage.targetCigarettesPerDay,
                        latestCigarettesSmoked: latestProgress?.cigarettesSmoked || null,
                        meetsCigaretteTarget: meetsCigaretteTarget,
                        hasProgressEntries: !!latestProgress
                    },
                    completionRequirements: {
                        checkInRequirement: {
                            met: meetsCheckInRequirement,
                            current: completionPercentage,
                            required: 75
                        },
                        cigaretteRequirement: {
                            met: meetsCigaretteTarget,
                            current: latestProgress?.cigarettesSmoked || null,
                            target: stage.targetCigarettesPerDay
                        }
                    }
                }
            };

            // Kiểm tra và thử hoàn thành stage dựa trên logic điểm danh
            if (!stage.completed) {
                await quitProgressService.checkAndCompleteStage(stageId, userId);

                const updatedStage = await QuitPlanStage.findById(stageId);
                debugInfo.stageInfo.completed = updatedStage.completed;

                if (updatedStage.completed) {
                    debugInfo.action = "Stage completed (met both check-in and cigarette target requirements)";
                } else {
                    const reasons = [];
                    if (!meetsCheckInRequirement) {
                        reasons.push(`need ${Math.ceil(totalDays * 0.75) - checkInCount} more check-ins`);
                    }
                    if (!meetsCigaretteTarget) {
                        reasons.push(`cigarettes smoked (${latestProgress?.cigarettesSmoked || 0}) exceeds target (${stage.targetCigarettesPerDay})`);
                    }
                    debugInfo.action = `Stage in progress (${Math.round(completionPercentage * 10) / 10}% check-ins): ${reasons.join(' and ')}`;
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

    async getQuitProgressByStage(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Unauthorized" })
            }
            const userId = req.user._id
            const { stageId } = req.params

            const result = await quitProgressService.getQuitProgressByStage(stageId, userId)
            res.json({
                message: "Stage progress retrieved successfully",
                data: result
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }

    async testPlanFailureLogic(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Unauthorized" })
            }
            const userId = req.user._id;
            const { planId } = req.params;

            console.log(`Testing plan failure logic for plan ${planId}, user ${userId}`);

            const result = await quitProgressService.checkPlanForFailure(planId, userId);

            res.json({
                message: "Plan failure logic tested successfully",
                data: {
                    planId,
                    userId,
                    result,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }

    async testFailedPlansCheck(req, res) {
        try {
            console.log(`Running manual failed plans check...`);
            const success = await runManualFailedPlansCheck();

            res.json({
                message: success ? "Failed plans check completed successfully" : "Failed plans check completed with errors",
                success,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }

    async debugPlanFailureRisk(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Unauthorized" })
            }
            const userId = req.user._id;
            const { planId } = req.params;

            const plan = await QuitPlan.findById(planId);
            if (!plan) {
                return res.status(404).json({ message: "Plan not found" });
            }

            const stages = await QuitPlanStage.find({ quitPlanId: planId })
                .sort({ order_index: 1 });

            const currentDate = new Date();
            const debugInfo = {
                planInfo: {
                    id: plan._id,
                    title: plan.title,
                    status: plan.status,
                    startDate: plan.startDate,
                    endDate: plan.endDate
                },
                currentDate: currentDate.toISOString(),
                stagesAnalysis: []
            };

            for (const stage of stages) {
                const checkInCount = await QuitProgress.countDocuments({
                    userId,
                    stageId: stage._id
                });

                const latestProgress = await QuitProgress.findOne({
                    userId,
                    stageId: stage._id
                }).sort({ date: -1 });

                const completionPercentage = (checkInCount / stage.duration) * 100;
                const isStageExpired = stage.end_date && currentDate > new Date(stage.end_date);

                let riskFactors = [];
                let riskLevel = 'low';

                // Phân tích risk factors
                if (isStageExpired) {
                    const daysPastExpiry = Math.floor((currentDate - new Date(stage.end_date)) / (1000 * 60 * 60 * 24));

                    if (daysPastExpiry > 7 && completionPercentage < 75) {
                        riskFactors.push(`CRITICAL: Stage expired ${daysPastExpiry} days ago with ${completionPercentage.toFixed(1)}% check-in`);
                        riskLevel = 'critical';
                    } else if (daysPastExpiry > 3 && completionPercentage < 50) {
                        riskFactors.push(`HIGH: Stage expired ${daysPastExpiry} days ago with ${completionPercentage.toFixed(1)}% check-in`);
                        riskLevel = 'high';
                    } else if (daysPastExpiry > 0) {
                        riskFactors.push(`MEDIUM: Stage expired ${daysPastExpiry} days ago`);
                        if (riskLevel === 'low') riskLevel = 'medium';
                    }
                }

                // Check cigarette target violations
                if (latestProgress && stage.targetCigarettesPerDay !== undefined) {
                    const last7DaysProgress = await QuitProgress.find({
                        userId,
                        stageId: stage._id,
                        date: {
                            $gte: new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000)
                        }
                    }).sort({ date: -1 });

                    const exceededTargetDays = last7DaysProgress.filter(p =>
                        p.cigarettesSmoked > stage.targetCigarettesPerDay
                    ).length;

                    if (exceededTargetDays > 5) {
                        riskFactors.push(`CRITICAL: Exceeded cigarette target ${exceededTargetDays}/7 recent days`);
                        riskLevel = 'critical';
                    } else if (exceededTargetDays > 3) {
                        riskFactors.push(`HIGH: Exceeded cigarette target ${exceededTargetDays}/7 recent days`);
                        if (riskLevel !== 'critical') riskLevel = 'high';
                    }
                }

                // Check progress gaps
                if (latestProgress) {
                    const daysSinceLastProgress = Math.floor((currentDate - new Date(latestProgress.date)) / (1000 * 60 * 60 * 24));

                    if (daysSinceLastProgress > 10) {
                        riskFactors.push(`CRITICAL: No progress for ${daysSinceLastProgress} days`);
                        riskLevel = 'critical';
                    } else if (daysSinceLastProgress > 5) {
                        riskFactors.push(`HIGH: No progress for ${daysSinceLastProgress} days`);
                        if (riskLevel !== 'critical') riskLevel = 'high';
                    }
                } else if (stage.start_date) {
                    const daysSinceStageStart = Math.floor((currentDate - new Date(stage.start_date)) / (1000 * 60 * 60 * 24));
                    if (daysSinceStageStart > 5) {
                        riskFactors.push(`CRITICAL: No progress entries for ${daysSinceStageStart} days since stage start`);
                        riskLevel = 'critical';
                    }
                }

                debugInfo.stagesAnalysis.push({
                    stage: {
                        id: stage._id,
                        name: stage.stage_name,
                        order: stage.order_index,
                        completed: stage.completed,
                        duration: stage.duration,
                        targetCigarettesPerDay: stage.targetCigarettesPerDay,
                        startDate: stage.start_date,
                        endDate: stage.end_date
                    },
                    metrics: {
                        checkInCount,
                        completionPercentage: completionPercentage.toFixed(1),
                        isStageExpired,
                        latestProgressDate: latestProgress?.date,
                        latestCigarettesSmoked: latestProgress?.cigarettesSmoked
                    },
                    riskAssessment: {
                        riskLevel,
                        riskFactors,
                        wouldFailPlan: riskLevel === 'critical'
                    }
                });
            }

            // Tổng hợp risk assessment
            const overallRisk = debugInfo.stagesAnalysis.some(s => s.riskAssessment.riskLevel === 'critical') ? 'critical' :
                debugInfo.stagesAnalysis.some(s => s.riskAssessment.riskLevel === 'high') ? 'high' :
                    debugInfo.stagesAnalysis.some(s => s.riskAssessment.riskLevel === 'medium') ? 'medium' : 'low';

            debugInfo.overallRiskAssessment = {
                riskLevel: overallRisk,
                wouldFailPlan: overallRisk === 'critical',
                recommendation: overallRisk === 'critical' ? 'Plan should be failed' :
                    overallRisk === 'high' ? 'Plan at high risk - needs intervention' :
                        overallRisk === 'medium' ? 'Monitor closely' : 'Plan on track'
            };

            res.json({
                message: "Plan failure risk analysis completed",
                debug: debugInfo
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new QuitProgressController()
