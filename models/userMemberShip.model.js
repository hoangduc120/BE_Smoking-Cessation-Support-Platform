const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
var userMemberShipSchema = new mongoose.Schema({
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
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'expired'],
        default: 'pending',
    },
    price: {
        type: Number,
        required: true,
    },
    paymentInfo: {
        orderId: String,
        amount: Number,
        createDate: String,
        transactionId: String,
        paymentDate: Date,
        bankCode: String
    }
}, { timestamps: true });

//Export the model
module.exports = mongoose.model('UserMemberShip', userMemberShipSchema);