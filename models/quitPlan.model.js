const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
var quitplanSchema = new mongoose.Schema({
    coachId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    title: {
        type: String,
    },
    description: {
        type: String,
    },
    startDate: {
        type: Date,
    },
    endDate: {
        type: Date,
    },
    status: {
        type: String,
        enum: ["pending", "ongoing", "completed", "failed"],
        default: "pending",
    },
    expectedQuitDate: {
        type: Date,
    },
}, { timestamps: true });

//Export the model
module.exports = mongoose.model('Quitplan', quitplanSchema);