const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authMiddleware, restrictTo } = require('../middlewares/authMiddleware');
const uploadCloud = require('../configs/cloudinary.config');

// Admin routes
router.get("/all", authMiddleware, restrictTo("admin"), userController.getAllUser);

// Profile routes
router.get("/profile/me", authMiddleware, userController.profile);
router.get("/profile", authMiddleware, userController.getProfile);
router.put("/profile", authMiddleware, userController.updateProfile);

// User management
router.get("/:id", authMiddleware, userController.getUserById);
router.put("/update-profile", authMiddleware, userController.updateInfo);
router.put("/change-password", authMiddleware, userController.changePassword);

// Avatar routes
router.put("/update-avatar", authMiddleware, userController.updateAvatar);
router.put("/upload-avatar", authMiddleware, uploadCloud.single('avatar'), userController.uploadAvatar);

// Follow/Unfollow routes
router.put("/follow/:id", authMiddleware, userController.followUser);
router.put("/unfollow/:id", authMiddleware, userController.unfollowUser);

module.exports = router;
