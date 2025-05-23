const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  icon_url: String,
  type: {
    type: String,
    enum: ["checkin", "progress", "milestone", "custom"],
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Badge', badgeSchema);
