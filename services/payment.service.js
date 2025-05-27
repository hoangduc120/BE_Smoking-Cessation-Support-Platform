const { vnpay, ProductCode, VnpLocale } = require('../configs/vnpay.config');
const UserMembership = require('../models/userMemberShip.model');
const crypto = require('crypto');
const querystring = require('querystring');

class PaymentService {
    async createPaymentUrl(userMembershipId, ipAddr) {
        try {
            // Tìm thông tin đăng ký gói thành viên
            const membership = await UserMembership.findById(userMembershipId)
                .populate('memberShipPlanId');

            if (!membership) {
                throw new Error('Không tìm thấy thông tin đăng ký gói thành viên');
            }

            // Tạo tham số thanh toán
            const tmnCode = process.env.VNPAY_TMN_CODE;
            const secretKey = process.env.VNPAY_SECURE_SECRET;
            const returnUrl = process.env.VNPAY_RETURN_URL;

            let date = new Date();
            let createDate = date.getFullYear().toString() +
                ("0" + (date.getMonth() + 1)).slice(-2) +
                ("0" + date.getDate()).slice(-2) +
                ("0" + date.getHours()).slice(-2) +
                ("0" + date.getMinutes()).slice(-2) +
                ("0" + date.getSeconds()).slice(-2);

            // Mã đơn hàng: userMembershipId + timestamp
            let orderId = `${userMembershipId}_${Date.now()}`;

            // Số tiền thanh toán (VNPay yêu cầu đơn vị là VND * 100)
            let amount = Math.round(membership.price) * 100;

            // Thông tin đơn hàng
            let orderInfo = `Thanh toan goi ${membership.memberShipPlanId.name}`;
            let orderType = ProductCode.Other;

            // Tạo object chứa dữ liệu thanh toán
            let vnp_Params = {
                vnp_Version: '2.1.0',
                vnp_Command: 'pay',
                vnp_TmnCode: tmnCode,
                vnp_Locale: VnpLocale.VN,
                vnp_CurrCode: 'VND',
                vnp_TxnRef: orderId,
                vnp_OrderInfo: orderInfo,
                vnp_OrderType: orderType,
                vnp_Amount: amount,
                vnp_ReturnUrl: returnUrl,
                vnp_IpAddr: ipAddr,
                vnp_CreateDate: createDate,
            };

            // Sắp xếp tham số theo thứ tự a-z
            const sortedParams = this.sortObject(vnp_Params);

            // Tạo chữ ký
            let signData = querystring.stringify(sortedParams, { encode: false });
            let hmac = crypto.createHmac("sha512", secretKey);
            let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

            vnp_Params['vnp_SecureHash'] = signed;

            // Tạo URL thanh toán
            const vnpayUrl = process.env.VNPAY_HOST + '?' + querystring.stringify(vnp_Params, { encode: false });

            // Cập nhật thông tin thanh toán cho đăng ký gói
            membership.paymentInfo = {
                orderId: orderId,
                amount: amount / 100, // Lưu lại số tiền thực
                createDate: createDate
            };
            await membership.save();

            return vnpayUrl;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async verifyPaymentReturn(vnpayParams) {
        try {
            // Kiểm tra chữ ký
            const secureHash = vnpayParams['vnp_SecureHash'];
            delete vnpayParams['vnp_SecureHash'];
            delete vnpayParams['vnp_SecureHashType'];

            const secretKey = process.env.VNPAY_SECURE_SECRET;

            // Sắp xếp tham số theo thứ tự a-z
            const sortedParams = this.sortObject(vnpayParams);

            // Tạo chữ ký để kiểm tra
            let signData = querystring.stringify(sortedParams, { encode: false });
            let hmac = crypto.createHmac("sha512", secretKey);
            let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

            // So sánh chữ ký
            if (secureHash !== signed) {
                return {
                    success: false,
                    message: 'Chữ ký không hợp lệ'
                };
            }

            // Kiểm tra kết quả giao dịch
            const responseCode = vnpayParams['vnp_ResponseCode'];

            if (responseCode !== '00') {
                return {
                    success: false,
                    message: 'Giao dịch thất bại',
                    responseCode
                };
            }

            // Lấy thông tin đơn hàng
            const orderId = vnpayParams['vnp_TxnRef'];
            const membershipId = orderId.split('_')[0];

            // Cập nhật trạng thái thanh toán
            const membership = await UserMembership.findById(membershipId);
            if (!membership) {
                return {
                    success: false,
                    message: 'Không tìm thấy thông tin đăng ký gói thành viên'
                };
            }

            // Cập nhật trạng thái thành công
            membership.paymentStatus = 'paid';
            membership.paymentInfo = {
                ...membership.paymentInfo,
                transactionId: vnpayParams['vnp_TransactionNo'],
                paymentDate: new Date(),
                bankCode: vnpayParams['vnp_BankCode']
            };
            await membership.save();

            return {
                success: true,
                message: 'Thanh toán thành công',
                data: membership
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    // Hàm sắp xếp object theo thứ tự a-z
    sortObject(obj) {
        let sorted = {};
        let keys = Object.keys(obj).sort();

        for (let key of keys) {
            if (obj[key] !== null && obj[key] !== undefined) {
                sorted[key] = obj[key];
            }
        }

        return sorted;
    }
}

module.exports = new PaymentService(); 