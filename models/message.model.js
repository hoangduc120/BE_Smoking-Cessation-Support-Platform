const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
var messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    message: {
        type: String,
        required: true,
    }
}, { timestamps: true });

//Export the model
module.exports = mongoose.model('Message', messageSchema);