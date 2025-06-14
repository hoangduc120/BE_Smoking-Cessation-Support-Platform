const User = require('../models/user.models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { StatusCodes } = require('http-status-codes');
const ErrorWithStatus = require('../utils/errorWithStatus');
const sendMail = require('../utils/sendMail');
class AuthService {
  async login(email, password) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new ErrorWithStatus({
        status: StatusCodes.BAD_REQUEST,
        message: 'Email does not exist',
      });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new ErrorWithStatus({
        status: StatusCodes.BAD_REQUEST,
        message: 'Password is incorrect',
      });
    }
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    user.refreshToken = refreshToken;
    await user.save();
    return {
      user: { id: user._id, email: user.email, role: user.role },
      token,
      refreshToken,
    };
  }

  async refreshToken(refreshToken) {
    const user = await User.findOne({ refreshToken });
    if (!user) {
      throw new ErrorWithStatus({
        status: StatusCodes.UNAUTHORIZED,
        message: 'Invalid refresh token',
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const newAccessToken = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const newRefreshToken = jwt.sign(
        { id: user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );
      user.refreshToken = newRefreshToken;
      await user.save();
      return { newAccessToken, newRefreshToken };
    } catch (error) {
      throw new ErrorWithStatus({
        status: StatusCodes.UNAUTHORIZED,
        message: error.message,
      });
    }
  }
  async register(email, password, userName) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      email,
      userName,
      password: hashedPassword,
      gender: 'other',
      yob: null,
      role: 'user',
    });
    return await newUser.save();
  }

  async forgotPassword(email) {
    if (!email) {
      throw new ErrorWithStatus({
        status: StatusCodes.BAD_REQUEST,
        message: "Missing email input"
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new ErrorWithStatus({
        status: StatusCodes.NOT_FOUND,
        message: "User not found"
      });
    }

    const resetToken = await user.createPasswordChangedToken();
    await user.save();


    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Xin chào ${user.userName}!</h2>
            <h3>Đây là link thay đổi mật khẩu của bạn</h3>
            <p>Bạn đã yêu cầu reset mật khẩu. Click vào link bên dưới để đặt lại mật khẩu:</p>
            <a href="${process.env.URL_SERVER}/auth/reset-password/${resetToken}" 
               style="background-color: #4CAF50; color: white; padding: 14px 25px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px;">
               Đặt lại mật khẩu
            </a>
            <p><strong>Lưu ý:</strong> Link này sẽ hết hạn sau 30 phút.</p>
            <p>Nếu bạn không yêu cầu reset mật khẩu, vui lòng bỏ qua email này.</p>
        </div>`;

    const data = {
      email,
      html,
    };

    const rs = await sendMail(data);
    return {
      success: true,
      message: "Reset password email sent successfully",
      rs,
      resetToken
    };
  }

  async resetPassword(token, password) {
    if (!token || !password) {
      throw new ErrorWithStatus({
        status: StatusCodes.BAD_REQUEST,
        message: "Missing token or password"
      });
    }

    const passwordResetToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      passwordResetToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new ErrorWithStatus({
        status: StatusCodes.BAD_REQUEST,
        message: "Invalid or expired reset token"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangeAt = Date.now();
    await user.save();

    return {
      success: true,
      message: "Password reset successful"
    };
  }
}

module.exports = new AuthService();
