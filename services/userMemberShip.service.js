const User = require("../models/user.models");
const MemberShipPlan = require("../models/memberShipPlan.model");
const UserMembership = require("../models/userMemberShip.model");

class UserMemberShipService {
    async registerPackage({ userId, packageId, durationType }) {
        try {
            const user = await User.findById(userId)
            const packageData = await MemberShipPlan.findById(packageId)
            if (!user || !packageData) {
                throw new Error('User or package not found')
            }
            const duration = durationType === "week" ? 7 : 30
            const price = durationType === "week" ? packageData.price / 4 : packageData.price

            const userMemberShip = new UserMembership({
                userId,
                memberShipPlanId: packageId,
                startDate: new Date(),
                endDate: new Date(new Date().getTime() + duration * 24 * 60 * 60 * 1000),
                paymentStatus: 'pending',
                price: price
            })
            await userMemberShip.save()
            return userMemberShip
        } catch (error) {
            throw new Error(error.message)
        }
    }
    async getActiveMembership(userId) {
        try {
            const memberShip = await UserMembership.findOne({
                userId,
                paymentStatus: 'paid',
                endDate: { $gte: new Date() }
            }).populate('memberShipPlanId').select('-__v')
            if (!memberShip) {
                throw new Error('No active membership found')
            }
            return memberShip
        } catch (error) {
            throw new Error(error.message)
        }
    }
    async checkFeatureAccess(userId, feature) {
        try {
            const user = await User.findById(userId)
            if (!user) {
                throw new Error('User not found')
            }

            // Kiểm tra xem người dùng có gói thành viên đang hoạt động không
            const activeMembership = await UserMembership.findOne({
                userId,
                paymentStatus: 'paid',
                endDate: { $gte: new Date() }
            }).populate('memberShipPlanId');

            if (!activeMembership) {
                return false; // Không có gói thành viên hoạt động
            }

            // Kiểm tra xem tính năng có nằm trong gói thành viên không
            return activeMembership.memberShipPlanId.features.includes(feature);
        } catch (error) {
            throw new Error(error.message)
        }
    }
    // Lấy thông tin đăng ký gói thành viên đang chờ thanh toán
    async getPendingMemberships(userId) {
        try {
            const pendingMemberships = await UserMembership.find({
                userId,
                paymentStatus: 'pending'
            }).populate('memberShipPlanId').select('-__v');

            return pendingMemberships;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    // Lấy lịch sử đăng ký gói thành viên
    async getMembershipHistory(userId) {
        try {
            const history = await UserMembership.find({
                userId
            }).populate('memberShipPlanId').sort({ createdAt: -1 }).select('-__v');

            return history;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getMembershipStatus(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

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

            const basePlan = await MemberShipPlan.findOne({ name: 'Base' });

            let membershipInfo = {
                hasActiveMembership: false,
                currentPlan: basePlan,
                features: basePlan ? basePlan.features : [],
                daysLeft: 0,
                isExpiringSoon: false,
                endDate: null,
                canUpgrade: true
            };

            if (activeMembership) {
                const daysLeft = Math.ceil((activeMembership.endDate - new Date()) / (1000 * 60 * 60 * 24));

                membershipInfo = {
                    hasActiveMembership: true,
                    currentPlan: activeMembership.memberShipPlanId,
                    features: activeMembership.memberShipPlanId.features,
                    daysLeft: daysLeft,
                    isExpiringSoon: daysLeft <= 7,
                    endDate: activeMembership.endDate,
                    canUpgrade: activeMembership.memberShipPlanId.name !== 'Premium'
                };
            }

            return membershipInfo;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async canUpgradePlan(userId, targetPlanId) {
        try {
            const currentStatus = await this.getMembershipStatus(userId);
            const targetPlan = await MemberShipPlan.findById(targetPlanId);

            if (!targetPlan) {
                throw new Error('Target plan not found');
            }

            if (currentStatus.hasActiveMembership) {
                const currentPlanPriority = this.getPlanPriority(currentStatus.currentPlan.name);
                const targetPlanPriority = this.getPlanPriority(targetPlan.name);

                if (targetPlanPriority <= currentPlanPriority) {
                    return {
                        canUpgrade: false,
                        reason: 'Không thể nâng cấp xuống gói thấp hơn hoặc cùng gói hiện tại'
                    };
                }
            }

            return {
                canUpgrade: true,
                reason: 'Có thể nâng cấp'
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    getPlanPriority(planName) {
        const priorities = {
            'Base': 1,
            'Pro': 2,
            'Premium': 3
        };
        return priorities[planName] || 0;
    }

    async getUpgradeOptions(userId) {
        try {
            const currentStatus = await this.getMembershipStatus(userId);
            const allPlans = await MemberShipPlan.find({ price: { $gt: 0 } }).sort({ price: 1 });

            const upgradeOptions = [];

            for (const plan of allPlans) {
                const upgradeCheck = await this.canUpgradePlan(userId, plan._id);
                if (upgradeCheck.canUpgrade) {
                    upgradeOptions.push({
                        ...plan.toObject(),
                        isRecommended: plan.name === 'Pro'
                    });
                }
            }

            return {
                currentPlan: currentStatus.currentPlan,
                upgradeOptions: upgradeOptions
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = new UserMemberShipService()
