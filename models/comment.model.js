const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
var commentSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    blog: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Blog",
    }
});

//Export the model
module.exports = mongoose.model('Comment', commentSchema);