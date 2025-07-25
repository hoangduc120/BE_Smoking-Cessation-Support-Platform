const express = require('express');
const router = express.Router();
const memberShipPlanController = require('../controllers/memberShipPlan.controller');
const { authMiddleware, restrictTo } = require('../middlewares/authMiddleware');

// Admin routes - CRUD operations for membership packages
router.post("/", authMiddleware, restrictTo("admin"), memberShipPlanController.createPackage);
router.get("/", memberShipPlanController.getAllPackages);
router.get("/:id", memberShipPlanController.getPackageById);
router.put("/:id", authMiddleware, restrictTo("admin"), memberShipPlanController.updatePackage);
router.delete("/:id", authMiddleware, restrictTo("admin"), memberShipPlanController.deletePackage);

// Special routes for package management
router.put("/update-all/required-fields", authMiddleware, restrictTo("admin"), memberShipPlanController.updateAllPackagesWithRequiredFields);
router.post("/initialize-default", authMiddleware, restrictTo("admin"), memberShipPlanController.initializeDefaultPackages);

module.exports = router; 