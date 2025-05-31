const express = require('express');
const router = express.Router();
const quitPlanController = require('../controllers/quitPlan.controller');
const { authMiddleware, restrictTo } = require('../middlewares/authMiddleware');

router.post('/quitplans', authMiddleware, restrictTo('user', 'coach'), quitPlanController.createQuitPlan);
router.get('/quitplans', authMiddleware, quitPlanController.getQuitPlans);
router.get('/quitplans', authMiddleware, quitPlanController.getQuitPlans);
router.get('/quitplans/:id', authMiddleware, quitPlanController.getQuitPlan);
router.put('/quitplans/:id', authMiddleware, restrictTo('user', 'coach'), quitPlanController.updateQuitPlan);
router.put('/quitplans/:id', authMiddleware, restrictTo('user', 'coach'), quitPlanController.updateQuitPlan);
router.delete('/quitplans/:id', authMiddleware, restrictTo('coach', 'admin'), quitPlanController.deleteQuitPlan);

router.post('/quitplans/:quitPlanId/stages', authMiddleware, restrictTo('coach'), quitPlanController.createQuitPlanStage);

router.get('/quitplans/:quitPlanId/stages', authMiddleware, quitPlanController.getQuitPlanStages);

router.put('/quitplan-stages/:id', authMiddleware, restrictTo('coach'), quitPlanController.updateQuitPlanStage);

router.delete('/quitplan-stages/:id', authMiddleware, restrictTo('coach', 'admin'), quitPlanController.deleteQuitPlanStage);
router.post('/quitplans/:quitPlanId/badges', authMiddleware, restrictTo('coach'), quitPlanController.awardBadgeToQuitPlan);
router.get('/quitplans/:quitPlanId/badges', authMiddleware, quitPlanController.getQuitPlanBadges);

module.exports = router;
