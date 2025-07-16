const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { authMiddleware, restrictTo } = require("../middlewares/authMiddleware");

router.use(authMiddleware);
router.use(restrictTo('admin'));

router.get('/accounts', adminController.getAllAccounts);

router.get('/accounts/:id', adminController.getAccountById);

router.put('/accounts/:id/status', adminController.updateAccountStatus);

router.put('/accounts/:id/role', adminController.updateUserRole);

router.delete('/accounts/:id', adminController.deleteAccount);

router.put('/accounts/:id/restore', adminController.restoreAccount);

// router.put('/accounts/:id/info', adminController.updateUserInfo);

// router.put('/accounts/:id/reset-password', adminController.resetUserPassword);

router.get('/dashboard/stats', adminController.getDashboardStats);

router.get('/dashboard/recent-activity', adminController.getRecentActivity);

// router.get('/users/role/:role', adminController.getUsersByRole);

// router.post('/users/search', adminController.advancedSearchUsers);

router.get('/export/users', adminController.exportUsersData);

// ============= REVENUE ANALYTICS =============
router.get('/revenue/total', adminController.getTotalRevenue);

router.get('/revenue/membership-stats', adminController.getMembershipPlanStats);

router.get('/revenue/by-period', adminController.getRevenueByPeriod);

router.get('/revenue/payment-stats', adminController.getPaymentStatistics);

module.exports = router; 