const User = require("../models/user.models");
const MemberShipPlan = require("../models/memberShipPlan.model");
const UserMembership = require("../models/userMemberShip.model");

// Thêm import Order và Payment models
const Order = require("../models/order.model");
const Payment = require("../models/payment.model");

class UserMemberShipService {
    async registerPackage({ userId, packageId, durationType }) {
        try {
            const user = await User.findById(userId)
            const packageData = await MemberShipPlan.findById(packageId)

            if (!user || !packageData) {
                throw new Error('User hoặc gói thành viên không tồn tại')
            }

            if (packageData.name === 'Base') {
                throw new Error('Gói Base là miễn phí, không cần đăng ký')
            }

            let durationInDays;
            let price;

            if (durationType === "week") {
                durationInDays = 7;
                price = Math.round(packageData.price / 4);
            } else if (durationType === "month") {
                durationInDays = 30;
                price = packageData.price;
            } else {
                durationInDays = packageData.duration;
                price = packageData.price;
            }

            const startDate = new Date();
            const endDate = new Date(startDate.getTime() + durationInDays * 24 * 60 * 60 * 1000);

            const userMemberShip = new UserMembership({
                userId,
                memberShipPlanId: packageId,
                startDate,
                endDate,
                paymentStatus: 'pending',
                price: price
            })

            await userMemberShip.save()
            return userMemberShip
        } catch (error) {
            throw new Error(error.message)
        }
    }

    // Thêm phương thức mới để kích hoạt gói thành viên từ orderCode
    async activateFromOrderCode(orderCode) {
        try {
            // Tìm order với orderCode
            const order = await Order.findOne({ orderCode }).populate('memberShipPlanId');
            if (!order) {
                throw new Error('Không tìm thấy đơn hàng với mã này');
            }

            // Kiểm tra xem order đã được thanh toán chưa
            const payment = await Payment.findOne({ orderId: order._id });
            if (!payment) {
                throw new Error('Không tìm thấy thông tin thanh toán cho đơn hàng này');
            }

            // Kiểm tra xem đã có gói thành viên active nào cho user này chưa
            const existingMembership = await UserMembership.findOne({
                userId: order.userId,
                paymentStatus: 'paid',
                endDate: { $gte: new Date() }
            });

            if (existingMembership) {
                throw new Error('User này đã có gói thành viên đang hoạt động');
            }

            // Xác định thời hạn gói dựa trên thông tin gói
            const packageData = order.memberShipPlanId;
            if (!packageData) {
                throw new Error('Không tìm thấy thông tin gói thành viên');
            }

            // Tạo gói thành viên mới
            const startDate = new Date();
            const endDate = new Date(startDate.getTime() + packageData.duration * 24 * 60 * 60 * 1000);

            const userMembership = new UserMembership({
                userId: order.userId,
                memberShipPlanId: packageData._id,
                startDate,
                endDate,
                paymentStatus: 'paid',
                price: order.totalAmount,
                paymentInfo: {
                    orderId: orderCode,
                    amount: order.totalAmount,
                    createDate: payment.createdAt.toISOString(),
                    transactionId: payment.transactionId || 'MANUAL_ACTIVATION',
                    paymentDate: new Date(),
                    bankCode: payment.paymentDetails?.vnp_BankCode || 'UNKNOWN'
                }
            });

            await userMembership.save();

            return {
                membership: userMembership,
                package: packageData,
                duration: packageData.duration,
                activatedAt: startDate,
                expiresAt: endDate
            };
        } catch (error) {
            throw new Error(`Không thể kích hoạt gói thành viên: ${error.message}`);
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

    /**
     * Kích hoạt gói thành viên sau khi thanh toán thành công
     */
    async activatePackage(userMembershipId, paymentInfo = {}) {
        try {
            const userMembership = await UserMembership.findById(userMembershipId);
            if (!userMembership) {
                throw new Error('Không tìm thấy đăng ký gói thành viên');
            }

            if (userMembership.paymentStatus === 'paid') {
                throw new Error('Gói thành viên đã được kích hoạt');
            }

            // Cập nhật trạng thái thanh toán và thông tin thanh toán
            userMembership.paymentStatus = 'paid';
            userMembership.paymentInfo = {
                ...userMembership.paymentInfo,
                ...paymentInfo,
                paymentDate: new Date()
            };

            await userMembership.save();
            return userMembership;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Kiểm tra và cập nhật các gói thành viên đã hết hạn
     */
    async checkAndUpdateExpiredMemberships() {
        try {
            const result = await UserMembership.updateMany(
                {
                    paymentStatus: 'paid',
                    endDate: { $lt: new Date() }
                },
                {
                    paymentStatus: 'expired'
                }
            );

            return {
                modifiedCount: result.modifiedCount,
                message: `Đã cập nhật ${result.modifiedCount} gói thành viên hết hạn`
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Lấy thông tin chi tiết gói thành viên của user
     */
    async getUserMembershipDetails(userId) {
        try {
            // Cập nhật các gói hết hạn trước
            await this.checkAndUpdateExpiredMemberships();

            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User không tồn tại');
            }

            // Lấy gói đang hoạt động
            const activeMembership = await UserMembership.findOne({
                userId,
                paymentStatus: 'paid',
                endDate: { $gte: new Date() }
            }).populate('memberShipPlanId');

            // Lấy gói Base làm mặc định
            const basePlan = await MemberShipPlan.findOne({ name: 'Base' });

            let membershipDetails = {
                hasActiveMembership: false,
                currentPlan: basePlan,
                features: basePlan ? basePlan.features : [],
                limitations: basePlan ? basePlan.limitations : {},
                daysLeft: 0,
                isExpiringSoon: false,
                endDate: null,
                canUpgrade: true,
                membershipId: null
            };

            if (activeMembership) {
                const daysLeft = Math.ceil((activeMembership.endDate - new Date()) / (1000 * 60 * 60 * 24));

                membershipDetails = {
                    hasActiveMembership: true,
                    currentPlan: activeMembership.memberShipPlanId,
                    features: activeMembership.memberShipPlanId.features,
                    limitations: activeMembership.memberShipPlanId.limitations,
                    daysLeft: daysLeft,
                    isExpiringSoon: daysLeft <= 7,
                    endDate: activeMembership.endDate,
                    canUpgrade: activeMembership.memberShipPlanId.name !== 'Premium',
                    membershipId: activeMembership._id,
                    startDate: activeMembership.startDate,
                    price: activeMembership.price
                };
            }

            return membershipDetails;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = new UserMemberShipService()
