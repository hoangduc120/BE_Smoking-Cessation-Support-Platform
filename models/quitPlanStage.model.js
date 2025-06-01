const mongoose = require("mongoose");

const quitPlanStageSchema = new mongoose.Schema({
  quitPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quitplan",
    required: true
  },
  stage_name: {
    type: String,
    required: true
  },
  description: {
    type: String,
  },
  order_index: {
    type: Number,
    required: true,
  },
  start_date: {
    type: Date,
    required: true,
  },
  end_date: {
    type: Date,
    required: true,
  },
  completed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model("QuitPlanStage", quitPlanStageSchema);
