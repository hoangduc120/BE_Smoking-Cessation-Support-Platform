const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
var customQuitPlanSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    coachId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    rules: [{
        rule: {
            type: String,
            enum: ["daily", "duration", "specificGoal", "other"],
            required: true,
        },
        value: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        description: {
            type: String,
            required: true,
        }
    }],
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    quitPlanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quitplan',
        default: null,
    },
    rejectionReason: {
        type: String,
        trim: true,
    },
    approvedAt: {
        type: Date,
    },
    rejectedAt: {
        type: Date,
    }
}, { timestamps: true });

//Export the model
module.exports = mongoose.model('CustomQuitPlan', customQuitPlanSchema);