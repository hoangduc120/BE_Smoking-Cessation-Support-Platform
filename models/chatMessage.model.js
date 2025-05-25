const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
var chatMessageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    text: {
        type: String,
        default: null,
    },
    image: {
        type: String,
        default: null,
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true,
    },
}, { timestamps: true });

// Validation: Ít nhất phải có text hoặc image
chatMessageSchema.pre('save', function (next) {
    if (!this.text && !this.image) {
        return next(new Error('Message must have either text or image'));
    }
    next();
});

// Index compound cho query hiệu quả
chatMessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
chatMessageSchema.index({ receiverId: 1, isRead: 1 });

//Export the model
module.exports = mongoose.model('ChatMessage', chatMessageSchema);