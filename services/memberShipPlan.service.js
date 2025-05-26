const MemberShipPlan = require("../models/memberShipPlan.model");


class MemberShipPlanService {
    async createPackage(data) {
        try {
            const packageData = await MemberShipPlan.create(data);
            await packageData.save();
            return packageData;
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
            const packageData = await MemberShipPlan.findById(id).select('-__v');
            if (!packageData) {
                throw new Error('Package not found');
            }
            return packageData;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async updatePackage(id, data) {
        try {
            const packageData = await MemberShipPlan.findByIdAndUpdate(id, data, { new: true }).select('-__v');
            if (!packageData) {
                throw new Error('Package not found');
            }
            return packageData;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async deletePackage(id) {
        try {
            const packageData = await MemberShipPlan.findByIdAndDelete(id).select('-__v');
            if (!packageData) {
                throw new Error('Package not found');
            }
            return packageData;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = new MemberShipPlanService();