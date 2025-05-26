const User = require("../models/user.models");
const bcrypt = require("bcryptjs");
const ErrorWithStatus = require("../utils/errorWithStatus");
const { StatusCodes } = require("http-status-codes");
const { generateToken } = require("../middlewares/jwt");
const { cloudinary } = require("../configs/cloudinary.config");

class UserService {
  async getUserById(id) {
    return await User.findById(id).select('-password -refreshToken');
  }

  async getAllUser() {
    return await User.find().select('-password -refreshToken');
  }

  async updateInfo(userId, { gender, yob, userName, profilePicture, bio, phone, address, email }) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ErrorWithStatus({
        status: StatusCodes.NOT_FOUND,
        message: "User not found",
      });
    }

    if (userName && userName !== user.userName) {
      const existingUserName = await User.findOne({ userName, _id: { $ne: userId } });
      if (existingUserName) {
        throw new ErrorWithStatus({
          status: StatusCodes.BAD_REQUEST,
          message: "Username is already taken",
        });
      }
    }


    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email, _id: { $ne: userId } });
      if (existingEmail) {
        throw new ErrorWithStatus({
          status: StatusCodes.BAD_REQUEST,
          message: "Email is already taken",
        });
      }
    }


    if (gender) user.gender = gender;
    if (yob) user.dateOfBirth = new Date(yob);
    if (userName) user.userName = userName;
    if (profilePicture) user.profilePicture = profilePicture;
    if (bio) user.bio = bio;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (email) user.email = email;

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

  async updateAvatar(userId, profilePictureUrl) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.isActive || user.isDeleted) {
        throw new Error('User not found or inactive');
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: { profilePicture: profilePictureUrl } },
        { new: true, runValidators: true }
      ).select('userName email profilePicture role');

      return updatedUser;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async uploadAvatar(userId, fileInfo) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.isActive || user.isDeleted) {
        throw new Error('User not found or inactive');
      }

      const imageUrl = fileInfo.path;

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: { profilePicture: imageUrl } },
        { new: true, runValidators: true }
      ).select('userName email profilePicture role');

      return updatedUser;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async uploadAvatarManual(userId, imageData) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.isActive || user.isDeleted) {
        throw new Error('User not found or inactive');
      }

      // Upload trực tiếp lên Cloudinary (cho base64 hoặc buffer)
      const uploadResult = await cloudinary.uploader.upload(imageData, {
        folder: 'QuitSmoke',
        transformation: [{ width: 500, height: 500, crop: 'limit' }],
      });

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: { profilePicture: uploadResult.secure_url } },
        { new: true, runValidators: true }
      ).select('userName email profilePicture role');

      return updatedUser;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getUserStats(userId) {
    try {
      const Follow = require("../models/follow.model");

      const user = await User.findById(userId).select('-password -refreshToken');
      if (!user || !user.isActive || user.isDeleted) {
        throw new Error('User not found or inactive');
      }

      // Đếm số followers
      const followersCount = await Follow.countDocuments({
        followed: userId,
        status: 'active'
      });

      // Đếm số following
      const followingCount = await Follow.countDocuments({
        following: userId,
        status: 'active'
      });

      return {
        user,
        stats: {
          followersCount,
          followingCount
        }
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async searchUsers(searchQuery, currentUserId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const searchFilter = {
        isActive: true,
        isDeleted: false,
        _id: { $ne: currentUserId }, // Exclude current user
        $or: [
          { userName: { $regex: searchQuery, $options: 'i' } },
          { email: { $regex: searchQuery, $options: 'i' } }
        ]
      };

      const users = await User.find(searchFilter)
        .select('userName email profilePicture role')
        .skip(skip)
        .limit(limit)
        .sort({ userName: 1 });

      const totalUsers = await User.countDocuments(searchFilter);

      return {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          hasNextPage: page < Math.ceil(totalUsers / limit),
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

module.exports = new UserService();