const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
var tagsSchema = new mongoose.Schema({
    tagId: {
        type: String,
        required: true,
        unique: true,
    },
    tagName: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        default: ''
    },
    blogCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

//Export the model
module.exports = mongoose.model('Tags', tagsSchema);