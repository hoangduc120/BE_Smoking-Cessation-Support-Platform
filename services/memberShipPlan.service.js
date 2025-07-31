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
            // Lấy tất cả gói hoặc chỉ các gói active tùy theo yêu cầu
            return await MemberShipPlan.find({}).select('-__v').sort({ level: 1 });
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
            const packageData = await MemberShipPlan.findByIdAndUpdate(
                id,
                { isActive: false },
                { new: true }
            ).select('-__v');
            if (!packageData) {
                throw new Error('Package not found');
            }
            return packageData;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async initializeDefaultPackages() {
        try {
            // Danh sách các gói mặc định
            const defaultPackages = [
                {
                    name: 'Base',
                    description: 'Gói cơ bản miễn phí với các tính năng giới hạn',
                    price: 0,
                    duration: 365, // Free forever
                    level: 1,
                    isActive: true,
                    features: [
                        'basic_features',
                        'community_access'
                    ],
                    limitations: {
                        blogPostsPerDay: 2,
                        maxActiveQuitPlans: 1,
                        customQuitPlanAccess: false
                    }
                },
                {
                    name: 'Pro',
                    description: 'Gói chuyên nghiệp với đầy đủ tính năng cơ bản',
                    price: 99000, // VND per month
                    duration: 30,
                    level: 2,
                    isActive: true,
                    features: [
                        'basic_features',
                        'unlimited_blog_posts',
                        'advanced_quit_plans',
                        'priority_support',
                        'analytics_dashboard',
                        'coach_interaction',
                        'community_access'
                    ],
                    limitations: {
                        blogPostsPerDay: null, // unlimited
                        maxActiveQuitPlans: 3,
                        customQuitPlanAccess: false
                    }
                },
                {
                    name: 'Premium',
                    description: 'Gói cao cấp với tất cả tính năng bao gồm custom quit plan',
                    price: 199000, // VND per month
                    duration: 30,
                    level: 3,
                    isActive: true,
                    features: [
                        'basic_features',
                        'advanced_quit_plans',
                        'priority_support',
                        'custom_quit_plan',
                        'coach_interaction',
                        'community_access'
                    ],
                    limitations: {
                        blogPostsPerDay: null, // unlimited
                        maxActiveQuitPlans: 5,
                        customQuitPlanAccess: true
                    }
                }
            ];

            // Mảng để lưu các gói đã tạo hoặc đã có
            const resultPackages = [];

            // Kiểm tra từng gói một và chỉ tạo mới nếu không tồn tại
            for (const packageData of defaultPackages) {
                const existingPackage = await MemberShipPlan.findOne({ name: packageData.name });

                if (!existingPackage) {
                    // Nếu gói không tồn tại, tạo mới
                    const newPackage = await MemberShipPlan.create(packageData);
                    resultPackages.push(newPackage);
                    console.log(`Đã tạo gói ${packageData.name}`);
                } else {
                    // Nếu gói đã tồn tại, thêm vào kết quả
                    resultPackages.push(existingPackage);
                    console.log(`Gói ${packageData.name} đã tồn tại`);
                }
            }

            return resultPackages;
        } catch (error) {
            throw new Error(`Failed to initialize default packages: ${error.message}`);
        }
    }
    async getPackageByName(name) {
        try {
            const packageData = await MemberShipPlan.findOne({ name, isActive: true }).select('-__v');
            if (!packageData) {
                throw new Error(`Package ${name} not found`);
            }
            return packageData;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async getUpgradeablePackages(currentLevel = 1) {
        try {
            return await MemberShipPlan.find({
                level: { $gt: currentLevel },
                isActive: true,
                price: { $gt: 0 }
            }).select('-__v').sort({ level: 1 });
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async updateExistingPackagesWithRequiredFields() {
        try {
            const basePackage = await MemberShipPlan.findOne({ name: 'Base' });
            const proPackage = await MemberShipPlan.findOne({ name: 'Pro' });
            const premiumPackage = await MemberShipPlan.findOne({ name: 'Premium' });

            if (basePackage) {
                // Cập nhật các trường thiếu cho Base
                await MemberShipPlan.findByIdAndUpdate(basePackage._id, {
                    isActive: true,
                    level: 1,
                    features: basePackage.features && basePackage.features.length > 0 ? basePackage.features : [
                        'basic_features',
                        'community_access'
                    ],
                    limitations: basePackage.limitations || {
                        blogPostsPerDay: 2,
                        maxActiveQuitPlans: 1,
                        customQuitPlanAccess: false
                    },
                    duration: basePackage.duration || 365, // Nếu duration = 0, đặt thành 365
                    description: basePackage.description || 'Gói cơ bản miễn phí với các tính năng giới hạn'
                });
            }

            if (proPackage) {
                // Cập nhật các trường thiếu cho Pro
                await MemberShipPlan.findByIdAndUpdate(proPackage._id, {
                    isActive: true,
                    level: 2,
                    features: proPackage.features && proPackage.features.length > 0 ? proPackage.features : [
                        'basic_features',
                        'unlimited_blog_posts',
                        'advanced_quit_plans',
                        'priority_support',
                        'analytics_dashboard',
                        'coach_interaction',
                        'community_access'
                    ],
                    limitations: proPackage.limitations || {
                        blogPostsPerDay: null,
                        maxActiveQuitPlans: 3,
                        customQuitPlanAccess: false
                    },
                    price: proPackage.price || 99000, // Nếu giá không hợp lý, đặt lại
                    duration: proPackage.duration || 30, // Nếu duration không hợp lý, đặt thành 30
                    description: proPackage.description || 'Gói chuyên nghiệp với đầy đủ tính năng cơ bản'
                });
            }

            if (premiumPackage) {
                // Cập nhật các trường thiếu cho Premium
                await MemberShipPlan.findByIdAndUpdate(premiumPackage._id, {
                    isActive: true,
                    level: 3,
                    features: premiumPackage.features && premiumPackage.features.length > 0 ? premiumPackage.features : [
                        'basic_features',
                        'unlimited_blog_posts',
                        'advanced_quit_plans',
                        'priority_support',
                        'custom_quit_plan',
                        'analytics_dashboard',
                        'coach_interaction',
                        'community_access'
                    ],
                    limitations: premiumPackage.limitations || {
                        blogPostsPerDay: null,
                        maxActiveQuitPlans: 5,
                        customQuitPlanAccess: true
                    },
                    price: premiumPackage.price || 199000, // Nếu giá không hợp lý, đặt lại
                    duration: premiumPackage.duration || 30, // Nếu duration không hợp lý, đặt thành 30
                    description: premiumPackage.description || 'Gói cao cấp với tất cả tính năng bao gồm custom quit plan'
                });
            }

            const updatedPackages = await MemberShipPlan.find({}).sort({ level: 1 });
            return updatedPackages;
        } catch (error) {
            throw new Error(`Không thể cập nhật các gói thành viên: ${error.message}`);
        }
    }
}

module.exports = new MemberShipPlanService();