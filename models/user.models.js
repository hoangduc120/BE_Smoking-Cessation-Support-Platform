const mongoose = require('mongoose'); // Erase if already required
const crypto = require('crypto');

// Declare the Schema of the Mongo model
var userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    googleId: {
        type: String,
        default: null,
    },
    role: {
        type: String,
        required: true,
        enum: ['admin', 'user', "coach"],
        default: "user",
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
    },
    dateOfBirth: {
        type: Date,
    },
    profilePicture: {
        type: String,
        default: "https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg",
    },
    bio: {
        type: String,
        default: null,
    },
    followers: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "User",
    },
    following: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "User",
    },
    refreshToken: {
        type: String,
        default: null,
    },
    passwordResetToken: {
        type: String,
        default: null,
    },
    passwordResetExpires: {
        type: Date,
        default: null,
    },
    passwordChangeAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

// Method để tạo password reset token
userSchema.methods.createPasswordChangedToken = async function () {
    const resetToken = crypto.randomBytes(32).toString("hex");
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 phút
    return resetToken;
};

//Export the model
module.exports = mongoose.model('User', userSchema);