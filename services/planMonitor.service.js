const QuitPlan = require("../models/quitPlan.model");
const QuitPlanStage = require("../models/quitPlanStage.model");
const QuitProgress = require("../models/quitProgress.model");

class PlanMonitorService {
    async getUserPlanStatus(userId) {
        try {
            const plan = await QuitPlan.findOne({ userId, status: "ongoing" })
                .populate('coachId', 'name email');

            if (!plan) {
                return {
                    hasActivePlan: false,
                    plan: null,
                    riskLevel: 'none',
                    message: 'Không có kế hoạch đang thực hiện'
                };
            }

            const stages = await QuitPlanStage.find({ quitPlanId: plan._id })
                .sort({ order_index: 1 });

            const currentDate = new Date();
            let riskLevel = 'low';
            let riskMessage = '';
            let currentStage = null;
            let missedDays = 0;

            for (const stage of stages) {
                if (stage.completed) continue;

                const stageStart = new Date(stage.start_date);
                const stageEnd = new Date(stage.end_date);

                if (currentDate >= stageStart && currentDate <= stageEnd) {
                    currentStage = stage;

                    const daysPassed = Math.floor((currentDate - stageStart) / (1000 * 60 * 60 * 24));
                    const progressCount = await QuitProgress.countDocuments({
                        userId,
                        stageId: stage._id,
                        date: {
                            $gte: stageStart,
                            $lte: currentDate
                        }
                    });

                    missedDays = Math.max(0, daysPassed - progressCount);

                    if (missedDays >= 3) {
                        riskLevel = 'high';
                        riskMessage = `Bạn đã bỏ lỡ ${missedDays} ngày cập nhật. Kế hoạch có thể bị fail!`;
                    } else if (missedDays >= 1) {
                        riskLevel = 'medium';
                        riskMessage = `Bạn chưa cập nhật ${missedDays} ngày. Hãy cập nhật để tránh fail kế hoạch.`;
                    } else {
                        riskMessage = 'Bạn đang thực hiện tốt kế hoạch!';
                    }
                    break;
                }

                if (currentDate > stageEnd && !stage.completed) {
                    const totalDays = Math.ceil((stageEnd - stageStart) / (1000 * 60 * 60 * 24)) + 1;
                    const progressCount = await QuitProgress.countDocuments({
                        userId,
                        stageId: stage._id,
                        date: {
                            $gte: stageStart,
                            $lte: stageEnd
                        }
                    });

                    if (progressCount < totalDays) {
                        riskLevel = 'critical';
                        riskMessage = `Stage "${stage.stage_name}" đã quá hạn và thiếu ${totalDays - progressCount} ngày cập nhật. Kế hoạch sẽ bị fail!`;
                        break;
                    }
                }
            }

            return {
                hasActivePlan: true,
                plan,
                stages,
                currentStage,
                riskLevel,
                riskMessage,
                missedDays,
                totalStages: stages.length,
                completedStages: stages.filter(s => s.completed).length
            };

        } catch (error) {
            throw new Error(`Error getting user plan status: ${error.message}`);
        }
    }

    async getPlansAtRisk() {
        try {
            const ongoingPlans = await QuitPlan.find({ status: "ongoing" })
                .populate('userId', 'userName email')
                .populate('coachId', 'name email');

            const plansAtRisk = [];

            for (const plan of ongoingPlans) {
                const status = await this.getUserPlanStatus(plan.userId);

                if (status.riskLevel === 'high' || status.riskLevel === 'critical') {
                    plansAtRisk.push({
                        plan: plan,
                        riskLevel: status.riskLevel,
                        riskMessage: status.riskMessage,
                        missedDays: status.missedDays,
                        currentStage: status.currentStage
                    });
                }
            }

            return plansAtRisk;
        } catch (error) {
            throw new Error(`Error getting plans at risk: ${error.message}`);
        }
    }

    async getOverallStats() {
        try {
            const totalPlans = await QuitPlan.countDocuments({ status: "ongoing" });
            const completedPlans = await QuitPlan.countDocuments({ status: "completed" });
            const failedPlans = await QuitPlan.countDocuments({ status: "failed" });

            const plansAtRisk = await this.getPlansAtRisk();
            const highRiskCount = plansAtRisk.filter(p => p.riskLevel === 'high').length;
            const criticalRiskCount = plansAtRisk.filter(p => p.riskLevel === 'critical').length;

            const totalFinishedPlans = completedPlans + failedPlans;
            const successRate = totalFinishedPlans > 0 ? Math.round((completedPlans / totalFinishedPlans) * 100) : 0;

            return {
                totalOngoingPlans: totalPlans,
                completedPlans,
                failedPlans,
                successRate,
                plansAtRisk: {
                    total: plansAtRisk.length,
                    high: highRiskCount,
                    critical: criticalRiskCount
                }
            };
        } catch (error) {
            throw new Error(`Error getting overall stats: ${error.message}`);
        }
    }

    async getUserAlerts(userId) {
        try {
            const status = await this.getUserPlanStatus(userId);

            if (!status.hasActivePlan) {
                return [];
            }

            const alerts = [];

            if (status.riskLevel === 'critical') {
                alerts.push({
                    type: 'error',
                    title: 'Kế hoạch có nguy cơ bị fail!',
                    message: status.riskMessage,
                    action: 'Cập nhật tiến độ ngay',
                    urgent: true
                });
            } else if (status.riskLevel === 'high') {
                alerts.push({
                    type: 'warning',
                    title: 'Cảnh báo tiến độ',
                    message: status.riskMessage,
                    action: 'Cập nhật tiến độ hôm nay',
                    urgent: true
                });
            } else if (status.riskLevel === 'medium') {
                alerts.push({
                    type: 'info',
                    title: 'Nhắc nhở cập nhật',
                    message: status.riskMessage,
                    action: 'Cập nhật tiến độ',
                    urgent: false
                });
            }

            return alerts;
        } catch (error) {
            throw new Error(`Error getting user alerts: ${error.message}`);
        }
    }
}

module.exports = new PlanMonitorService(); 