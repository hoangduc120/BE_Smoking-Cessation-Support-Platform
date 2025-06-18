const express = require('express');
const router = express.Router();
const badgeController = require('../controllers/badge.controller');
const { authMiddleware, restrictTo } = require('../middlewares/authMiddleware');

router.get('/my', authMiddleware, badgeController.getUserBadges);

router.get('/all', authMiddleware, restrictTo('admin', 'coach'), badgeController.getAllBadges);

router.post('/create-for-plan', authMiddleware, restrictTo('coach'), badgeController.createBadgeForPlan);

router.post('/award', authMiddleware, restrictTo('admin', 'coach'), badgeController.awardBadgeToUser);


module.exports = router;
