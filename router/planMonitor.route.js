const express = require('express');
const router = express.Router();
const planMonitorController = require('../controllers/planMonitor.controller');
const { authMiddleware, restrictTo } = require('../middlewares/authMiddleware');

// Routes cho user
router.get('/status', authMiddleware, restrictTo('user'), planMonitorController.getUserPlanStatus);
router.get('/alerts', authMiddleware, restrictTo('user'), planMonitorController.getUserAlerts);

// Routes cho admin/coach
router.get('/plans-at-risk', authMiddleware, restrictTo('admin', 'coach'), planMonitorController.getPlansAtRisk);
router.get('/stats', authMiddleware, restrictTo('admin'), planMonitorController.getOverallStats);

// Route để trigger manual check (admin only)
router.post('/trigger-check', authMiddleware, restrictTo('admin'), planMonitorController.triggerFailedPlansCheck);

module.exports = router; 