const PaymentService = require('../services/payment.service');

class PaymentController {
    // Tạo URL thanh toán từ VNPay
    async createPaymentUrl(req, res) {
        try {
            const { userMembershipId } = req.body;
            const ipAddr = req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                req.connection.socket.remoteAddress;

            if (!userMembershipId) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu thông tin đăng ký gói thành viên'
                });
            }

            const paymentUrl = await PaymentService.createPaymentUrl(userMembershipId, ipAddr);

            res.status(200).json({
                success: true,
                message: 'Tạo URL thanh toán thành công',
                data: { paymentUrl }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Xử lý callback từ VNPay
    async paymentCallback(req, res) {
        try {
            const vnpayParams = req.query;
            const result = await PaymentService.verifyPaymentReturn(vnpayParams);

            // Chuyển hướng về trang client với kết quả thanh toán
            if (process.env.CLIENT_REDIRECT_URL) {
                const redirectUrl = `${process.env.CLIENT_REDIRECT_URL}?success=${result.success}&message=${encodeURIComponent(result.message)}`;
                return res.redirect(redirectUrl);
            }

            // Nếu không có URL redirect, trả về kết quả dạng JSON
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // API endpoint để kiểm tra trạng thái thanh toán (cho client polling)
    async checkPaymentStatus(req, res) {
        try {
            const { userMembershipId } = req.params;
            const UserMembership = require('../models/userMemberShip.model');

            const membership = await UserMembership.findById(userMembershipId);

            if (!membership) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy thông tin đăng ký gói thành viên'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Lấy trạng thái thanh toán thành công',
                data: {
                    paymentStatus: membership.paymentStatus,
                    userMembershipId: membership._id
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new PaymentController(); 