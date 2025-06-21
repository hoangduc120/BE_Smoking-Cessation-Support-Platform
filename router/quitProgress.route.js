const express = require("express")
const router = express.Router()
const quitProgressController = require("../controllers/quitProgress.controller")
const { authMiddleware, restrictTo } = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, restrictTo('user'), quitProgressController.createQuitProgress)
router.get('/', authMiddleware, restrictTo('user'), quitProgressController.getQuitProgressById)
router.get('/:id', authMiddleware, restrictTo('user'), quitProgressController.getQuitProgress)
router.put('/:id', authMiddleware, restrictTo('user'), quitProgressController.updateQuitProgress)
router.delete('/:id', authMiddleware, restrictTo('user'), quitProgressController.deleteQuitProgress)

router.get('/stage/:stageId/stats', authMiddleware, restrictTo('user'), quitProgressController.getStageProgressStats)

router.post('/check-auto-complete', authMiddleware, restrictTo('user'), quitProgressController.checkAndAutoCompleteStages)
router.post('/process-expired-stages', authMiddleware, restrictTo('user'), quitProgressController.processExpiredStages)
router.post('/send-test-reminder', authMiddleware, restrictTo('admin'), quitProgressController.sendTestReminder)
router.post('/check-failed-plans', authMiddleware, restrictTo('admin'), quitProgressController.checkFailedPlans)

router.get('/debug-stage/:stageId', authMiddleware, restrictTo('user'), quitProgressController.debugStageCompletion)

module.exports = router;
