const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
var smokingStatusSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly", "yearly"],
    },
    smokingPrice: {
        type: Number,
    },
    mainReason:{
        type: String,
    }
}, { timestamps: true });

//Export the model
module.exports = mongoose.model('SmokingStatus', smokingStatusSchema);