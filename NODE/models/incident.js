const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  incident_type: { type: String, required: true }, 
  date: { type:String },
  time: { type: String, },
  timestamp:Date,
  image: { type: String }, 
  video: { type: String }, 
  // alert_sent: { type: Boolean, default: false },
  // response_status: { type: String, default: 'pending' }, // for incident acknowledgment
});

module.exports = mongoose.model('Incident', incidentSchema);
