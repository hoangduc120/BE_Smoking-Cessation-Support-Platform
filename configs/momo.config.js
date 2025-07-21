const accessKey = process.env.MOMO_ACCESS_KEY;
const secretKey = process.env.MOMO_SECRET_KEY;
const partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
const orderInfo = 'Pay with MoMo';
const redirectUrl = process.env.MOMO_RETURN_URL || 'https://smoking-cessation-support-platform-liart.vercel.app';
const ipnUrl = process.env.MOMO_NOTIFY_URL || 'https://be-smoking-cessation-support-platform-w1tg.onrender.com/api/payment/momo-callback';
const apiEndpoint = process.env.MOMO_API_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';
const requestType = "captureWallet";
const extraData = '';
const orderGroupId = '';
const autoCapture = true;
const orderExpireTime = 2;
const lang = 'vi';

function generateOrderId() {
    return partnerCode + new Date().getTime();
}

function generateRequestId() {
    return generateOrderId();
}

module.exports = {
    accessKey,
    secretKey,
    orderInfo,
    partnerCode,
    redirectUrl,
    ipnUrl,
    apiEndpoint,
    requestType,
    extraData,
    orderGroupId,
    autoCapture,
    orderExpireTime,
    lang,
    generateOrderId,
    generateRequestId
}
