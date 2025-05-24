const catchAsync = require("../utils/catchAsync");
const userService = require("../services/user.service");
const { OK, BAD_REQUEST, CREATED } = require("../configs/response.config");
const passport = require("passport");
const cloudinary = require("../configs/cloudinary.config");
const User = require("../models/user.models");

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

  updateInfo = catchAsync(async (req, res) => {
    const { gender, yob, userName, bio } = req.body;
    const userId = req.id;

    if (!gender || !yob) {
      return BAD_REQUEST(res, "Missing required fields");
    }

    const user = await userService.updateInfo(userId, { gender, yob, userName, bio });
    return OK(res, "Update user information successfully", { user });
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

  uploadAvatar = catchAsync(async (req, res) => {
    if (!req.file) {
      return BAD_REQUEST(res, "No file uploaded");
    }

    const userId = req.id;
    const result = await userService.updateAvatar(userId, req.file.path);
    return OK(res, "Avatar updated successfully", result);
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
        return res.redirect(process.env.FRONTEND_URL || '/');
      } catch (error) {
        return BAD_REQUEST(res, error.message);
      }
    })(req, res, next);
  });

  // Theo dõi người dùng
  followUser = catchAsync(async (req, res) => {
    const userId = req.id;
    const followId = req.params.id;

    const result = await userService.followUser(userId, followId);
    return OK(res, result.message);
  });

  // Hủy theo dõi người dùng
  unfollowUser = catchAsync(async (req, res) => {
    const userId = req.id;
    const unfollowId = req.params.id;

    const result = await userService.unfollowUser(userId, unfollowId);
    return OK(res, result.message);
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
    const { userName, phone, address, dateOfBirth, gender, email, bio } = req.body;

    if (!userName && !phone && !address && !dateOfBirth && !gender && !email && !bio) {
      return BAD_REQUEST(res, "No profile fields provided");
    }

    const user = await userService.updateInfo(userId, {
      userName,
      phone,
      address,
      dateOfBirth,
      gender,
      email,
      bio,
    });
    return OK(res, "Update user profile successfully", { user });
  });

  // Cập nhật avatar từ base64 string
  updateAvatar = catchAsync(async (req, res) => {
    try {
      const { profilePicture } = req.body;
      const userId = req.id;

      if (!profilePicture) {
        return BAD_REQUEST(res, "No profile picture provided");
      }

      // Upload base64 image lên Cloudinary
      const uploadResponse = await cloudinary.uploader.upload(profilePicture, {
        folder: 'QuitSmoke',
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
      });

      // Cập nhật avatar trong database
      const result = await userService.updateAvatar(userId, uploadResponse.secure_url);
      return OK(res, "Update avatar successfully", result);
    } catch (error) {
      return BAD_REQUEST(res, error.message);
    }
  });
}

module.exports = new UserController();  