
const followService = require('../services/follow.service.js');

class FollowController {
    async followUser(req, res) {
        const userId = req.id;
        const { followedUserId } = req.params;
        const result = await followService.followUser(userId, followedUserId);
        return OK(res, 'Followed user successfully', result);
    }

    async unfollowUser(req, res) {
        const { followedUserId } = req.params;
        const userId = req.id;
        const result = await followService.unfollowUser(userId, followedUserId);
        return OK(res, 'Unfollowed user successfully', result);
    }

    async getFollowers(req, res) {
        const userId = req.id;
        const followers = await followService.getFollowers(userId);
        return OK(res, 'Followers fetched successfully', followers);
    }

    async getFollowing(req, res) {
        const userId = req.id;
        const following = await followService.getFollowing(userId);
        return OK(res, 'Following fetched successfully', following);
    }
}

module.exports = new FollowController();
