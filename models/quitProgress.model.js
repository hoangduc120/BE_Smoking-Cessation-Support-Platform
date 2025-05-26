const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
var quitProgressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    stageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "QuitPlanStage",
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    cigarettesSmoked: {
        type: Number,
        required: true,
        min: 0,
    },
    healthStatus: {
        type: String,
        required: true,
        trim: true
    },
    notes: {
        type: String,
        trim: true,
        default: "",
    }

}, { timestamps: true });

//Export the model
module.exports = mongoose.model('QuitProgress', quitProgressSchema);