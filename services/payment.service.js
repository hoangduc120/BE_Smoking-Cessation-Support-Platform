const { vnpay, ProductCode, VnpLocale } = require("../configs/vnpay.config")
const {
    accessKey,
    secretKey,
    partnerCode,
    orderInfo,
    redirectUrl,
    ipnUrl,
    requestType,
    extraData,
    autoCapture,
    lang,
    generateOrderId,
    generateRequestId
} = require("../configs/momo.config");
const Order = require("../models/order.model");
const Payment = require("../models/payment.model");
const crypto = require('crypto');
const axios = require('axios');

class PaymentService {
    static async createVnpayPaymentUrl(orderId, amount, ipAddr, locale = VnpLocale.VN) {
        try {
            const order = await Order.findById(orderId);
            if (!order) {
                throw new Error("Order not found");
            }
            const paymentData = {
                vnp_TxnRef: order.orderCode,
                vnp_OrderInfo: `Thanh toan don hang ${order.orderCode}`,
                vnp_Amount: amount,
                vnp_IpAddr: ipAddr,
                vnp_Locale: locale,
                vnp_OrderType: ProductCode.Other,
                vnp_ReturnUrl: process.env.VNPAY_RETURN_URL,
            }
            const paymentUrl = vnpay.buildPaymentUrl(paymentData);
            return paymentUrl;
        } catch (error) {
            throw new Error("Failed to create VNPay payment URL");
        }
    }
    static async verifyVnpayCallBack(vnpParams) {
        try {
            const isValid = vnpay.verifyPayment(vnpParams);
            if (!isValid) {
                throw new Error("Invalid VNPay callback");
            }
            const order = await Order.findOne({ orderCode: vnpParams.vnp_TxnRef });
            if (!order) {
                throw new Error("Order not found");
            }
            const payment = await Payment.findOne({ orderId: order._id })
            if (!payment) {
                throw new Error("Payment not found");
            }
            if (vnpParams.vnp_ResponseCode === "00") {
                order.orderStatus = "completed";
                payment.paymentStatus = "success";
                payment.transactionId = vnpParams.vnp_TransactionNo;
                payment.paymentDetails = vnpParams;
            } else {
                order.orderStatus = "cancelled";
                payment.paymentStatus = "failed";
                payment.paymentDetails = vnpParams;
            }
            await order.save();
            await payment.save();
            return {
                success: true,
                message: "Payment verified successfully",
            }
        } catch (error) {
            throw new Error("Failed to verify VNPay callback");
        }
    }
    static async createMomoPaymentUrl(orderId, amount) {
        try {
            const order = await Order.findById(orderId)
            if (!order) {
                throw new Error("Order not found")
            }
            const requestId = generateRequestId()
            // Sử dụng orderCode của order thay vì generate ID mới để tránh mất mapping
            const orderIdMomo = order.orderCode;
            const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderIdMomo}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`
            const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex')
            const endpoint = process.env.MOMO_API_ENDPOINT;

            const requestBody = {
                partnerCode,
                requestId,
                amount,
                orderId: orderIdMomo,
                orderInfo,
                redirectUrl,
                ipnUrl,
                extraData,
                requestType,
                signature,
                lang,
                autoCapture,
            }
            const response = await axios.post(endpoint, requestBody)

            if (response.data.code !== 0) {
                throw new Error(response.data.message)
            }
            const paymentUrl = response.data.payUrl;
            return paymentUrl;
        } catch (error) {
            throw new Error("Failed to create MoMo payment URL");
        }
    }
    static async verifyMomoCallBack(momoParams) {
        try {
            // Cần map orderId từ MoMo về orderCode trong database
            // MoMo orderId format: MOMO + timestamp
            // Cần lưu mapping hoặc tìm theo pattern
            let order = await Order.findOne({ orderCode: momoParams.orderId });

            // Nếu không tìm thấy, thử tìm theo pattern (vì MoMo orderId khác với orderCode)
            if (!order) {
                // Tìm order gần nhất với amount tương ứng (backup solution)
                order = await Order.findOne({
                    totalAmount: momoParams.amount,
                    orderStatus: 'pending'
                }).sort({ createdAt: -1 });
            }

            if (!order) {
                throw new Error("Order not found")
            }
            const payment = await Payment.findOne({ orderId: order._id })
            if (!payment) {
                throw new Error("Payment not found")
            }
            const rawSignature = `accessKey=${accessKey}&amount=${momoParams.amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${momoParams.orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${momoParams.requestId}&requestType=${requestType}`
            const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex')
            if (signature !== momoParams.signature) {
                throw new Error("Invalid signature")
            }
            if (momoParams.resultCode === "0") {
                order.orderStatus = "completed"
                payment.paymentStatus = "success"
                payment.transactionId = momoParams.transactionId
                payment.paymentDetails = momoParams
            } else {
                order.orderStatus = "cancelled"
                payment.paymentStatus = "failed"
                payment.paymentDetails = momoParams
            }
            await order.save()
            await payment.save()
            return {
                success: true,
                message: "Payment verified successfully",
            }
        } catch (error) {
            throw new Error("Failed to verify MoMo callback")
        }
    }
    static async createOrderAndPayment(userId, memberShipPlanId, paymentMethod, amount) {
        try {
            if (!userId || !memberShipPlanId || !paymentMethod || !amount) {
                throw new Error("Missing required parameters");
            }

            if (amount <= 0) {
                throw new Error("Amount must be greater than 0");
            }

            const order = new Order({
                userId,
                memberShipPlanId,
                totalAmount: amount,
            });
            await order.save();

            const payment = new Payment({
                orderId: order._id,
                userId,
                paymentMethod,
                amount,
            });
            await payment.save();

            return { order, payment };
        } catch (error) {
            console.error("Create order and payment error:", error);
            throw new Error(`Failed to create order and payment: ${error.message}`);
        }
    }

    static async getPaymentStatus(orderId, userId) {
        try {
            const order = await Order.findOne({
                _id: orderId,
                userId: userId
            }).populate('memberShipPlanId');

            if (!order) {
                throw new Error("Order not found or access denied");
            }

            const payment = await Payment.findOne({ orderId: order._id });

            if (!payment) {
                throw new Error("Payment not found");
            }

            return {
                order: {
                    id: order._id,
                    orderCode: order.orderCode,
                    status: order.orderStatus,
                    totalAmount: order.totalAmount,
                    createdAt: order.createdAt,
                    memberShipPlan: order.memberShipPlanId
                },
                payment: {
                    id: payment._id,
                    paymentMethod: payment.paymentMethod,
                    status: payment.paymentStatus,
                    amount: payment.amount,
                    transactionId: payment.transactionId,
                    paymentDate: payment.paymentDate
                }
            };
        } catch (error) {
            console.error("Get payment status error:", error);
            throw new Error(`Failed to get payment status: ${error.message}`);
        }
    }

    static async getPaymentHistory(userId, page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;

            const orders = await Order.find({ userId })
                .populate('memberShipPlanId')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await Order.countDocuments({ userId });

            const ordersWithPayments = await Promise.all(
                orders.map(async (order) => {
                    const payment = await Payment.findOne({ orderId: order._id });
                    return {
                        order: {
                            id: order._id,
                            orderCode: order.orderCode,
                            status: order.orderStatus,
                            totalAmount: order.totalAmount,
                            createdAt: order.createdAt,
                            memberShipPlan: order.memberShipPlanId
                        },
                        payment: payment ? {
                            id: payment._id,
                            paymentMethod: payment.paymentMethod,
                            status: payment.paymentStatus,
                            amount: payment.amount,
                            transactionId: payment.transactionId,
                            paymentDate: payment.paymentDate
                        } : null
                    };
                })
            );

            return {
                payments: ordersWithPayments,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalRecords: total,
                    limit
                }
            };
        } catch (error) {
            console.error("Get payment history error:", error);
            throw new Error(`Failed to get payment history: ${error.message}`);
        }
    }
}
module.exports = PaymentService;