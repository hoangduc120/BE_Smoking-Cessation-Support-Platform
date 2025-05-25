const MemberShipPlanService = require("../services/MemberShipPlan.service");


class MemberShipPlanController {
    async createPackage(req, res) {
        try {
            const package = await MemberShipPlanService.createPackage(req.body)
            res.status(201).json({
                success: true,
                message: 'Package created successfully',
                data: package
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
            const package = await MemberShipPlanService.getPackageById(req.params.id)
            res.status(200).json({
                success: true,
                message: 'Package fetched successfully',
                data: package
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
    async updatePackage(req, res) {
        try {
            const package = await MemberShipPlanService.updatePackage(req.params.id, req.body)
            res.status(200).json({
                success: true,
                message: 'Package updated successfully',
                data: package
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