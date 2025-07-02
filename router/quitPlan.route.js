const express = require('express');
const router = express.Router();
const quitPlanController = require('../controllers/quitPlan.controller');
const { authMiddleware, restrictTo } = require('../middlewares/authMiddleware');
const { checkCustomQuitPlanAccess } = require('../middlewares/membershipMiddleware');

// Routes cụ thể phải đặt trước routes có parameter
router.post('/quitplans/select', authMiddleware, restrictTo('user'), quitPlanController.selectQuitPlan);
router.post('/quitplans/cancel', authMiddleware, restrictTo('user'), quitPlanController.cancelQuitPlan);
router.get('/quitplans/can-cancel', authMiddleware, restrictTo('user'), quitPlanController.canCancelQuitPlan);
router.get('/quitplans/current', authMiddleware, restrictTo('user'), quitPlanController.getUserCurrentPlan);
router.get('/quitplans/template', authMiddleware, restrictTo('coach'), quitPlanController.getTemplatePlans);
router.get('/quitplans/history', authMiddleware, restrictTo('user'), quitPlanController.getAllUserPlanHistory);
router.get('/quitplans/:planId/completion', authMiddleware, quitPlanController.getCompleteByPlanId);


router.post("/quitplans/custom", authMiddleware, checkCustomQuitPlanAccess, restrictTo('user'), quitPlanController.createCustomQuitPlan);
router.get("/quitplans/custom", authMiddleware, restrictTo('coach', 'user'), quitPlanController.getCustomQuitPlan);
router.post("/quitplans/custom/:requestId/approve", authMiddleware, restrictTo('coach'), quitPlanController.approveCustomQuitPlanRequest);
router.post("/quitplans/custom/:requestId/reject", authMiddleware, restrictTo('coach'), quitPlanController.rejectCustomQuitPlanRequest);

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
router.get('/quitplans/:quitPlanId/duration-stats', authMiddleware, restrictTo('coach'), quitPlanController.getQuitPlanDurationStats);
router.put('/quitplan-stages/:id', authMiddleware, restrictTo('coach'), quitPlanController.updateQuitPlanStage);

router.put('/quitplan-stages/:id/complete', authMiddleware, restrictTo('user'), quitPlanController.completeStage);

router.put('/quitplans/:planId/complete', authMiddleware, restrictTo('user'), quitPlanController.completePlan);

router.delete('/quitplan-stages/:id', authMiddleware, restrictTo('coach', 'admin'), quitPlanController.deleteQuitPlanStage);

router.post('/quitplans/:quitPlanId/badges', authMiddleware, restrictTo('coach'), quitPlanController.awardBadgeToQuitPlan);
router.get('/quitplans/:quitPlanId/badges', authMiddleware, quitPlanController.getQuitPlanBadges);
router.get('/quitplans/:quitPlanId/badge', authMiddleware, restrictTo('coach'), quitPlanController.getBadgeByPlanId);

router.post('/quitplans/:planId/fix-and-check', authMiddleware, restrictTo('user'), quitPlanController.fixStageTimingAndCheck);

module.exports = router;
