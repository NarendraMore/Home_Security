const express = require('express');
const router = express.Router();
const CamConfiguration = require('../models/camConfiguration'); // Adjust path to your model file

// POST API to add camera configuration
// Helper function to get the next value for USB or cam_id
const getNextValue = async (field, filter) => {
  const existingItems = await CamConfiguration.find(filter).sort({ [field]: -1 });
  return existingItems.length && !isNaN(existingItems[0][field])
    ? existingItems[0][field] + 1
    : 0; // Default to 0 if none exist
};

// POST API to add camera configuration
router.post('/addCamera', async (req, res) => {
  const { cameratype, usb, url } = req.body;

  try {
    // Validate cameratype
    if (!cameratype || (cameratype !== 'face_cam' && cameratype !== 'incident_cam')) {
      return res.status(400).json({ message: 'Invalid or missing cameratype. Must be "face_cam" or "incident_cam".' });
    }

    // Handle Face Camera (usb and url cases)
    if (cameratype === 'face_cam') {
      if (usb !== undefined && usb !== null) {
        // Validate USB
        if (typeof usb !== 'number') {
          return res.status(400).json({ message: 'USB must be a valid number.' });
        }

        const newUsbValue = await getNextValue('usb', { usb: { $ne: null } });
        const newCam = new CamConfiguration({
          cameratype: 'face_cam',
          usb: newUsbValue,
          url: null,
          cam_id: newUsbValue,
        });

        await newCam.save();
        return res.status(201).json({ message: 'Face camera (USB) added successfully', data: newCam });
      } else if (url) {
        // Validate URL
        if (typeof url !== 'string') {
          return res.status(400).json({ message: 'URL must be a valid string.' });
        }

        const existingUrl = await CamConfiguration.findOne({ url, cameratype: 'face_cam' });
        if (existingUrl) {
          return res.status(400).json({ message: 'Face camera (URL) already exists' });
        }

        const newCamId = await getNextValue('cam_id', { cameratype: 'face_cam' });
        const newCam = new CamConfiguration({
          cameratype: 'face_cam',
          usb: null,
          url,
          cam_id: newCamId,
        });

        await newCam.save();
        return res.status(201).json({ message: 'Face camera (URL) added successfully', data: newCam });
      }
    }

    // Handle Incident Camera (url case)
    if (cameratype === 'incident_cam') {
      // Validate URL
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: 'URL is required and must be a valid string.' });
      }

      const existingUrl = await CamConfiguration.findOne({ url, cameratype: 'incident_cam' });
      if (existingUrl) {
        return res.status(400).json({ message: 'Incident camera (URL) already exists' });
      }

      const newCamId = await getNextValue('cam_id', { cameratype: 'incident_cam' });
      const newCam = new CamConfiguration({
        cameratype: 'incident_cam',
        usb: null,
        url,
        cam_id: newCamId,
      });

      await newCam.save();
      return res.status(201).json({ message: 'Incident camera added successfully', data: newCam });
    }

    // Invalid request
    return res.status(400).json({ message: 'Invalid input or type.' });
  } catch (error) {
    console.error('Error in addCamera API:', error);
    res.status(500).json({ message: 'An error occurred', error });
  }
});
  
module.exports = router;
