const PaymentService = require("../services/payment.service");


class PaymentController {
    static async createPaymentUrl(req, res) {
        try {
            const { memberShipPlanId, paymentMethod, amount } = req.body;
            const userId = req.user.id; // Lấy userId từ middleware authentication

            // Validation cơ bản
            if (!userId || !memberShipPlanId || !paymentMethod || !amount) {
                return res.status(400).json({
                    success: false,
                    message: "Missing required fields: memberShipPlanId, paymentMethod, amount"
                });
            }

            if (amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Amount must be greater than 0"
                });
            }

            const { order, payment } = await PaymentService.createOrderAndPayment(
                userId,
                memberShipPlanId,
                paymentMethod,
                amount
            );

            let paymentUrl;
            if (paymentMethod === "vnpay") {
                paymentUrl = await PaymentService.createVnpayPaymentUrl(
                    order._id,
                    amount,
                    req.ip,
                );
            } else if (paymentMethod === "momo") {
                paymentUrl = await PaymentService.createMomoPaymentUrl(order._id, amount);
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment method. Use 'vnpay' or 'momo'"
                });
            }

            res.status(200).json({
                success: true,
                paymentUrl,
                orderId: order._id,
                orderCode: order.orderCode
            });
        } catch (error) {
            console.error("Payment URL creation error:", error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    static async handleVnpayCallBack(req, res) {
        try {
            const result = await PaymentService.verifyVnpayCallBack(req.query);
            res.status(200).json(result);
        } catch (error) {
            console.error("VNPay callback error:", error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    static async handleMomoCallBack(req, res) {
        try {
            const result = await PaymentService.verifyMomoCallBack(req.body);
            res.status(200).json(result);
        } catch (error) {
            console.error("MoMo callback error:", error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    static async getPaymentStatus(req, res) {
        try {
            const { orderId } = req.params;
            const userId = req.user.id;

            const result = await PaymentService.getPaymentStatus(orderId, userId);
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error("Get payment status error:", error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    static async getPaymentHistory(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10 } = req.query;

            const result = await PaymentService.getPaymentHistory(userId, parseInt(page), parseInt(limit));
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error("Get payment history error:", error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}
module.exports = PaymentController;