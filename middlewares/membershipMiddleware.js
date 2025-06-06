const UserMembership = require('../models/userMemberShip.model');
const MemberShipPlan = require('../models/memberShipPlan.model');

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

            let userFeatures = [];

            if (activeMembership) {
                userFeatures = activeMembership.memberShipPlanId.features;
            } else {
                const basePlan = await MemberShipPlan.findOne({ name: 'Base' });
                if (basePlan) {
                    userFeatures = basePlan.features;
                }
            }

            const hasAccess = features.every(feature => userFeatures.includes(feature));

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn cần nâng cấp gói thành viên để sử dụng tính năng này',
                    requiredFeatures: features,
                    userFeatures: userFeatures,
                    upgradeRequired: true
                });
            }

            req.userMembership = {
                plan: activeMembership ? activeMembership.memberShipPlanId : await MemberShipPlan.findOne({ name: 'Base' }),
                features: userFeatures,
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
            req.membershipStatus = {
                hasActiveMembership: false,
                plan: null,
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
    checkMembershipExpiry,
    restrictToUsers
}; 