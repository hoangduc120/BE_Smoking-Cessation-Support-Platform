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
            const stageStartDate = new Date(stage.start_date);
            const stageEndDate = new Date(stage.end_date);

            const progressCount = await QuitProgress.countDocuments({
                userId,
                stageId,
                date: {
                    $gte: stageStartDate,
                    $lt: stageEndDate
                }
            });

            const totalDays = stage.duration;
            const completionPercentage = (progressCount / totalDays) * 100;
            const isExpired = currentDate >= stageEndDate;

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
                    stageStartDate: stageStartDate.toISOString(),
                    stageEndDate: stageEndDate.toISOString(),
                    isExpired: isExpired,
                    hoursOverdue: isExpired ? Math.floor((currentDate - stageEndDate) / (1000 * 60 * 60)) : 0
                },
                progressInfo: {
                    progressCount: progressCount,
                    totalDays: totalDays,
                    completionPercentage: completionPercentage,
                    canComplete: completionPercentage >= 75
                }
            };

            if (isExpired && completionPercentage >= 75 && !stage.completed) {
                await quitProgressService.checkAndCompleteStage(stageId, userId);
                debugInfo.action = "Auto-completed stage";
            } else if (isExpired && completionPercentage < 75 && !stage.completed) {
                debugInfo.action = "Stage should fail plan";
            } else {
                debugInfo.action = "No action needed";
            }

            res.json({
                message: "Debug stage completion info",
                debug: debugInfo
            });
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
}

module.exports = new QuitProgressController()
