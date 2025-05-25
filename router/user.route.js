const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authMiddleware, restrictTo } = require('../middlewares/authMiddleware');
const { uploadCloud } = require('../configs/cloudinary.config');

// Admin routes
router.get("/all", authMiddleware, restrictTo("admin"), userController.getAllUser);

// Search routes
router.get("/search", authMiddleware, userController.searchUsers);

// Profile routes
router.get("/profile/me", authMiddleware, userController.profile);
router.get("/profile", authMiddleware, userController.getProfile);
router.put("/profile", authMiddleware, userController.updateProfile);

// User management
router.get("/:id", authMiddleware, userController.getUserById);
router.get("/:id/stats", authMiddleware, userController.getUserStats);
router.put("/update-profile", authMiddleware, userController.updateInfo);
router.put("/change-password", authMiddleware, userController.changePassword);

// Avatar routes
router.put("/update-avatar", authMiddleware, userController.updateAvatar);
router.put("/upload-avatar", authMiddleware, uploadCloud.single('avatar'), userController.uploadAvatar);
router.put("/upload-avatar-manual", authMiddleware, userController.uploadAvatarManual);

// Follow/Unfollow routes
router.put("/follow/:id", authMiddleware, userController.followUser);
router.put("/unfollow/:id", authMiddleware, userController.unfollowUser);

// Get followers and following
router.get("/followers/:id", authMiddleware, userController.getFollowers);
router.get("/following/:id", authMiddleware, userController.getFollowing);
router.get("/my-followers", authMiddleware, userController.getFollowers);
router.get("/my-following", authMiddleware, userController.getFollowing);

module.exports = router;
