const User = require('../models/user.models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { StatusCodes } = require('http-status-codes');
const ErrorWithStatus = require('../utils/errorWithStatus');

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
    console.log('refreshToken', refreshToken);
    const user = await User.findOne({ refreshToken });
    if (!user) {
      throw new ErrorWithStatus({
        status: StatusCodes.UNAUTHORIZED,
        message: 'Invalid refresh token',
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      console.log(decoded);
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
}

module.exports = new AuthService();
