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
            res.status(500).json({
                success: false,
                message: error.message || "VNPay callback processing failed",
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
    static async handleMomoCallBack(req, res) {
        try {
            const result = await PaymentService.verifyMomoCallBack(req.body);
            res.status(200).json(result);
        } catch (error) {
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
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    static async getPaymentStatusByOrderCode(req, res) {
        try {
            const { orderCode } = req.params;
            const userId = req.user ? req.user.id : null; // Optional auth cho callback

            if (!orderCode) {
                return res.status(400).json({
                    success: false,
                    message: "OrderCode is required"
                });
            }

            const result = await PaymentService.getPaymentStatusByOrderCode(orderCode, userId);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
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
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    // Method đơn giản để check và update payment status
    static async quickFixPayment(req, res) {
        try {
            const orderCode = req.query.orderCode || "ORDER-1751221421328-716899";

            const Order = require("../models/order.model");
            const Payment = require("../models/payment.model");

            const order = await Order.findOne({ orderCode: orderCode });
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found"
                });
            }

            const payment = await Payment.findOne({ orderId: order._id });
            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: "Payment not found"
                });
            }

            // Update status to success
            order.orderStatus = "completed";
            payment.paymentStatus = "success";
            payment.transactionId = "MANUAL_FIX_" + Date.now();

            await order.save();
            await payment.save();

            res.status(200).json({
                success: true,
                message: "Payment status updated successfully",
                data: {
                    order: {
                        id: order._id,
                        orderCode: order.orderCode,
                        status: order.orderStatus
                    },
                    payment: {
                        id: payment._id,
                        status: payment.paymentStatus,
                        transactionId: payment.transactionId
                    }
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Quick fix cho VNPay callback với orderCode cụ thể
    static async quickFixVnpayPayment(req, res) {
        try {
            const orderCode = req.query.vnp_TxnRef || req.query.orderCode;
            const responseCode = req.query.vnp_ResponseCode || "00";
            const transactionNo = req.query.vnp_TransactionNo || "QUICK_FIX_" + Date.now();

            if (!orderCode) {
                return res.status(400).json({
                    success: false,
                    message: "Missing orderCode or vnp_TxnRef"
                });
            }

            const Order = require("../models/order.model");
            const Payment = require("../models/payment.model");

            const order = await Order.findOne({ orderCode: orderCode });
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found"
                });
            }

            const payment = await Payment.findOne({ orderId: order._id });
            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: "Payment not found"
                });
            }

            // Update status based on VNPay response
            if (responseCode === "00") {
                order.orderStatus = "completed";
                payment.paymentStatus = "success";
                payment.transactionId = transactionNo;
            } else {
                order.orderStatus = "cancelled";
                payment.paymentStatus = "failed";
            }

            await order.save();
            await payment.save();

            res.status(200).json({
                success: true,
                message: "VNPay payment status updated successfully",
                data: {
                    order: {
                        id: order._id,
                        orderCode: order.orderCode,
                        status: order.orderStatus
                    },
                    payment: {
                        id: payment._id,
                        status: payment.paymentStatus,
                        transactionId: payment.transactionId
                    }
                }
            });
        } catch (error) {   
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Quick fix cho MoMo callback với parameters cụ thể
    static async quickFixMomoPayment(req, res) {
        try {
            const orderCode = req.query.orderId || req.query.orderCode;
            const resultCode = req.query.resultCode || "0";
            const transactionId = req.query.transId || req.query.transactionId || "QUICK_FIX_MOMO_" + Date.now();

            if (!orderCode) {
                return res.status(400).json({
                    success: false,
                    message: "Missing orderCode or orderId"
                });
            }

            const Order = require("../models/order.model");
            const Payment = require("../models/payment.model");

            let order = await Order.findOne({ orderCode: orderCode });

            if (!order && req.query.amount) {
                order = await Order.findOne({
                    totalAmount: parseInt(req.query.amount),
                    orderStatus: 'pending'
                }).sort({ createdAt: -1 });
            }

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found"
                });
            }

            const payment = await Payment.findOne({ orderId: order._id });
            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: "Payment not found"
                });
            }

            // Update status based on MoMo response
            if (resultCode === "0" || resultCode === 0) {
                order.orderStatus = "completed";
                payment.paymentStatus = "success";
                payment.transactionId = transactionId;
            } else {
                order.orderStatus = "cancelled";
                payment.paymentStatus = "failed";
                payment.transactionId = transactionId;
            }

            // Store MoMo callback details
            payment.paymentDetails = {
                partnerCode: req.query.partnerCode,
                orderId: req.query.orderId,
                requestId: req.query.requestId,
                amount: req.query.amount,
                orderInfo: req.query.orderInfo,
                orderType: req.query.orderType,
                transId: req.query.transId,
                resultCode: req.query.resultCode,
                message: req.query.message,
                payType: req.query.payType,
                responseTime: req.query.responseTime,
                extraData: req.query.extraData,
                signature: req.query.signature
            };

            await order.save();
            await payment.save();

            res.status(200).json({
                success: true,
                message: "MoMo payment status updated successfully",
                data: {
                    order: {
                        id: order._id,
                        orderCode: order.orderCode,
                        status: order.orderStatus
                    },
                    payment: {
                        id: payment._id,
                        status: payment.paymentStatus,
                        transactionId: payment.transactionId,
                        method: payment.paymentMethod
                    }
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Simple test endpoint
    static async testEndpoint(req, res) {
        try {
            const { orderCode } = req.params;

            res.status(200).json({
                success: true,
                message: "Test endpoint working",
                orderCode: orderCode,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Test database connection
    static async testDatabase(req, res) {
        try {   
            const result = await PaymentService.testDatabaseConnection();

            res.status(200).json({
                success: result.success,
                message: result.message,
                error: result.error || null,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}
module.exports = PaymentController;