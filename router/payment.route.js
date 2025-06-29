const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authMiddleware, restrictTo } = require('../middlewares/authMiddleware');

router.post('/create-payment-url', authMiddleware, restrictTo('user', 'admin'), paymentController.createPaymentUrl);

router.get('/vnpay-callback', paymentController.handleVnpayCallBack);

router.post('/momo-callback', paymentController.handleMomoCallBack);

router.get('/quick-fix', paymentController.quickFixPayment);

router.get('/quick-fix-vnpay', paymentController.quickFixVnpayPayment);

router.get('/quick-fix-momo', paymentController.quickFixMomoPayment);

router.get('/status/:orderId', authMiddleware, paymentController.getPaymentStatus);

router.get('/status-by-code/:orderCode', paymentController.getPaymentStatusByOrderCode);

router.get('/history', authMiddleware, restrictTo('user', 'admin'), paymentController.getPaymentHistory);

module.exports = router; 