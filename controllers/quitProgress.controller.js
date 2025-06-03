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
}

module.exports = new QuitProgressController()
