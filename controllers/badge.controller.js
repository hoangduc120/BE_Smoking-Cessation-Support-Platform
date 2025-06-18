const badgeService = require('../services/badge.service');
const catchAsync = require('../utils/catchAsync');

const badgeController = {
    // Lấy tất cả huy hiệu của user đã đăng nhập
    getUserBadges: catchAsync(async (req, res) => {
        const userId = req.id;
        const badges = await badgeService.getUserBadges(userId);

        res.status(200).json({
            success: true,
            message: 'User badges retrieved successfully',
            data: badges
        });
    }),

    // Lấy tất cả badges có thể trao (Admin/Coach only)
    getAllBadges: catchAsync(async (req, res) => {
        const badges = await badgeService.getAllBadges();

        res.status(200).json({
            success: true,
            message: 'All badges retrieved successfully',
            data: badges
        });
    }),

    // Tạo badge cho một quitPlan cụ thể (Coach only)
    createBadgeForPlan: catchAsync(async (req, res) => {
        const badgeData = req.body;
        const badge = await badgeService.createBadgeForPlan(badgeData);

        res.status(201).json({
            success: true,
            message: 'Badge created for plan successfully',
            data: badge
        });
    }),

    // Trao huy hiệu thủ công cho user (Admin/Coach only)
    awardBadgeToUser: catchAsync(async (req, res) => {
        const { userId, badgeId } = req.body;

        if (!userId || !badgeId) {
            return res.status(400).json({
                success: false,
                message: 'userId and badgeId are required'
            });
        }

        const userBadge = await badgeService.awardBadgeToUser(userId, badgeId);

        res.status(201).json({
            success: true,
            message: 'Badge awarded successfully',
            data: userBadge
        });
    })
};

module.exports = badgeController; 