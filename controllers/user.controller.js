const catchAsync = require("../utils/catchAsync");
const userService = require("../services/user.service");
const { OK, BAD_REQUEST, CREATED } = require("../configs/response.config");
const passport = require("passport");
const { cloudinary } = require("../configs/cloudinary.config");
const User = require("../models/user.models");
const followService = require("../services/follow.service");

class UserController {
  getAllUser = catchAsync(async (req, res) => {
    const user = await userService.getAllUser();
    return OK(res, "Get all user successfully", { user });
  });

  getUserById = catchAsync(async (req, res) => {
    const userId = req.params.id;
    const user = await userService.getUserById(userId);
    return OK(res, "Get user by id successfully", { user });
  });

  changePassword = catchAsync(async (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const userId = req.id;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return BAD_REQUEST(res, "Missing required fields");
    }

    try {
      await userService.changePassword(userId, currentPassword, newPassword, confirmNewPassword);
      return OK(res, "Password changed successfully!");
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  });

  profile = catchAsync(async (req, res) => {
    if (!req.jwtDecoded) {
      return BAD_REQUEST(res, "Unauthorized: No user data found");
    }

    const userId = req.jwtDecoded.userId || req.jwtDecoded.id;
    const user = await userService.getUserById(userId);
    return OK(res, "Get profile successfully", { user });
  });

  // Đăng nhập bằng Google
  googleLogin = (req, res, next) => {
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })(req, res, next);
  };

  // Callback sau khi xác thực Google
  googleCallback = catchAsync(async (req, res, next) => {
    passport.authenticate('google', { session: false }, async (err, user) => {
      if (err) {
        return BAD_REQUEST(res, err.message);
      }

      if (!user) {
        return BAD_REQUEST(res, "Authentication failed");
      }

      try {
        // Xử lý đăng nhập Google và tạo token
        const profile = {
          id: user.googleId,
          emails: [{ value: user.email }],
          displayName: user.userName,
          photos: [{ value: user.profilePicture }],
          _json: {
            gender: user.gender,
            birthday: user.dateOfBirth
          }
        };

        const { accessToken, refreshToken } = await userService.processGoogleLogin(profile);

        // Set cookies cho token
        res.cookie('accessToken', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Strict',
          maxAge: 15 * 60 * 1000,
          path: '/',
        });

        res.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/',
        });

        // Chuyển hướng sau khi đăng nhập thành công
        return res.redirect(process.env.FRONTEND_URL || 'https://smoking-cessation-support-platform-liart.vercel.app');
      } catch (error) {
        return BAD_REQUEST(res, error.message);
      }
    })(req, res, next);
  });

  // Lấy profile của user hiện tại
  getProfile = catchAsync(async (req, res) => {
    const userId = req.id;
    const user = await userService.getUserById(userId);
    return OK(res, "Get user profile successfully", { user });
  });

  // Cập nhật profile
  updateProfile = catchAsync(async (req, res) => {
    const userId = req.id;
    const updateData = req.body;

    try {
      const updatedUser = await userService.updateInfo(userId, updateData);
      return OK(res, "Profile updated successfully", { user: updatedUser });
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  });

  // Cập nhật thông tin user
  updateInfo = catchAsync(async (req, res) => {
    const userId = req.id;
    const updateData = req.body;

    try {
      const updatedUser = await userService.updateInfo(userId, updateData);
      return OK(res, "User information updated successfully", { user: updatedUser });
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  });

  // Cập nhật avatar (URL)
  updateAvatar = catchAsync(async (req, res) => {
    const userId = req.id;
    const { profilePicture } = req.body;

    if (!profilePicture) {
      return BAD_REQUEST(res, "Profile picture URL is required");
    }

    try {
      const updatedUser = await userService.updateAvatar(userId, profilePicture);
      return OK(res, "Avatar updated successfully", { user: updatedUser });
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  });

  // Upload avatar file
  uploadAvatar = catchAsync(async (req, res) => {
    const userId = req.id;

    if (!req.file) {
      return BAD_REQUEST(res, "Avatar file is required");
    }

    try {
      const updatedUser = await userService.uploadAvatar(userId, req.file);
      return OK(res, "Avatar uploaded successfully", { user: updatedUser });
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  });

  // Upload avatar manual (base64/buffer)
  uploadAvatarManual = catchAsync(async (req, res) => {
    const userId = req.id;
    const { imageData } = req.body;

    if (!imageData) {
      return BAD_REQUEST(res, "Image data is required");
    }

    try {
      const updatedUser = await userService.uploadAvatarManual(userId, imageData);
      return OK(res, "Avatar uploaded successfully", { user: updatedUser });
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  });

  // Follow user
  followUser = catchAsync(async (req, res) => {
    const followerId = req.id;
    const followedUserId = req.params.id;

    try {
      const result = await followService.followUser(followerId, followedUserId);
      return OK(res, "Followed user successfully", result);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  });

  // Unfollow user
  unfollowUser = catchAsync(async (req, res) => {
    const followerId = req.id;
    const followedUserId = req.params.id;

    try {
      const result = await followService.unfollowUser(followerId, followedUserId);
      return OK(res, "Unfollowed user successfully", result);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  });

  // Lấy danh sách followers
  getFollowers = catchAsync(async (req, res) => {
    const userId = req.params.id || req.id;

    try {
      const followers = await followService.getFollowers(userId);
      return OK(res, "Get followers successfully", { followers });
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  });

  // Lấy danh sách following
  getFollowing = catchAsync(async (req, res) => {
    const userId = req.params.id || req.id;

    try {
      const following = await followService.getFollowing(userId);
      return OK(res, "Get following successfully", { following });
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  });

  // Lấy thống kê user (followers, following count)
  getUserStats = catchAsync(async (req, res) => {
    const userId = req.params.id || req.id;

    try {
      const statsData = await userService.getUserStats(userId);
      return OK(res, "Get user stats successfully", statsData);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  });

  // Tìm kiếm users
  searchUsers = catchAsync(async (req, res) => {
    const { q: searchQuery, page = 1, limit = 10 } = req.query;
    const currentUserId = req.id;

    if (!searchQuery || searchQuery.trim() === '') {
      return BAD_REQUEST(res, "Search query is required");
    }

    try {
      const searchResult = await userService.searchUsers(
        searchQuery.trim(),
        currentUserId,
        parseInt(page),
        parseInt(limit)
      );
      return OK(res, "Search users successfully", searchResult);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  });
}

module.exports = new UserController();  