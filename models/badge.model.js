const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  quitPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quitplan',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  icon_url: {
    type: String,
  },
  awardedAt: {
    type: Date,
  },
  
}, { timestamps: true });

module.exports = mongoose.model('Badge', badgeSchema);
