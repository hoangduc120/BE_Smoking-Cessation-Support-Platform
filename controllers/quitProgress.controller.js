const quitProgressService = require("../services/quitProgress.service")


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
}

module.exports = new QuitProgressController()
