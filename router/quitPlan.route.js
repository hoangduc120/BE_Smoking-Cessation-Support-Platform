const express = require('express');
const router = express.Router();
const controller = require('../controllers/quitPlan.controller');
const { authMiddleware, restrictTo } = require('../middlewares/authMiddleware');

// Coach tạo plan mẫu
router.post('/', authMiddleware, restrictTo('coach'), controller.createPlan);

// User apply plan
router.post('/:planId/apply', authMiddleware, restrictTo('user'), controller.applyPlan);

// 🆕 User hoàn thành plan và nhận badge
router.post('/:planId/complete', authMiddleware, restrictTo('user'), controller.completePlan);

// Xem danh sách plan mẫu của coach
router.get('/coach/:coachId', controller.getCoachPlans);

module.exports = router;
