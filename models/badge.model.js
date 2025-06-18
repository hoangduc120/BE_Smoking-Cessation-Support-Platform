const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
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
    required: true,
  },
  icon_url: {
    type: String,
  },

}, { timestamps: true });

// Đảm bảo mỗi quitPlan chỉ có một badge
badgeSchema.index({ quitPlanId: 1 }, { unique: true });

module.exports = mongoose.model('Badge', badgeSchema);
