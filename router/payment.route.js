const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');


router.post('/create-payment', authMiddleware, paymentController.createPaymentUrl);

router.get('/vnpay-return', paymentController.paymentCallback);

router.get('/check-status/:userMembershipId', authMiddleware, paymentController.checkPaymentStatus);

module.exports = router; 