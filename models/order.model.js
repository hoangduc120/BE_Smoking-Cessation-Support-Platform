const mongoose = require('mongoose');
const ORDER_STATUS = {
    PROCESSING: 'processing',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',
    PENDING: 'pending',
}
var orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    memberShipPlanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MemberShipPlan',
        required: true,
    },
    orderCode: {
        type: String,
        required: true,
        unique: true,
        default: () => {
            return `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
        },
    },
    orderStatus: {
        type: String,
        enum: Object.values(ORDER_STATUS),
        default: ORDER_STATUS.PENDING,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);