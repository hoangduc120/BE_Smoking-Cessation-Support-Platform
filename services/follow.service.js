const Follow = require("../models/follow.model");
const User = require("../models/user.models");

class FollowService {
    async followUser(followerId, followedUserId) {
        try {
            const followedUser = await User.findById(followedUserId);
            if (!followedUser || !followedUser.isActive || followedUser.isDeleted) {
                throw new Error('User not found or inactive');
            }
            if (followedUser.role === 'admin') {
                throw new Error('Cannot follow admin users');
            }
            const existingFollow = await Follow.findOne({
                following: followerId,
                followed: followedUserId,
            });
            if (existingFollow) {
                throw new Error('Already following this user');
            }
            if (followerId.toString() === followedUserId.toString()) {
                throw new Error('Cannot follow yourself');
            }
            const newFollow = new Follow({
                following: followerId,
                followed: followedUserId,
                status: 'active',
            });
            await newFollow.save();
            return { message: 'Followed user successfully' };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async unfollowUser(followerId, followedUserId) {
        try {
            const follow = await Follow.findOneAndDelete({
                following: followerId,
                followed: followedUserId,
            });
            if (!follow) {
                throw new Error('Follow relationship not found');
            }
            return { message: 'Unfollowed user successfully' };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getFollowers(userId) {
        try {
            const follows = await Follow.find({
                followed: userId,
                status: 'active',
            }).populate('following', 'userName profilePicture role');
            return follows.map(follow => ({
                _id: follow.following._id,
                userName: follow.following.userName,
                profilePicture: follow.following.profilePicture,
                role: follow.following.role,
            }));
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getFollowing(userId) {
        try {
            const follows = await Follow.find({
                following: userId,
                status: 'active',
            }).populate('followed', 'userName profilePicture role');
            return follows.map(follow => ({
                _id: follow.followed._id,
                userName: follow.followed.userName,
                profilePicture: follow.followed.profilePicture,
                role: follow.followed.role,
            }));
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = new FollowService();
