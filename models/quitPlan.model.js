const mongoose = require('mongoose');

// Declare the Schema of the Mongo model
var quitplanSchema = new mongoose.Schema({
  coachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  title: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    default: null,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  duration: {
    type: Number,
    required: function () {
      return this.status === 'template';
    },
    min: 1,
    max: 365
  },
  status: {
    type: String,
    enum: ["template", "pending", "ongoing", "completed", "failed"],
    default: "template",
  }
}, { timestamps: true });

quitplanSchema.pre('save', function (next) {
  if (this.userId === 'null' || this.userId === '') {
    this.userId = null;
  }
  next();
});

quitplanSchema.index(
  { userId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "ongoing" } }
);

module.exports = mongoose.model('Quitplan', quitplanSchema);
