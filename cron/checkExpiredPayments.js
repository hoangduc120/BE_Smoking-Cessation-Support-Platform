const cron = require('node-cron');
const Payment = require('../models/payment.model');
const Order = require('../models/order.model');

class ExpiredPaymentsChecker {
    constructor() {
        this.isRunning = false;
    }

    async checkExpiredPayments() {
        if (this.isRunning) {
            console.log('Expired payments check already running, skipping...');
            return;
        }

        this.isRunning = true;
        console.log('Starting expired payments check...');

        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

            const expiredPayments = await Payment.find({
                paymentStatus: 'pending',
                createdAt: { $lte: oneHourAgo }
            });

            let processedCount = 0;
            let errorCount = 0;

            for (const payment of expiredPayments) {
                try {
                    payment.paymentStatus = 'failed';
                    payment.paymentDetails = {
                        ...payment.paymentDetails,
                        autoFailedReason: 'Payment expired after 1 hour',
                        autoFailedAt: new Date()
                    };
                    await payment.save();

                    const order = await Order.findById(payment.orderId);
                    if (order && order.orderStatus === 'pending') {
                        order.orderStatus = 'cancelled';
                        await order.save();
                        console.log(`Updated order ${order.orderCode} to cancelled`);
                    }

                    processedCount++;
                } catch (error) {
                    errorCount++;
                    console.error(`Error processing expired payment ${payment._id}:`, error.message);
                }
            }
        } catch (error) {
            console.error('Error in expired payments check:', error.message);
        } finally {
            this.isRunning = false;
        }
    }

    startScheduler() {
        cron.schedule('*/15 * * * *', () => {
            this.checkExpiredPayments();
        });
    }
    async runManualCheck() {
        await this.checkExpiredPayments();
    }
}

const expiredPaymentsChecker = new ExpiredPaymentsChecker();

module.exports = {
    startExpiredPaymentsChecker: () => expiredPaymentsChecker.startScheduler(),
    runManualExpiredPaymentsCheck: () => expiredPaymentsChecker.runManualCheck()
}; 