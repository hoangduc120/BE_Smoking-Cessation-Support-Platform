const UserMemberShipService = require("../services/userMemberShip.service")

class UserMemberShipController {
    async registerPackage(req, res) {
        try {
            const userMemberShip = await UserMemberShipService.registerPackage(req.body)
            res.status(201).json({
                success: true,
                message: 'Package registered successfully',
                data: userMemberShip
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
    async getActiveMembership(req, res) {
        try {
            const userMemberShip = await UserMemberShipService.getActiveMembership(req.params.userId)
            res.status(200).json({
                success: true,
                message: 'User membership fetched successfully',
                data: userMemberShip
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
    async checkFeatureAccess(req, res) {
        try {
            const hasAccess = await UserMemberShipService.checkFeatureAccess(req.params.userId, req.params.feature)
            res.status(200).json({
                success: true,
                message: 'Feature access checked successfully',
                data: hasAccess
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }

    // Lấy danh sách đăng ký gói thành viên đang chờ thanh toán
    async getPendingMemberships(req, res) {
        try {
            const pendingMemberships = await UserMemberShipService.getPendingMemberships(req.params.userId)
            res.status(200).json({
                success: true,
                message: 'Pending memberships fetched successfully',
                data: pendingMemberships
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }

    // Lấy lịch sử đăng ký gói thành viên
    async getMembershipHistory(req, res) {
        try {
            const history = await UserMemberShipService.getMembershipHistory(req.params.userId)
            res.status(200).json({
                success: true,
                message: 'Membership history fetched successfully',
                data: history
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }

    async getMembershipStatus(req, res) {
        try {
            const status = await UserMemberShipService.getMembershipStatus(req.params.userId)
            res.status(200).json({
                success: true,
                message: 'Membership status fetched successfully',
                data: status
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }

    async getUpgradeOptions(req, res) {
        try {
            const options = await UserMemberShipService.getUpgradeOptions(req.params.userId)
            res.status(200).json({
                success: true,
                message: 'Upgrade options fetched successfully',
                data: options
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }

    async canUpgradePlan(req, res) {
        try {
            const { userId, planId } = req.params;
            const result = await UserMemberShipService.canUpgradePlan(userId, planId)
            res.status(200).json({
                success: true,
                message: 'Upgrade check completed',
                data: result
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
}

module.exports = new UserMemberShipController()