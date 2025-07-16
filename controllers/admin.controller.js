const catchAsync = require("../utils/catchAsync");
const adminService = require("../services/admin.service");
const { OK, BAD_REQUEST, CREATED } = require("../configs/response.config");

class AdminController {
    // Lấy tất cả account với phân trang và lọc
    getAllAccounts = catchAsync(async (req, res) => {
        const { page = 1, limit = 10, role, isActive, search } = req.query;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            role,
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
            search
        };

        const result = await adminService.getAllAccounts(options);
        return OK(res, "Lấy danh sách tài khoản thành công", result);
    });

    // Lấy thông tin chi tiết một account
    getAccountById = catchAsync(async (req, res) => {
        const { id } = req.params;
        const account = await adminService.getAccountById(id);
        return OK(res, "Lấy thông tin tài khoản thành công", { account });
    });

    // Cập nhật trạng thái isActive của user
    updateAccountStatus = catchAsync(async (req, res) => {
        const { id } = req.params;
        const { isActive } = req.body;
        const adminId = req.id;

        if (typeof isActive !== 'boolean') {
            return BAD_REQUEST(res, "isActive phải là boolean (true hoặc false)");
        }

        const updatedAccount = await adminService.updateAccountStatus(id, isActive, adminId);

        const statusText = isActive ? "kích hoạt" : "vô hiệu hóa";
        return OK(res, `Tài khoản đã được ${statusText} thành công`, { account: updatedAccount });
    });

    // Cập nhật role của user
    updateUserRole = catchAsync(async (req, res) => {
        const { id } = req.params;
        const { role } = req.body;
        const adminId = req.id;

        if (!['admin', 'user', 'coach'].includes(role)) {
            return BAD_REQUEST(res, "Role không hợp lệ. Chỉ cho phép: admin, user, coach");
        }

        const updatedAccount = await adminService.updateUserRole(id, role, adminId);
        return OK(res, "Cập nhật role thành công", { account: updatedAccount });
    });

    // Xóa mềm tài khoản (đánh dấu isDeleted = true)
    deleteAccount = catchAsync(async (req, res) => {
        const { id } = req.params;
        const adminId = req.id;

        const deletedAccount = await adminService.deleteAccount(id, adminId);
        return OK(res, "Xóa tài khoản thành công", { account: deletedAccount });
    });

    // Khôi phục tài khoản đã xóa
    restoreAccount = catchAsync(async (req, res) => {
        const { id } = req.params;
        const adminId = req.id;

        const restoredAccount = await adminService.restoreAccount(id, adminId);
        return OK(res, "Khôi phục tài khoản thành công", { account: restoredAccount });
    });

    // Thống kê dashboard admin
    getDashboardStats = catchAsync(async (req, res) => {
        const stats = await adminService.getDashboardStats();
        return OK(res, "Lấy thống kê dashboard thành công", stats);
    });

    // Lấy danh sách user hoạt động gần đây
    getRecentActivity = catchAsync(async (req, res) => {
        const { limit = 20 } = req.query;
        const activities = await adminService.getRecentActivity(parseInt(limit));
        return OK(res, "Lấy hoạt động gần đây thành công", { activities });
    });

    // Reset mật khẩu cho user
    resetUserPassword = catchAsync(async (req, res) => {
        const { id } = req.params;
        const { newPassword } = req.body;
        const adminId = req.id;

        if (!newPassword || newPassword.length < 6) {
            return BAD_REQUEST(res, "Mật khẩu mới phải có ít nhất 6 ký tự");
        }

        await adminService.resetUserPassword(id, newPassword, adminId);
        return OK(res, "Reset mật khẩu thành công");
    });

    // Cập nhật thông tin user bởi admin
    updateUserInfo = catchAsync(async (req, res) => {
        const { id } = req.params;
        const updateData = req.body;
        const adminId = req.id;

        const updatedUser = await adminService.updateUserInfo(id, updateData, adminId);
        return OK(res, "Cập nhật thông tin user thành công", { user: updatedUser });
    });

    // Lấy danh sách user theo role
    getUsersByRole = catchAsync(async (req, res) => {
        const { role } = req.params;
        const { page = 1, limit = 10 } = req.query;

        if (!['admin', 'user', 'coach'].includes(role)) {
            return BAD_REQUEST(res, "Role không hợp lệ");
        }

        const result = await adminService.getUsersByRole(role, parseInt(page), parseInt(limit));
        return OK(res, `Lấy danh sách ${role} thành công`, result);
    });

    // Tìm kiếm user nâng cao
    advancedSearchUsers = catchAsync(async (req, res) => {
        const searchOptions = req.body;
        const result = await adminService.advancedSearchUsers(searchOptions);
        return OK(res, "Tìm kiếm user thành công", result);
    });

    // Export dữ liệu user
    exportUsersData = catchAsync(async (req, res) => {
        const { format = 'json' } = req.query;
        const data = await adminService.exportUsersData(format);

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename=users.json');
        }

        return res.send(data);
    });

    // ============= REVENUE ANALYTICS =============

    // Lấy tổng doanh thu từ việc mua gói thành viên
    getTotalRevenue = catchAsync(async (req, res) => {
        const revenueStats = await adminService.getTotalRevenue();
        return OK(res, "Lấy thống kê doanh thu thành công", revenueStats);
    });

    // Lấy thống kê gói membership được mua nhiều nhất
    getMembershipPlanStats = catchAsync(async (req, res) => {
        const membershipStats = await adminService.getMembershipPlanStats();
        return OK(res, "Lấy thống kê gói membership thành công", membershipStats);
    });

    // Lấy doanh thu theo thời gian
    getRevenueByPeriod = catchAsync(async (req, res) => {
        const { startDate, endDate, groupBy = 'day' } = req.query;

        if (!startDate || !endDate) {
            return BAD_REQUEST(res, "startDate và endDate là bắt buộc");
        }

        // Validate groupBy parameter
        const validGroupBy = ['day', 'week', 'month', 'year'];
        if (!validGroupBy.includes(groupBy)) {
            return BAD_REQUEST(res, "groupBy phải là: day, week, month, hoặc year");
        }

        const revenueByPeriod = await adminService.getRevenueByPeriod(startDate, endDate, groupBy);
        return OK(res, "Lấy thống kê doanh thu theo thời gian thành công", revenueByPeriod);
    });

    // Lấy thống kê thanh toán chi tiết
    getPaymentStatistics = catchAsync(async (req, res) => {
        const paymentStats = await adminService.getPaymentStatistics();
        return OK(res, "Lấy thống kê thanh toán thành công", paymentStats);
    });
}

module.exports = new AdminController(); 