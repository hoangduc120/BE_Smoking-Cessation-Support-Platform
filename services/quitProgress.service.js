const QuitPlan = require("../models/quitPlan.model");
const QuitPlanStage = require("../models/quitPlanStage.model");
const QuitProgress = require("../models/quitProgress.model");
const quitPlanService = require("./quitPlan.service");


class QuitProgressService {
    async createQuitProgress(quitProgressData) {
        const { userId, stageId, date, cigarettesSmoked, healthStatus, notes } = quitProgressData

        const stage = await QuitPlanStage.findById(stageId)
        if (!stage) {
            throw new Error("Stage not found")
        }
        const quitPlan = await QuitPlan.findById(stage.quitPlanId);
        if (!quitPlan || !quitPlan.userId || quitPlan.userId.toString() !== userId.toString()) {
            throw new Error('User is not associated with this quit plan');
        }

        const existingProgress = await QuitProgress.findOne({
            userId,
            stageId,
            date: {
                $gte: new Date(date).setHours(0, 0, 0, 0),
                $lt: new Date(date).setHours(23, 59, 59, 999)
            }
        });

        if (existingProgress) {
            throw new Error('Progress for this date already exists');
        }

        const quitProgress = new QuitProgress({
            userId,
            stageId,
            date,
            cigarettesSmoked,
            healthStatus,
            notes,
        });

        const savedProgress = await quitProgress.save();

        await this.checkAndCompleteStage(stageId, userId);

        return savedProgress;
    }
    async getQuitProgressById(id) {
        const quitProgress = await QuitProgress.findById(id)
            .populate('userId', 'username email')
            .populate('stageId', 'name description')

        if (!quitProgress) {
            throw new Error("Quit progress not found")
        }

        return quitProgress
    }
    async updateQuitProgress(id, updateData) {
        const quitProgress = await QuitProgress.findById(id)
        if (!quitProgress) {
            throw new Error("Quit progress not found")
        }

        Object.assign(quitProgress, updateData)
        return await quitProgress.save()
    }
    async deleteQuitProgress(id) {
        const quitProgress = await QuitProgress.findById(id)
        if (!quitProgress) {
            throw new Error("Quit progress not found")
        }
        await quitProgress.remove()
    }

    async checkAndCompleteStage(stageId, userId) {
        try {
            const stage = await QuitPlanStage.findById(stageId);
            if (!stage || stage.completed) {
                return;
            }

            const startDate = new Date(stage.start_date);
            const endDate = new Date(stage.end_date);
            const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

            const progressCount = await QuitProgress.countDocuments({
                userId,
                stageId,
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            });

            console.log(`Stage ${stage.stage_name}: ${progressCount}/${totalDays} days completed`);

            if (progressCount >= totalDays) {
                await quitPlanService.completeStage(stageId, userId);
                console.log(`Stage ${stage.stage_name} auto-completed!`);
            }
        } catch (error) {
            console.error('Error in checkAndCompleteStage:', error);
        }
    }

    async checkFailedPlans() {
        try {
            const ongoingPlans = await QuitPlan.find({ status: "ongoing" });

            for (const plan of ongoingPlans) {
                await this.checkPlanForFailure(plan._id, plan.userId);
            }
        } catch (error) {
            console.error('Error checking failed plans:', error);
        }
    }

    async checkPlanForFailure(planId, userId) {
        try {
            const stages = await QuitPlanStage.find({
                quitPlanId: planId
            }).sort({ order_index: 1 });

            const currentDate = new Date();
            const oneDayAgo = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);

            for (const stage of stages) {
                if (stage.completed) continue;

                const stageStartDate = new Date(stage.start_date);
                const stageEndDate = new Date(stage.end_date);

                if (currentDate > stageEndDate && !stage.completed) {
                    const progressCount = await QuitProgress.countDocuments({
                        userId,
                        stageId: stage._id,
                        date: {
                            $gte: stageStartDate,
                            $lte: stageEndDate
                        }
                    });

                    const totalDays = Math.ceil((stageEndDate - stageStartDate) / (1000 * 60 * 60 * 24)) + 1;

                    if (progressCount < totalDays) {
                        await quitPlanService.failQuitPlan(planId, userId);
                        console.log(`Plan ${planId} failed due to insufficient progress in stage ${stage.stage_name}`);
                        return true; // Plan đã bị fail
                    }
                }

                if (currentDate >= stageStartDate && currentDate <= stageEndDate) {
                    const yesterdayProgress = await QuitProgress.findOne({
                        userId,
                        stageId: stage._id,
                        date: {
                            $gte: oneDayAgo.setHours(0, 0, 0, 0),
                            $lt: oneDayAgo.setHours(23, 59, 59, 999)
                        }
                    });

                    const todayProgress = await QuitProgress.findOne({
                        userId,
                        stageId: stage._id,
                        date: {
                            $gte: currentDate.setHours(0, 0, 0, 0),
                            $lt: currentDate.setHours(23, 59, 59, 999)
                        }
                    });

                }
            }

            return false;
        } catch (error) {
            console.error('Error checking plan for failure:', error);
            return false;
        }
    }

    async getStageProgressStats(stageId, userId) {
        try {
            const stage = await QuitPlanStage.findById(stageId);
            if (!stage) {
                throw new Error('Stage not found');
            }

            const startDate = new Date(stage.start_date);
            const endDate = new Date(stage.end_date);
            const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

            const progressCount = await QuitProgress.countDocuments({
                userId,
                stageId,
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            });

            const progressEntries = await QuitProgress.find({
                userId,
                stageId,
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            }).sort({ date: 1 });

            return {
                stage: stage,
                totalDays,
                completedDays: progressCount,
                remainingDays: Math.max(0, totalDays - progressCount),
                completionPercentage: Math.round((progressCount / totalDays) * 100),
                isCompleted: stage.completed,
                progressEntries
            };
        } catch (error) {
            throw new Error(`Error getting stage progress stats: ${error.message}`);
        }
    }
}

module.exports = new QuitProgressService()