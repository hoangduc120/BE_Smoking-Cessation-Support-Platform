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
  goal: {
    type: String,
    required: true,
    trim: true,
    default: "Reduce smoking or maintain abstinence"
  },
  targetCigarettesPerDay: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  },
  order_index: {
    type: Number,
    required: true,
  },
  start_date: {
    type: Date,
    required: false,
  },
  end_date: {
    type: Date,
    required: false,
  },
  duration: {
    type: Number,
    required: true,
    min: 1,
    max: 365
  },
  completed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model("QuitPlanStage", quitPlanStageSchema);
