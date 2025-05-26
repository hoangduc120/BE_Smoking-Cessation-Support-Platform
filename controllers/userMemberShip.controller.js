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

}

module.exports = new UserMemberShipController()