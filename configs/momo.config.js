const accessKey = process.env.MOMO_ACCESS_KEY;
const secretKey = process.env.MOMO_SECRET_KEY;
const partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
const orderInfo = 'Pay with MoMo';
const redirectUrl = process.env.MOMO_RETURN_URL;
const ipnUrl = process.env.MOMO_NOTIFY_URL;
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
    requestType,
    extraData,
    orderGroupId,
    autoCapture,
    orderExpireTime,
    lang,
    generateOrderId,
    generateRequestId
}
