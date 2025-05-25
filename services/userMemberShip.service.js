const User = require("../models/user.models");
const MemberShipPlan = require("../models/memberShipPlan.model");
const UserMembership = require("../models/userMemberShip.model");

class UserMemberShipService {
    async registerPackage({ userId, packageId, durationType }) {
        try {
            const user = await User.findById(userId)
            const package = await MemberShipPlan.findById(packageId)
            if (!user || !package) {
                throw new Error('User or package not found')
            }
            const duration = durationType === "week" ? 7 : 30
            const price = durationType === "week" ? package.price / 4 : package.price

            const userMemberShip = new UserMembership({
                userId,
                memberShipPlanId: packageId,
                startDate: new Date(),
                endDate: new Date(new Date().getTime() + duration * 24 * 60 * 60 * 1000),
                paymentStatus: 'pending',
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
            return await user.hasFeatureAccess(feature)
        } catch (error) {
            throw new Error(error.message)
        }
    }
}

module.exports = new UserMemberShipService()
