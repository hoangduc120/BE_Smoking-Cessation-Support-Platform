const express = require('express');
const router = express.Router();
const userMemberShipController = require('../controllers/userMemberShip.controller');
const { authMiddleware, restrictTo } = require('../middlewares/authMiddleware');
const { restrictToUsers } = require('../middlewares/membershipMiddleware');

router.post("/register", authMiddleware, restrictToUsers, userMemberShipController.registerPackage);
router.get("/active/:userId", authMiddleware, userMemberShipController.getActiveMembership);
router.get("/access/:userId/:feature", authMiddleware, userMemberShipController.checkFeatureAccess);
router.get("/pending/:userId", authMiddleware, userMemberShipController.getPendingMemberships);
router.get("/history/:userId", authMiddleware, userMemberShipController.getMembershipHistory);

router.get("/status/:userId", authMiddleware, userMemberShipController.getMembershipStatus);
router.get("/upgrade-options/:userId", authMiddleware, restrictToUsers, userMemberShipController.getUpgradeOptions);
router.get("/can-upgrade/:userId/:planId", authMiddleware, restrictToUsers, userMemberShipController.canUpgradePlan);

module.exports = router; 