const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
var surveySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    motivation: {
        type: String,
        required: true,
        trim: true
    },
    smokingDurationYear: {
        type: Number,
        required: true,
        min: 0,
    },
    peakSmokingTimes: {
        type: String,
        required: true,
        trim: true
    },
    quitAttempts: {
        type: Number,
        required: true,
        min: 0,
    },
    supportNeeded: {
        type: String,
        required: true,
        trim: true
    },
    quitPlanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quitplan",
        default: null
    },
    latestProgressId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "QuitProgress",
        default: null
    }
}, { timestamps: true });

//Export the model
module.exports = mongoose.model('Survey', surveySchema);