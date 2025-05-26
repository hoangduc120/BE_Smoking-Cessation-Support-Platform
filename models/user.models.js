const mongoose = require('mongoose');
const crypto = require('crypto');
const userMemberShipModel = require('./userMemberShip.model');

const userSchema = new mongoose.Schema({
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
        enum: ['admin', 'user', 'coach'],
        default: 'user',
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
    bio: {
        type: String,
        default: null,
    },
    dateOfBirth: {
        type: Date,
    },
    profilePicture: {
        type: String,
        default: 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg',
    },
    phone: {
        type: String,
        default: null,
    },
    address: {
        type: String,
        default: null,
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
    quitReason: {
        type: String,
        default: null,
    },
    smokingFreeDays: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

userSchema.methods.createPasswordChangedToken = async function () {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 phút
    return resetToken;
};


userSchema.methods.getActiveMembership = async function () {
    const membership = await userMemberShipModel.findOne({
        userId: this._id,
        paymentStatus: 'paid',
        endDate: { $gte: new Date() },
    }).populate('memberShipPlanId');
    return membership;
};

userSchema.methods.hasFeatureAccess = async function (feature) {
    const membership = await this.getActiveMembership();
    if (!membership) return false;
    return membership.membershipPlanId.features.includes(feature);
};

module.exports = mongoose.model('User', userSchema);