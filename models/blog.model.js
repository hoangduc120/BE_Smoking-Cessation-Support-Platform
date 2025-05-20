const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
var blogSchema = new mongoose.Schema({
    title: {
        type: String,
        default: null,
    },
    image: [{
        type: String,
        required: true,
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
    }],
    tags: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    isDeleted: {
        type: Boolean,
        default: false,
    },
    isHidden: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

//Export the model
module.exports = mongoose.model('Blog', blogSchema);