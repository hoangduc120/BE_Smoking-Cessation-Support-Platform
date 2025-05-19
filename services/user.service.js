const User = require("../models/user.models");
const bcrypt = require("bcryptjs");
const ErrorWithStatus = require("../utils/errorWithStatus");
const { StatusCodes } = require("http-status-codes");

class userService {
  async getUserById(id) {
    return await User.findById(id).select('-password -refreshToken');
  }

  async getAllUser() {
    return await User.find().select('-password -refreshToken');
  }

  async updateInfo(userId, { gender, yob }) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ErrorWithStatus({
        status: StatusCodes.NOT_FOUND,
        message: "User not found",
      });
    }
    user.gender = gender;
    user.yob = yob;
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
      return res.status(400).json({ message: "You need to set a password first since you signed up with Google." });
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
}

module.exports = new userService();