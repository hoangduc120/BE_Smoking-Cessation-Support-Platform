const express = require('express');
const router = express.Router();
const userMemberShipController = require('../controllers/userMemberShip.controller');
const { authMiddleware, restrictTo } = require('../middlewares/authMiddleware');

// User membership routes
router.post("/register", authMiddleware, userMemberShipController.registerPackage);
router.get("/active/:userId", authMiddleware, userMemberShipController.getActiveMembership);
router.get("/access/:userId/:feature", authMiddleware, userMemberShipController.checkFeatureAccess);

module.exports = router; 