const mongoose = require('mongoose'); // Erase if already required
const ORDER_STATUS = {
    PROCESSING: 'processing',
    CANCELLED: 'cancelled',
    SUCCESS: 'success',
    PENDING: 'pending',
}
// Declare the Schema of the Mongo model
var orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    items: [
        {
            memberShipPlanId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'MemberShipPlan',
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
                min: 1,
            },
            price: {
                type: Number,
                required: true,
                min: 0,
            },
        }
    ],
    paymentMethod: {
        type: String,
        enum: Object.values(PaymentMethod),
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(ORDER_STATUS),
        default: ORDER_STATUS.PENDING,
        required: true
    }
}, { timestamps: true });

//Export the model
module.exports = mongoose.model('Order', orderSchema);