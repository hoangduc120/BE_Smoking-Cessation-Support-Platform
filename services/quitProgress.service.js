const QuitPlan = require("../models/quitPlan.model");
const QuitPlanStage = require("../models/quitPlanStage.model");
const QuitProgress = require("../models/quitProgress.model");


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

        const quitProgress = new QuitProgress({
            userId,
            stageId,
            date,
            cigarettesSmoked,
            healthStatus,
            notes,
        });

        return await quitProgress.save();
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
}

module.exports = new QuitProgressService()