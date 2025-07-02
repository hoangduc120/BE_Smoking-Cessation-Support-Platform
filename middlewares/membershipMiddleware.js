const UserMembership = require('../models/userMemberShip.model');
const MemberShipPlan = require('../models/memberShipPlan.model');
const Blog = require('../models/blog.model');

const checkFeatureAccess = (requiredFeatures) => {
    return async (req, res, next) => {
        try {
            if (req.user.role !== 'user') {
                return next();
            }

            const userId = req.user.id;
            const features = Array.isArray(requiredFeatures) ? requiredFeatures : [requiredFeatures];

            const activeMembership = await UserMembership.findOne({
                userId,
                paymentStatus: 'paid',
                endDate: { $gte: new Date() }
            }).populate('memberShipPlanId');

            let userPlan;

            if (activeMembership) {
                userPlan = activeMembership.memberShipPlanId;
            } else {
                userPlan = await MemberShipPlan.findOne({ name: 'Base' });
            }

            if (!userPlan) {
                return res.status(500).json({
                    success: false,
                    message: 'Không tìm thấy gói thành viên'
                });
            }

            const hasAccess = features.every(feature => userPlan.features.includes(feature));

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: `Tính năng này yêu cầu gói ${userPlan.name === 'Base' ? 'Pro hoặc Premium' : 'cao hơn'}. Vui lòng nâng cấp để sử dụng.`,
                    requiredFeatures: features,
                    userFeatures: userPlan.features,
                    currentPlan: userPlan.name,
                    upgradeRequired: true
                });
            }

            req.userMembership = {
                plan: userPlan,
                features: userPlan.features,
                isActive: !!activeMembership,
                endDate: activeMembership ? activeMembership.endDate : null
            };

            next();
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi khi kiểm tra quyền truy cập tính năng',
                error: error.message
            });
        }
    };
};

const checkBlogPostLimit = async (req, res, next) => {
    try {
        if (req.user.role !== 'user') {
            return next();
        }

        const userId = req.user.id;

        const activeMembership = await UserMembership.findOne({
            userId,
            paymentStatus: 'paid',
            endDate: { $gte: new Date() }
        }).populate('memberShipPlanId');

        let userPlan;
        if (activeMembership) {
            userPlan = activeMembership.memberShipPlanId;
        } else {
            userPlan = await MemberShipPlan.findOne({ name: 'Base' });
        }

        if (!userPlan) {
            return res.status(500).json({
                success: false,
                message: 'Không tìm thấy gói thành viên'
            });
        }

        if (userPlan.limitations && userPlan.limitations.blogPostsPerDay !== null) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const todayPostCount = await Blog.countDocuments({
                user: userId,
                createdAt: {
                    $gte: today,
                    $lt: tomorrow
                },
                isDeleted: false
            });

            if (todayPostCount >= userPlan.limitations.blogPostsPerDay) {
                return res.status(403).json({
                    success: false,
                    message: `Gói ${userPlan.name} chỉ cho phép đăng tối đa ${userPlan.limitations.blogPostsPerDay} bài viết mỗi ngày. Hôm nay bạn đã đăng ${todayPostCount} bài.`,
                    currentPlan: userPlan.name,
                    limit: userPlan.limitations.blogPostsPerDay,
                    used: todayPostCount,
                    upgradeRequired: true
                });
            }
        }

        req.userMembership = {
            plan: userPlan,
            features: userPlan.features,
            isActive: !!activeMembership,
            endDate: activeMembership ? activeMembership.endDate : null
        };

        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi kiểm tra giới hạn bài viết',
            error: error.message
        });
    }
};

const checkCustomQuitPlanAccess = async (req, res, next) => {
    try {
        if (req.user.role !== 'user') {
            return next();
        }

        const userId = req.user.id;

        const activeMembership = await UserMembership.findOne({
            userId,
            paymentStatus: 'paid',
            endDate: { $gte: new Date() }
        }).populate('memberShipPlanId');

        let userPlan;
        if (activeMembership) {
            userPlan = activeMembership.memberShipPlanId;
        } else {
            userPlan = await MemberShipPlan.findOne({ name: 'Base' });
        }

        if (!userPlan) {
            return res.status(500).json({
                success: false,
                message: 'Không tìm thấy gói thành viên'
            });
        }

        if (!userPlan.limitations.customQuitPlanAccess) {
            return res.status(403).json({
                success: false,
                message: 'Chức năng Custom Quit Plan chỉ dành cho gói Premium. Vui lòng nâng cấp để sử dụng tính năng này.',
                currentPlan: userPlan.name,
                requiredPlan: 'Premium',
                upgradeRequired: true
            });
        }

        req.userMembership = {
            plan: userPlan,
            features: userPlan.features,
            isActive: !!activeMembership,
            endDate: activeMembership ? activeMembership.endDate : null
        };

        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi kiểm tra quyền truy cập Custom Quit Plan',
            error: error.message
        });
    }
};

const checkMembershipExpiry = async (req, res, next) => {
    try {
        if (req.user.role !== 'user') {
            return next();
        }

        const userId = req.user.id;

        await UserMembership.updateMany(
            {
                userId,
                paymentStatus: 'paid',
                endDate: { $lt: new Date() }
            },
            {
                paymentStatus: 'expired'
            }
        );

        const activeMembership = await UserMembership.findOne({
            userId,
            paymentStatus: 'paid',
            endDate: { $gte: new Date() }
        }).populate('memberShipPlanId');

        if (activeMembership) {
            const daysLeft = Math.ceil((activeMembership.endDate - new Date()) / (1000 * 60 * 60 * 24));

            req.membershipStatus = {
                hasActiveMembership: true,
                plan: activeMembership.memberShipPlanId,
                daysLeft: daysLeft,
                isExpiringSoon: daysLeft <= 7,
                endDate: activeMembership.endDate
            };
        } else {
            const basePlan = await MemberShipPlan.findOne({ name: 'Base' });
            req.membershipStatus = {
                hasActiveMembership: false,
                plan: basePlan,
                daysLeft: 0,
                isExpiringSoon: false,
                endDate: null
            };
        }

        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi kiểm tra trạng thái thành viên',
            error: error.message
        });
    }
};

const restrictToUsers = (req, res, next) => {
    if (req.user.role !== 'user') {
        return res.status(403).json({
            success: false,
            message: 'Chỉ tài khoản user mới có thể đăng ký gói thành viên'
        });
    }
    next();
};

module.exports = {
    checkFeatureAccess,
    checkBlogPostLimit,
    checkCustomQuitPlanAccess,
    checkMembershipExpiry,
    restrictToUsers
}; 