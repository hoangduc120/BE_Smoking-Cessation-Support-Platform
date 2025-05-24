const User = require("../models/user.models");
const bcrypt = require("bcryptjs");
const ErrorWithStatus = require("../utils/errorWithStatus");
const { StatusCodes } = require("http-status-codes");
const { generateToken } = require("../middlewares/jwt");
const asyncHandler = require("express-async-handler");

class UserService {
  async getUserById(id) {
    return await User.findById(id).select('-password -refreshToken');
  }

  async getAllUser() {
    return await User.find().select('-password -refreshToken');
  }

  async updateInfo(userId, { gender, yob, userName, profilePicture, bio }) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ErrorWithStatus({
        status: StatusCodes.NOT_FOUND,
        message: "User not found",
      });
    }

    // Cập nhật thông tin nếu được cung cấp
    if (gender) user.gender = gender;
    if (yob) user.dateOfBirth = new Date(yob);
    if (userName) user.name = userName;
    if (profilePicture) user.profilePicture = profilePicture;
    if (bio) user.bio = bio;

    await user.save();
    const { password, refreshToken, ...userWithoutSensitiveInfo } = user.toObject();
    return userWithoutSensitiveInfo;
  }

  async changePassword(userId, currentPassword, newPassword, confirmNewPassword) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ErrorWithStatus({
        status: StatusCodes.NOT_FOUND,
        message: "User not found",
      });
    }

    if (user.googleId && !user.password) {
      throw new ErrorWithStatus({
        status: StatusCodes.BAD_REQUEST,
        message: "You need to set a password first since you signed up with Google."
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    const isPasswordMatch = newPassword === confirmNewPassword;
    const isDifferentPassword = currentPassword !== newPassword;

    if (!isDifferentPassword) {
      throw new ErrorWithStatus({
        status: StatusCodes.BAD_REQUEST,
        message: "New password must be different from current password",
      });
    }

    if (!isPasswordMatch) {
      throw new ErrorWithStatus({
        status: StatusCodes.BAD_REQUEST,
        message: "New password and confirm new password do not match",
      });
    }

    if (!isMatch) {
      throw new ErrorWithStatus({
        status: StatusCodes.BAD_REQUEST,
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
  }

  async processGoogleLogin(profile) {
    try {
      let user = await User.findOne({ email: profile.emails[0].value });

      if (user) {
        // Nếu người dùng tồn tại nhưng chưa có googleId, cập nhật googleId
        if (!user.googleId) {
          user.googleId = profile.id;
          await user.save();
        }
      } else {
        // Tạo người dùng mới nếu chưa tồn tại
        const defaultPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);
        user = new User({
          googleId: profile.id,
          email: profile.emails[0].value,
          userName: profile.displayName || `user${Math.floor(Math.random() * 10000)}`,
          role: 'user',
          password: defaultPassword,
          gender: profile._json.gender || 'other',
          dateOfBirth: profile._json.birthday ? new Date(profile._json.birthday) : null,
          profilePicture: profile.photos?.[0]?.value || "https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg",
        });
        await user.save();
      }

      // Tạo token cho người dùng
      const payload = {
        userId: user._id,
        email: user.email,
        role: user.role,
      };

      const accessToken = await generateToken(
        payload,
        process.env.JWT_SECRET,
        process.env.JWT_EXPIRATION || '15m'
      );

      const refreshToken = await generateToken(
        payload,
        process.env.JWT_REFRESH_SECRET,
        process.env.JWT_REFRESH_EXPIRATION || '7d'
      );

      // Lưu refreshToken vào user
      user.refreshToken = refreshToken;
      await user.save();

      return { user, accessToken, refreshToken };
    } catch (error) {
      throw new ErrorWithStatus({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Error processing Google login",
        error: error.message,
      });
    }
  }

  async updateAvatar(userId, imageUrl) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ErrorWithStatus({
        status: StatusCodes.NOT_FOUND,
        message: "User not found",
      });
    }

    user.profilePicture = imageUrl;
    await user.save();

    return { profilePicture: user.profilePicture };
  }

  async followUser(userId, followId) {
    if (userId === followId) {
      throw new ErrorWithStatus({
        status: StatusCodes.BAD_REQUEST,
        message: "You cannot follow yourself",
      });
    }

    const [user, followUser] = await Promise.all([
      User.findById(userId),
      User.findById(followId)
    ]);

    if (!user || !followUser) {
      throw new ErrorWithStatus({
        status: StatusCodes.NOT_FOUND,
        message: "User not found",
      });
    }

    // Kiểm tra xem đã follow hay chưa
    if (user.following.includes(followId)) {
      throw new ErrorWithStatus({
        status: StatusCodes.BAD_REQUEST,
        message: "You are already following this user",
      });
    }

    // Thêm vào danh sách following và followers
    user.following.push(followId);
    followUser.followers.push(userId);

    await Promise.all([user.save(), followUser.save()]);

    return { message: "User followed successfully" };
  }

  async unfollowUser(userId, unfollowId) {
    if (userId === unfollowId) {
      throw new ErrorWithStatus({
        status: StatusCodes.BAD_REQUEST,
        message: "You cannot unfollow yourself",
      });
    }

    const [user, unfollowUser] = await Promise.all([
      User.findById(userId),
      User.findById(unfollowId)
    ]);

    if (!user || !unfollowUser) {
      throw new ErrorWithStatus({
        status: StatusCodes.NOT_FOUND,
        message: "User not found",
      });
    }

    // Kiểm tra xem có đang follow hay không
    if (!user.following.includes(unfollowId)) {
      throw new ErrorWithStatus({
        status: StatusCodes.BAD_REQUEST,
        message: "You are not following this user",
      });
    }

    // Xóa khỏi danh sách following và followers
    user.following = user.following.filter(id => id.toString() !== unfollowId);
    unfollowUser.followers = unfollowUser.followers.filter(id => id.toString() !== userId);

    await Promise.all([user.save(), unfollowUser.save()]);

    return { message: "User unfollowed successfully" };
  }

}

module.exports = new UserService();