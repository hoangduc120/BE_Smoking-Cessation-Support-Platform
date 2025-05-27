const express = require('express');
const router = express.Router();
const userMemberShipController = require('../controllers/userMemberShip.controller');
const { authMiddleware, restrictTo } = require('../middlewares/authMiddleware');

// User membership routes
router.post("/register", authMiddleware, userMemberShipController.registerPackage);
router.get("/active/:userId", authMiddleware, userMemberShipController.getActiveMembership);
router.get("/access/:userId/:feature", authMiddleware, userMemberShipController.checkFeatureAccess);
router.get("/pending/:userId", authMiddleware, userMemberShipController.getPendingMemberships);
router.get("/history/:userId", authMiddleware, userMemberShipController.getMembershipHistory);

module.exports = router; 