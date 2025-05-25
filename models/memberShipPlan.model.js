const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
var memberShipPlanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    description: {
        type: String,
    },
    price: {
        type: Number,
        required: true,
    },
    duration: {
        type: Number,
        required: true,
    },
    features: [{
        type: String,
    }],
}, { timestamps: true });

//Export the model
module.exports = mongoose.model('MemberShipPlan', memberShipPlanSchema);