const MemberShipPlan = require("../models/memberShipPlan.model");


class MemberShipPlanService {
    async createPackage(data) {
        try {
            const package = await MemberShipPlan.create(data);
            await package.save();
            return package;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async getAllPackages() {
        try {
            return await MemberShipPlan.find({}).select('-__v');
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async getPackageById(id) {
        try {
            const package = await MemberShipPlan.findById(id).select('-__v');
            if (!package) {
                throw new Error('Package not found');
            }
            return package;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async updatePackage(id, data) {
        try {
            const package = await MemberShipPlan.findByIdAndUpdate(id, data, { new: true }).select('-__v');
            if (!package) {
                throw new Error('Package not found');
            }
            return package;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async deletePackage(id) {
        try {
            const package = await MemberShipPlan.findByIdAndDelete(id).select('-__v');
            if (!package) {
                throw new Error('Package not found');
            }
            return package;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = new MemberShipPlanService();