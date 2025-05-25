const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
    following: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    followed: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'blocked'],
        default: 'active',
    },
}, { timestamps: true });

followSchema.index({ following: 1, followed: 1 }, { unique: true });

module.exports = mongoose.model('Follow', followSchema);