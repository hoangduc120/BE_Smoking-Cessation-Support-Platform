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
  description: String,
  order_index: Number,
  start_date: Date,
  end_date: Date
}, { timestamps: true });

module.exports = mongoose.model("QuitPlanStage", quitPlanStageSchema);
