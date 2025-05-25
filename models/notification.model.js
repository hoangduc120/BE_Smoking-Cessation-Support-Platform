const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
var notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ["email", "push"],
        required: true,
    },
    sentAt: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ["sent", "failed"],
        required: true,
    }
}, { timestamps: true });

//Export the model
module.exports = mongoose.model('Notification', notificationSchema);