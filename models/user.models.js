const mongoose = require('mongoose'); // Erase if already required

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

}, { timestamps: true });

//Export the model
module.exports = mongoose.model('User', userSchema);