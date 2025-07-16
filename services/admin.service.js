const User = require("../models/user.models");
const Payment = require("../models/payment.model");
const Order = require("../models/order.model");
const MemberShipPlan = require("../models/memberShipPlan.model");
const UserMemberShip = require("../models/userMemberShip.model");
const bcrypt = require("bcryptjs");
const ErrorWithStatus = require("../utils/errorWithStatus");
const { StatusCodes } = require("http-status-codes");

class AdminService {
    // Lấy tất cả accounts với phân trang và lọc
    async getAllAccounts(options) {
        const { page, limit, role, isActive, search } = options;

        // Tạo query filter
        let filter = { isDeleted: false };

        if (role) {
            filter.role = role;
        }

        if (isActive !== undefined) {
            filter.isActive = isActive;
        }

        if (search) {
            filter.$or = [
                { userName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        // Tính toán skip và limit
        const skip = (page - 1) * limit;

        // Lấy dữ liệu và đếm tổng
        const [accounts, total] = await Promise.all([
            User.find(filter)
                .select('-password -refreshToken -passwordResetToken')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            User.countDocuments(filter)
        ]);

        return {
            accounts,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            }
        };
    }

    // Lấy thông tin chi tiết một account
    async getAccountById(id) {
        const account = await User.findById(id)
            .select('-password -refreshToken -passwordResetToken');

        if (!account) {
            throw new ErrorWithStatus({
                status: StatusCodes.NOT_FOUND,
                message: "Không tìm thấy tài khoản"
            });
        }

        if (account.isDeleted) {
            throw new ErrorWithStatus({
                status: StatusCodes.BAD_REQUEST,
                message: "Tài khoản đã bị xóa"
            });
        }

        return account;
    }

    // Cập nhật trạng thái isActive
    async updateAccountStatus(userId, isActive, adminId) {
        // Kiểm tra user tồn tại
        const user = await User.findById(userId);
        if (!user) {
            throw new ErrorWithStatus({
                status: StatusCodes.NOT_FOUND,
                message: "Không tìm thấy user"
            });
        }

        if (user.isDeleted) {
            throw new ErrorWithStatus({
                status: StatusCodes.BAD_REQUEST,
                message: "Không thể cập nhật tài khoản đã bị xóa"
            });
        }

        // Không cho phép admin tự vô hiệu hóa chính mình
        if (userId === adminId) {
            throw new ErrorWithStatus({
                status: StatusCodes.BAD_REQUEST,
                message: "Không thể thay đổi trạng thái của chính mình"
            });
        }

        // Cập nhật trạng thái
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { isActive },
            { new: true }
        ).select('-password -refreshToken -passwordResetToken');

        return updatedUser;
    }

    // Cập nhật role của user
    async updateUserRole(userId, newRole, adminId) {
        // Kiểm tra user tồn tại
        const user = await User.findById(userId);
        if (!user) {
            throw new ErrorWithStatus({
                status: StatusCodes.NOT_FOUND,
                message: "Không tìm thấy user"
            });
        }

        if (user.isDeleted) {
            throw new ErrorWithStatus({
                status: StatusCodes.BAD_REQUEST,
                message: "Không thể cập nhật tài khoản đã bị xóa"
            });
        }

        // Không cho phép admin thay đổi role của chính mình
        if (userId === adminId) {
            throw new ErrorWithStatus({
                status: StatusCodes.BAD_REQUEST,
                message: "Không thể thay đổi role của chính mình"
            });
        }

        // Cập nhật role
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { role: newRole },
            { new: true }
        ).select('-password -refreshToken -passwordResetToken');

        return updatedUser;
    }

    // Xóa mềm tài khoản
    async deleteAccount(userId, adminId) {
        // Kiểm tra user tồn tại
        const user = await User.findById(userId);
        if (!user) {
            throw new ErrorWithStatus({
                status: StatusCodes.NOT_FOUND,
                message: "Không tìm thấy user"
            });
        }

        if (user.isDeleted) {
            throw new ErrorWithStatus({
                status: StatusCodes.BAD_REQUEST,
                message: "Tài khoản đã bị xóa trước đó"
            });
        }

        // Không cho phép admin xóa chính mình
        if (userId === adminId) {
            throw new ErrorWithStatus({
                status: StatusCodes.BAD_REQUEST,
                message: "Không thể xóa tài khoản của chính mình"
            });
        }

        // Xóa mềm (đánh dấu isDeleted = true)
        const deletedUser = await User.findByIdAndUpdate(
            userId,
            {
                isDeleted: true,
                isActive: false,
                deletedAt: new Date()
            },
            { new: true }
        ).select('-password -refreshToken -passwordResetToken');

        return deletedUser;
    }

    // Khôi phục tài khoản đã xóa
    async restoreAccount(userId, adminId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new ErrorWithStatus({
                status: StatusCodes.NOT_FOUND,
                message: "Không tìm thấy user"
            });
        }

        if (!user.isDeleted) {
            throw new ErrorWithStatus({
                status: StatusCodes.BAD_REQUEST,
                message: "Tài khoản chưa bị xóa"
            });
        }

        // Khôi phục tài khoản
        const restoredUser = await User.findByIdAndUpdate(
            userId,
            {
                isDeleted: false,
                isActive: true,
                $unset: { deletedAt: 1 }
            },
            { new: true }
        ).select('-password -refreshToken -passwordResetToken');

        return restoredUser;
    }

    // Thống kê dashboard
    async getDashboardStats() {
        const [
            totalUsers,
            activeUsers,
            inactiveUsers,
            adminCount,
            userCount,
            coachCount,
            deletedUsers,
            recentUsers
        ] = await Promise.all([
            User.countDocuments({ isDeleted: false }),
            User.countDocuments({ isDeleted: false, isActive: true }),
            User.countDocuments({ isDeleted: false, isActive: false }),
            User.countDocuments({ isDeleted: false, role: 'admin' }),
            User.countDocuments({ isDeleted: false, role: 'user' }),
            User.countDocuments({ isDeleted: false, role: 'coach' }),
            User.countDocuments({ isDeleted: true }),
            User.countDocuments({
                isDeleted: false,
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            })
        ]);

        return {
            users: {
                total: totalUsers,
                active: activeUsers,
                inactive: inactiveUsers,
                deleted: deletedUsers,
                recentRegistrations: recentUsers
            },
            roles: {
                admin: adminCount,
                user: userCount,
                coach: coachCount
            }
        };
    }

    // Lấy hoạt động gần đây
    async getRecentActivity(limit) {
        const recentUsers = await User.find({ isDeleted: false })
            .select('userName email role isActive createdAt updatedAt')
            .sort({ updatedAt: -1 })
            .limit(limit);

        return recentUsers;
    }

    // Reset mật khẩu user
    async resetUserPassword(userId, newPassword, adminId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new ErrorWithStatus({
                status: StatusCodes.NOT_FOUND,
                message: "Không tìm thấy user"
            });
        }

        if (user.isDeleted) {
            throw new ErrorWithStatus({
                status: StatusCodes.BAD_REQUEST,
                message: "Không thể reset mật khẩu cho tài khoản đã bị xóa"
            });
        }

        // Hash mật khẩu mới
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Cập nhật mật khẩu
        await User.findByIdAndUpdate(userId, {
            password: hashedPassword,
            passwordChangeAt: new Date(),
            $unset: {
                passwordResetToken: 1,
                passwordResetExpires: 1
            }
        });

        return true;
    }

    // Cập nhật thông tin user bởi admin
    async updateUserInfo(userId, updateData, adminId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new ErrorWithStatus({
                status: StatusCodes.NOT_FOUND,
                message: "Không tìm thấy user"
            });
        }

        if (user.isDeleted) {
            throw new ErrorWithStatus({
                status: StatusCodes.BAD_REQUEST,
                message: "Không thể cập nhật tài khoản đã bị xóa"
            });
        }

        // Kiểm tra username và email trùng lặp nếu có thay đổi
        if (updateData.userName && updateData.userName !== user.userName) {
            const existingUserName = await User.findOne({
                userName: updateData.userName,
                _id: { $ne: userId }
            });
            if (existingUserName) {
                throw new ErrorWithStatus({
                    status: StatusCodes.BAD_REQUEST,
                    message: "Username đã tồn tại"
                });
            }
        }

        if (updateData.email && updateData.email !== user.email) {
            const existingEmail = await User.findOne({
                email: updateData.email,
                _id: { $ne: userId }
            });
            if (existingEmail) {
                throw new ErrorWithStatus({
                    status: StatusCodes.BAD_REQUEST,
                    message: "Email đã tồn tại"
                });
            }
        }

        // Loại bỏ các trường nhạy cảm
        const { password, refreshToken, passwordResetToken, role, ...allowedUpdates } = updateData;

        // Cập nhật thông tin
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            allowedUpdates,
            { new: true }
        ).select('-password -refreshToken -passwordResetToken');

        return updatedUser;
    }

    // Lấy user theo role
    async getUsersByRole(role, page, limit) {
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find({ role, isDeleted: false })
                .select('-password -refreshToken -passwordResetToken')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            User.countDocuments({ role, isDeleted: false })
        ]);

        return {
            users,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            }
        };
    }

    // Tìm kiếm nâng cao
    async advancedSearchUsers(searchOptions) {
        const {
            keyword,
            role,
            isActive,
            gender,
            dateFrom,
            dateTo,
            page = 1,
            limit = 10
        } = searchOptions;

        let filter = { isDeleted: false };

        if (keyword) {
            filter.$or = [
                { userName: { $regex: keyword, $options: 'i' } },
                { email: { $regex: keyword, $options: 'i' } },
                { phone: { $regex: keyword, $options: 'i' } },
                { bio: { $regex: keyword, $options: 'i' } }
            ];
        }

        if (role) filter.role = role;
        if (isActive !== undefined) filter.isActive = isActive;
        if (gender) filter.gender = gender;

        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) filter.createdAt.$lte = new Date(dateTo);
        }

        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find(filter)
                .select('-password -refreshToken -passwordResetToken')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            User.countDocuments(filter)
        ]);

        return {
            users,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            }
        };
    }

    // Export dữ liệu users
    async exportUsersData(format) {
        const users = await User.find({ isDeleted: false })
            .select('-password -refreshToken -passwordResetToken')
            .sort({ createdAt: -1 });

        if (format === 'csv') {
            // Chuyển đổi sang CSV
            const headers = ['ID', 'Username', 'Email', 'Role', 'IsActive', 'Gender', 'Phone', 'CreatedAt'];
            const csvData = [
                headers.join(','),
                ...users.map(user => [
                    user._id,
                    user.userName,
                    user.email,
                    user.role,
                    user.isActive,
                    user.gender || '',
                    user.phone || '',
                    user.createdAt.toISOString()
                ].join(','))
            ].join('\n');

            return csvData;
        }

        return JSON.stringify(users, null, 2);
    }

    // ============= REVENUE ANALYTICS =============

    // Tổng doanh thu từ việc mua gói thành viên
    async getTotalRevenue() {
        try {
            // Lấy tổng doanh thu từ payments thành công
            const paymentStats = await Payment.aggregate([
                {
                    $match: {
                        paymentStatus: 'success'
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$amount' },
                        totalTransactions: { $sum: 1 }
                    }
                }
            ]);

            // Lấy tổng doanh thu từ userMemberships đã thanh toán
            const membershipStats = await UserMemberShip.aggregate([
                {
                    $match: {
                        paymentStatus: 'paid'
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalMembershipRevenue: { $sum: '$price' },
                        totalMembershipSales: { $sum: 1 }
                    }
                }
            ]);

            // Lấy doanh thu theo từng phương thức thanh toán
            const paymentMethodStats = await Payment.aggregate([
                {
                    $match: {
                        paymentStatus: 'success'
                    }
                },
                {
                    $group: {
                        _id: '$paymentMethod',
                        revenue: { $sum: '$amount' },
                        transactions: { $sum: 1 }
                    }
                }
            ]);

            return {
                totalRevenue: paymentStats[0]?.totalRevenue || 0,
                totalTransactions: paymentStats[0]?.totalTransactions || 0,
                membershipRevenue: membershipStats[0]?.totalMembershipRevenue || 0,
                membershipSales: membershipStats[0]?.totalMembershipSales || 0,
                paymentMethodBreakdown: paymentMethodStats
            };
        } catch (error) {
            throw new ErrorWithStatus(
                "Lỗi khi lấy thống kê doanh thu",
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }

    // Thống kê gói membership được mua nhiều nhất
    async getMembershipPlanStats() {
        try {
            // Thống kê theo Orders
            const orderStats = await Order.aggregate([
                {
                    $match: {
                        orderStatus: 'completed'
                    }
                },
                {
                    $lookup: {
                        from: 'membershipplans',
                        localField: 'memberShipPlanId',
                        foreignField: '_id',
                        as: 'membershipPlan'
                    }
                },
                {
                    $unwind: '$membershipPlan'
                },
                {
                    $group: {
                        _id: '$memberShipPlanId',
                        planName: { $first: '$membershipPlan.name' },
                        planPrice: { $first: '$membershipPlan.price' },
                        planLevel: { $first: '$membershipPlan.level' },
                        totalSales: { $sum: 1 },
                        totalRevenue: { $sum: '$totalAmount' },
                        averageOrderValue: { $avg: '$totalAmount' }
                    }
                },
                {
                    $sort: { totalSales: -1 }
                }
            ]);

            // Thống kê theo UserMemberships
            const membershipStats = await UserMemberShip.aggregate([
                {
                    $match: {
                        paymentStatus: 'paid'
                    }
                },
                {
                    $lookup: {
                        from: 'membershipplans',
                        localField: 'memberShipPlanId',
                        foreignField: '_id',
                        as: 'membershipPlan'
                    }
                },
                {
                    $unwind: '$membershipPlan'
                },
                {
                    $group: {
                        _id: '$memberShipPlanId',
                        planName: { $first: '$membershipPlan.name' },
                        planPrice: { $first: '$membershipPlan.price' },
                        planLevel: { $first: '$membershipPlan.level' },
                        planDuration: { $first: '$membershipPlan.duration' },
                        totalSubscriptions: { $sum: 1 },
                        totalRevenue: { $sum: '$price' },
                        averagePrice: { $avg: '$price' }
                    }
                },
                {
                    $sort: { totalSubscriptions: -1 }
                }
            ]);

            // Lấy tổng thống kê
            const totalStats = {
                totalPlans: await MemberShipPlan.countDocuments({ isActive: true }),
                totalActiveSubscriptions: await UserMemberShip.countDocuments({ paymentStatus: 'paid' }),
                totalOrders: await Order.countDocuments({ orderStatus: 'completed' })
            };

            return {
                orderStatistics: orderStats,
                membershipStatistics: membershipStats,
                totalStats,
                mostPopularPlan: membershipStats[0] || null
            };
        } catch (error) {
            throw new ErrorWithStatus(
                "Lỗi khi lấy thống kê gói membership",
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }

    // Doanh thu theo thời gian
    async getRevenueByPeriod(startDate, endDate, groupBy = 'day') {
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (start > end) {
                throw new ErrorWithStatus(
                    "Ngày bắt đầu phải nhỏ hơn ngày kết thúc",
                    StatusCodes.BAD_REQUEST
                );
            }

            // Tạo format group theo period
            let dateFormat;
            switch (groupBy) {
                case 'month':
                    dateFormat = { year: { $year: '$paymentDate' }, month: { $month: '$paymentDate' } };
                    break;
                case 'week':
                    dateFormat = { year: { $year: '$paymentDate' }, week: { $week: '$paymentDate' } };
                    break;
                case 'year':
                    dateFormat = { year: { $year: '$paymentDate' } };
                    break;
                default:
                    dateFormat = {
                        year: { $year: '$paymentDate' },
                        month: { $month: '$paymentDate' },
                        day: { $dayOfMonth: '$paymentDate' }
                    };
            }

            // Thống kê doanh thu theo thời gian
            const revenueByPeriod = await Payment.aggregate([
                {
                    $match: {
                        paymentStatus: 'success',
                        paymentDate: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: dateFormat,
                        totalRevenue: { $sum: '$amount' },
                        totalTransactions: { $sum: 1 },
                        averageTransactionValue: { $avg: '$amount' }
                    }
                },
                {
                    $sort: { '_id': 1 }
                }
            ]);

            // Thống kê subscription theo thời gian
            const subscriptionsByPeriod = await UserMemberShip.aggregate([
                {
                    $match: {
                        paymentStatus: 'paid',
                        createdAt: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' },
                            day: { $dayOfMonth: '$createdAt' }
                        },
                        totalSubscriptions: { $sum: 1 },
                        totalRevenue: { $sum: '$price' }
                    }
                },
                {
                    $sort: { '_id': 1 }
                }
            ]);

            return {
                period: { startDate, endDate, groupBy },
                revenueByPeriod,
                subscriptionsByPeriod,
                summary: {
                    totalRevenue: revenueByPeriod.reduce((sum, item) => sum + item.totalRevenue, 0),
                    totalTransactions: revenueByPeriod.reduce((sum, item) => sum + item.totalTransactions, 0),
                    totalSubscriptions: subscriptionsByPeriod.reduce((sum, item) => sum + item.totalSubscriptions, 0)
                }
            };
        } catch (error) {
            throw new ErrorWithStatus(
                error.message || "Lỗi khi lấy thống kê doanh thu theo thời gian",
                error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }

    // Thống kê thanh toán chi tiết
    async getPaymentStatistics() {
        try {
            // Thống kê theo trạng thái thanh toán
            const paymentStatusStats = await Payment.aggregate([
                {
                    $group: {
                        _id: '$paymentStatus',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$amount' }
                    }
                },
                {
                    $sort: { count: -1 }
                }
            ]);

            // Thống kê theo phương thức thanh toán
            const paymentMethodStats = await Payment.aggregate([
                {
                    $match: {
                        paymentStatus: 'success'
                    }
                },
                {
                    $group: {
                        _id: '$paymentMethod',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$amount' },
                        averageAmount: { $avg: '$amount' }
                    }
                },
                {
                    $sort: { count: -1 }
                }
            ]);

            // Thống kê thanh toán trong 30 ngày qua
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const recentPayments = await Payment.aggregate([
                {
                    $match: {
                        paymentDate: { $gte: thirtyDaysAgo }
                    }
                },
                {
                    $group: {
                        _id: '$paymentStatus',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$amount' }
                    }
                }
            ]);

            // Thống kê failed payments
            const failedPayments = await Payment.aggregate([
                {
                    $match: {
                        paymentStatus: { $in: ['failed', 'cancelled'] }
                    }
                },
                {
                    $group: {
                        _id: '$paymentMethod',
                        failedCount: { $sum: 1 },
                        lostRevenue: { $sum: '$amount' }
                    }
                }
            ]);

            return {
                paymentStatusBreakdown: paymentStatusStats,
                paymentMethodBreakdown: paymentMethodStats,
                recentPayments: recentPayments,
                failedPayments: failedPayments,
                totalPayments: await Payment.countDocuments(),
                successfulPayments: await Payment.countDocuments({ paymentStatus: 'success' }),
                failedPaymentsCount: await Payment.countDocuments({ paymentStatus: { $in: ['failed', 'cancelled'] } })
            };
        } catch (error) {
            throw new ErrorWithStatus(
                "Lỗi khi lấy thống kê thanh toán",
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }
}

module.exports = new AdminService(); 