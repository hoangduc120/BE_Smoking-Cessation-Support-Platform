const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
var notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ["like", "comment", "follow", "approve"],
        required: true,
    },
    read: {
        type: Boolean,
        default: false,
        index: true,
    },
    message: {
        type: String,
        required: true,
    }
}, { timestamps: true });

//Export the model
module.exports = mongoose.model('Notification', notificationSchema);