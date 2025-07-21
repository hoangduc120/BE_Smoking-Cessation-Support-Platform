const { vnpay, ProductCode, VnpLocale } = require("../configs/vnpay.config")
const {
    accessKey,
    secretKey,
    partnerCode,
    orderInfo,
    redirectUrl,
    ipnUrl,
    apiEndpoint,
    requestType,
    extraData,
    autoCapture,
    lang,
    generateOrderId,
    generateRequestId
} = require("../configs/momo.config");
const Order = require("../models/order.model");
const Payment = require("../models/payment.model");
const UserMembership = require("../models/userMemberShip.model");
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
                vnp_ReturnUrl: process.env.VNPAY_RETURN_URL || 'https://smoking-cessation-support-platform-liart.vercel.app/payment/success',
            }
            const paymentUrl = vnpay.buildPaymentUrl(paymentData);
            return paymentUrl;
        } catch (error) {
            throw new Error("Failed to create VNPay payment URL");
        }
    }
    static async verifyVnpayCallBack(vnpParams) {
        try {
            let isValid = false;

            try {
                if (typeof vnpay.verifyPayment === 'function') {
                    isValid = vnpay.verifyPayment(vnpParams);
                } else if (typeof vnpay.verifyReturnUrl === 'function') {
                    isValid = vnpay.verifyReturnUrl(vnpParams);
                } else if (typeof vnpay.validateReturnUrl === 'function') {
                    isValid = vnpay.validateReturnUrl(vnpParams);
                } else {
                    isValid = process.env.NODE_ENV === 'development' ? true : false;
                }
            } catch (verifyError) {
                isValid = process.env.NODE_ENV === 'development' ? true : false;
            }
            if (!isValid && process.env.NODE_ENV === 'production') {
                throw new Error("Invalid VNPay callback signature");
            }

            const order = await Order.findOne({ orderCode: vnpParams.vnp_TxnRef });
            if (!order) {
                throw new Error("Order not found");
            }
            const payment = await Payment.findOne({ orderId: order._id });
            if (!payment) {
                throw new Error("Payment not found");
            }
            if (vnpParams.vnp_ResponseCode === "00") {
                order.orderStatus = "completed";
                payment.paymentStatus = "success";
                payment.transactionId = vnpParams.vnp_TransactionNo;
                payment.paymentDetails = vnpParams;

                // Tự động kích hoạt gói thành viên sau khi thanh toán thành công
                try {
                    // Kiểm tra xem đơn hàng có liên quan đến gói thành viên không
                    if (order.memberShipPlanId) {
                        // Tìm thông tin gói thành viên
                        const memberShipPlan = await require("../models/memberShipPlan.model")
                            .findById(order.memberShipPlanId);

                        if (memberShipPlan) {
                            // Kiểm tra xem đã có gói thành viên đang hoạt động không
                            const existingMembership = await UserMembership.findOne({
                                userId: order.userId,
                                paymentStatus: 'paid',
                                endDate: { $gte: new Date() }
                            });

                            if (existingMembership) {
                                console.log(`Người dùng ${order.userId} đã có gói thành viên đang hoạt động`);
                            } else {
                                // Tạo mới gói thành viên
                                const startDate = new Date();
                                const endDate = new Date(startDate.getTime() + memberShipPlan.duration * 24 * 60 * 60 * 1000);

                                const userMembership = new UserMembership({
                                    userId: order.userId,
                                    memberShipPlanId: memberShipPlan._id,
                                    startDate,
                                    endDate,
                                    paymentStatus: 'paid',
                                    price: order.totalAmount,
                                    paymentInfo: {
                                        orderId: order.orderCode,
                                        amount: order.totalAmount,
                                        createDate: payment.createdAt.toISOString(),
                                        transactionId: payment.transactionId || vnpParams.vnp_TransactionNo,
                                        paymentDate: new Date(),
                                        bankCode: vnpParams.vnp_BankCode || 'UNKNOWN'
                                    }
                                });

                                await userMembership.save();
                                console.log(`Đã kích hoạt gói thành viên ${memberShipPlan.name} cho người dùng ${order.userId}`);
                            }
                        }
                    }
                } catch (membershipError) {
                    console.error("Lỗi khi tự động kích hoạt gói thành viên:", membershipError);
                    // Không throw lỗi để tiếp tục xử lý thanh toán
                }
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
            throw new Error(`Failed to verify VNPay callback: ${error.message}`);
        }
    }
    static async createMomoPaymentUrl(orderId, amount) {
        try {
            const order = await Order.findById(orderId)
            if (!order) {
                throw new Error("Order not found")
            }
            const requestId = generateRequestId()
            const orderIdMomo = order.orderCode;


            if (!accessKey || !secretKey) {
                throw new Error("MoMo credentials not configured properly");
            }

            const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderIdMomo}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`
            const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex')
            const endpoint = apiEndpoint;

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


            const isSuccess = response.data.resultCode === 0 ||
                response.data.code === 0 ||
                (response.data.code === undefined && response.data.message === "Thành công.");

            if (!isSuccess) {
                const errorCode = response.data.resultCode || response.data.code || 'unknown';
                const errorMessage = response.data.message || 'Unknown error';
                throw new Error(`MoMo API Error: ${errorMessage} (Code: ${errorCode})`)
            }

            const paymentUrl = response.data.payUrl;
            if (!paymentUrl) {
                throw new Error("MoMo API did not return payment URL");
            }
            return paymentUrl;
        } catch (error) {
            throw new Error(`Failed to create MoMo payment URL: ${error.message}`);
        }
    }
    static async verifyMomoCallBack(momoParams) {
        try {

            let order = await Order.findOne({ orderCode: momoParams.orderId });

            if (!order) {
                order = await Order.findOne({
                    totalAmount: momoParams.amount,
                    orderStatus: 'pending'
                }).sort({ createdAt: -1 });
            }

            if (!order) {
                throw new Error("Order not found")
            }
            const payment = await Payment.findOne({ orderId: order._id });
            if (!payment) {
                throw new Error("Payment not found")
            }
            let signatureValid = false;
            try {
                const rawSignature = `accessKey=${accessKey}&amount=${momoParams.amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${momoParams.orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${momoParams.requestId}&requestType=${requestType}`
                const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex')
                signatureValid = signature === momoParams.signature;
            } catch (signatureError) {
                signatureValid = process.env.NODE_ENV === 'development' ? true : false;
            }

            if (!signatureValid && process.env.NODE_ENV === 'production') {
                throw new Error("Invalid signature")
            }
            const isSuccess = momoParams.resultCode === "0" ||
                momoParams.resultCode === 0 ||
                momoParams.code === "0" ||
                momoParams.code === 0;

            if (isSuccess) {
                order.orderStatus = "completed"
                payment.paymentStatus = "success"
                payment.transactionId = momoParams.transactionId || momoParams.transId
                payment.paymentDetails = momoParams

                // Tự động kích hoạt gói thành viên sau khi thanh toán thành công
                try {
                    // Kiểm tra xem đơn hàng có liên quan đến gói thành viên không
                    if (order.memberShipPlanId) {
                        // Tìm thông tin gói thành viên
                        const memberShipPlan = await require("../models/memberShipPlan.model")
                            .findById(order.memberShipPlanId);

                        if (memberShipPlan) {
                            // Kiểm tra xem đã có gói thành viên đang hoạt động không
                            const existingMembership = await UserMembership.findOne({
                                userId: order.userId,
                                paymentStatus: 'paid',
                                endDate: { $gte: new Date() }
                            });

                            if (existingMembership) {
                                console.log(`Người dùng ${order.userId} đã có gói thành viên đang hoạt động`);
                            } else {
                                // Tạo mới gói thành viên
                                const startDate = new Date();
                                const endDate = new Date(startDate.getTime() + memberShipPlan.duration * 24 * 60 * 60 * 1000);

                                const userMembership = new UserMembership({
                                    userId: order.userId,
                                    memberShipPlanId: memberShipPlan._id,
                                    startDate,
                                    endDate,
                                    paymentStatus: 'paid',
                                    price: order.totalAmount,
                                    paymentInfo: {
                                        orderId: order.orderCode,
                                        amount: order.totalAmount,
                                        createDate: payment.createdAt.toISOString(),
                                        transactionId: payment.transactionId || momoParams.transactionId || momoParams.transId,
                                        paymentDate: new Date(),
                                        bankCode: 'MOMO'
                                    }
                                });

                                await userMembership.save();
                                console.log(`Đã kích hoạt gói thành viên ${memberShipPlan.name} cho người dùng ${order.userId}`);
                            }
                        }
                    }
                } catch (membershipError) {
                    console.error("Lỗi khi tự động kích hoạt gói thành viên:", membershipError);
                    // Không throw lỗi để tiếp tục xử lý thanh toán
                }
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
            throw new Error(`Failed to verify MoMo callback: ${error.message}`)
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

    static async getPaymentStatusByOrderCode(orderCode, userId = null) {
        try {
            if (!orderCode || typeof orderCode !== 'string') {
                throw new Error("Valid orderCode is required");
            }
            const orderQuery = userId ? { orderCode, userId } : { orderCode };
            let order;
            try {
                order = await Order.findOne(orderQuery).populate('memberShipPlanId');
            } catch (dbError) {
                throw new Error("Database connection error");
            }
            if (!order) {
                throw new Error("Order not found");
            }

            let payment;
            try {
                payment = await Payment.findOne({ orderId: order._id });
            } catch (dbError) {
                throw new Error("Database connection error");
            }

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
            throw new Error(`Failed to get payment history: ${error.message}`);
        }
    }

}
module.exports = PaymentService;