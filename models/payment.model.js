const mongoose = require('mongoose');

const PaymentStatus = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    SUCCESS: 'success',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

const PaymentMethod = {
    MOMO: 'momo',
    VNPAY: 'vnpay',
};
var paymentSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    paymentMethod: {
        type: String,
        enum: Object.values(PaymentMethod),
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: Object.values(PaymentStatus),
        default: PaymentStatus.PENDING,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    transactionId: {
        type: String,
    },
    paymentDate: {
        type: Date,
        default: Date.now,
    },
    paymentDetails: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    }
}, { timestamps: true });
    
module.exports = mongoose.model('Payment', paymentSchema);
