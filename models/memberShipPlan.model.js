const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
var memberShipPlanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        enum: ['Base', 'Pro', 'Premium']
    },
    description: {
        type: String,
    },
    price: {
        type: Number,
        required: true,
        default: 0
    },
    duration: {
        type: Number,
        required: true,
        default: 30 // days
    },
    features: [{
        type: String,
        enum: [
            'basic_features',
            'unlimited_blog_posts',
            'advanced_quit_plans',
            'priority_support',
            'custom_quit_plan',
            'analytics_dashboard',
            'coach_interaction',
            'community_access'
        ]
    }],
    limitations: {
        blogPostsPerDay: {
            type: Number,
            default: null // null means unlimited
        },
        maxActiveQuitPlans: {
            type: Number,
            default: 1
        },
        customQuitPlanAccess: {
            type: Boolean,
            default: false
        }
    },
    level: {
        type: Number,
        required: true,
        default: 1 // 1: Base, 2: Pro, 3: Premium
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

//Export the model
module.exports = mongoose.model('MemberShipPlan', memberShipPlanSchema);