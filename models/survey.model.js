const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
var surveySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    
});

//Export the model
module.exports = mongoose.model('Survey', surveySchema);