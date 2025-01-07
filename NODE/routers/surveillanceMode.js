const express = require('express');
const router = express.Router();
const SurveillanceMode = require('../models/surveillanceMode'); 

// Toggle surveillance mode
// router.post('/surveillance/toggle', async (req, res) => {
//   const { status,date,time,video } = req.body;

//   try {
//     let mode = await SurveillanceMode.findOne();

//     // If no record exists, create a new one
//     if (!mode) {
//       mode = new SurveillanceMode({ status,date,time,video });
//     } else {
//       // Update the existing record
//       mode.status = status;
//     }

//     await mode.save();
//     res.status(200).json({ message: `Surveillance mode set to ${status}`, mode });
//   } catch (error) {
//     res.status(500).json({ message: 'Error updating surveillance mode', error });
//   }
// });

const testDefaultMode = async () => {
  try {
    // Check if a document with status 'off' already exists
    const existingMode = await SurveillanceMode.findOne({ status: 'off' });

    if (existingMode) {
      console.log('Surveillance Mode with status "off" already exists');
      return;
    }

    // If no existing document with status 'off', create a new one
    const mode = new SurveillanceMode();
    await mode.save();

    console.log('Saved Surveillance Mode:', mode);
  } catch (error) {
    console.error('Error saving Surveillance Mode:', error);
  }
};

testDefaultMode();

// Get current surveillance mode
router.get('/surveillance/status', async (req, res) => {
  try {
    const mode = await SurveillanceMode.findOne();
    
    if (!mode) {
      return res.status(404).json({ message: 'Surveillance mode not set' });
    }

    res.status(200).json(mode);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving surveillance mode', error });
  }
});

module.exports = router;
