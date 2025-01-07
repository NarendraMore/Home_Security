const mongoose = require('mongoose');

const camConfigurationSchema = new mongoose.Schema({
  cameratype: {
    type: String,
    enum: ['face_cam', 'incident_cam'], // Restricting to these two values
    required: true, // Making this field required
  },
  usb: { 
    type: Number, 
    default: null 
  },
  url: { 
    type: String, 
    default: null 
  },
  cam_id: { 
    type: Number, 
    default: 0 
  },
});

module.exports = mongoose.model('CamConfiguration', camConfigurationSchema);
