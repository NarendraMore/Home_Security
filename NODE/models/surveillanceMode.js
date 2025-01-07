const mongoose = require('mongoose');

const surveillanceModeSchema = new mongoose.Schema({
  status: { type: String, default: 'off', enum: ['on', 'off'] },
  date: { type: String },
  time: { type: String },
  video: { type: String },
});

module.exports = mongoose.model('SurveillanceMode', surveillanceModeSchema);
