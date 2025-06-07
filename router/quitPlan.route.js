const express = require('express');
const router = express.Router();
const quitPlanController = require('../controllers/quitPlan.controller');
const { authMiddleware, restrictTo } = require('../middlewares/authMiddleware');

// Routes cụ thể phải đặt trước routes có parameter
router.post('/quitplans/select', authMiddleware, restrictTo('user'), quitPlanController.selectQuitPlan);
router.get('/quitplans/current', authMiddleware, restrictTo('user'), quitPlanController.getUserCurrentPlan);
router.get('/quitplans/template', authMiddleware, restrictTo('coach'), quitPlanController.getTemplatePlans);

// Routes chung
router.post('/quitplans', authMiddleware, restrictTo('coach'), quitPlanController.createQuitPlan);
router.get('/quitplans', authMiddleware, quitPlanController.getQuitPlans);

// Routes với parameter
router.get('/quitplans/:id', authMiddleware, quitPlanController.getQuitPlan);
router.put('/quitplans/:id', authMiddleware, restrictTo('user', 'coach'), quitPlanController.updateQuitPlan);
router.delete('/quitplans/:id', authMiddleware, restrictTo('coach', 'admin'), quitPlanController.deleteQuitPlan);
router.put('/quitplans/:id/fail', authMiddleware, restrictTo('user'), quitPlanController.failQuitPlan);

// Stage routes
router.post('/quitplans/:quitPlanId/stages', authMiddleware, restrictTo('coach'), quitPlanController.createQuitPlanStage);
router.get('/quitplans/:quitPlanId/stages', authMiddleware, quitPlanController.getQuitPlanStages);
router.put('/quitplan-stages/:id', authMiddleware, restrictTo('coach'), quitPlanController.updateQuitPlanStage);
router.put('/quitplan-stages/:id/complete', authMiddleware, restrictTo('user'), quitPlanController.completeStage);
router.put('/quitplans/:planId/complete', authMiddleware, restrictTo('user'), quitPlanController.completePlan);
router.delete('/quitplan-stages/:id', authMiddleware, restrictTo('coach', 'admin'), quitPlanController.deleteQuitPlanStage);

// Badge routes
router.post('/quitplans/:quitPlanId/badges', authMiddleware, restrictTo('coach'), quitPlanController.awardBadgeToQuitPlan);
router.get('/quitplans/:quitPlanId/badges', authMiddleware, quitPlanController.getQuitPlanBadges);

module.exports = router;
