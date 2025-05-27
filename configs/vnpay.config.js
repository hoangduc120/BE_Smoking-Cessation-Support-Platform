const { VNPay } = require('vnpay');

const tmnCode = process.env.VNPAY_TMN_CODE;
const hashSecret = process.env.VNPAY_SECURE_SECRET;
const vnpayHost = process.env.VNPAY_HOST


const vnpay = new VNPay({
    tmnCode: tmnCode,
    secureSecret: hashSecret,
    vnpayHost: vnpayHost,
    testMode: true,
    hashAlgorithm: 'SHA512',
    enableLog: true,
});

const ProductCode = {
    Topup: 'TOPUP',
    Billpayment: 'BILLPAYMENT',
    Fashion: 'FASHION',
    Other: 'other'
};

const VnpLocale = {
    VN: 'vn',
    EN: 'en'
}
module.exports = { vnpay, ProductCode, VnpLocale, tmnCode, hashSecret, vnpayHost };
