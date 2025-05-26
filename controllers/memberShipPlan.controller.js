const MemberShipPlanService = require("../services/memberShipPlan.service");


class MemberShipPlanController {
    async createPackage(req, res) {
        try {
            const packageData = await MemberShipPlanService.createPackage(req.body)
            res.status(201).json({
                success: true,
                message: 'Package created successfully',
                data: packageData
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
    async getAllPackages(req, res) {
        try {
            const packages = await MemberShipPlanService.getAllPackages()
            res.status(200).json({
                success: true,
                message: 'Packages fetched successfully',
                data: packages
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
    async getPackageById(req, res) {
        try {
            const packageData = await MemberShipPlanService.getPackageById(req.params.id)
            res.status(200).json({
                success: true,
                message: 'Package fetched successfully',
                data: packageData
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
    async updatePackage(req, res) {
        try {
            const packageData = await MemberShipPlanService.updatePackage(req.params.id, req.body)
            res.status(200).json({
                success: true,
                message: 'Package updated successfully',
                data: packageData
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
    async deletePackage(req, res) {
        try {
            await MemberShipPlanService.deletePackage(req.params.id)
            res.status(200).json({
                success: true,
                message: 'Package deleted successfully'
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
}
module.exports = new MemberShipPlanController()