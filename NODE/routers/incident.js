const express = require('express');
const router = express.Router();
const Incident = require('../models/incident');
const uploadFileToCloudinary = require('../utils/upload');
const sendEmailAlert = require('../utils/email');
const sendNotification = require('../utils/notification');
const axios = require('axios')
const fs = require('fs')
const mongoose = require('mongoose')

// API to generate incident and upload to Cloudinary after delay
router.post('/generate', async (req, res) => {
  const { date, time, incident_type, image, video } = req.body;

  try {
    let imageUrl = null;
    let videoUrl = null;

    // Introduce a 30-second delay
    setTimeout(async () => {
      try {
        // Check if files exist before attempting to upload
        if (!fs.existsSync(image)) {
          throw new Error(`Image file not found: ${image}`);
        }
        if (!fs.existsSync(video)) {
          throw new Error(`Video file not found: ${video}`);
        }

        // Upload image and video to Cloudinary
        const uploadPromises = [];
        if (image) {
          uploadPromises.push(uploadFileToCloudinary(image, 'image')); // Upload image
        }
        if (video) {
          uploadPromises.push(uploadFileToCloudinary(video, 'video')); // Upload video
        }

        const uploadResults = await Promise.all(uploadPromises);

        // Extract URLs
        if (image) imageUrl = uploadResults.shift(); // First result
        if (video) videoUrl = uploadResults.shift(); // Second result

        // Save incident to the database
        const newIncident = new Incident({
          date,
          time,
          incident_type,
          image: imageUrl,
          video: videoUrl,
        });

        await newIncident.save();

        // Prepare the notification message for real-time
        const notificationMessage = `New ${incident_type} incident reported at ${time} on ${date}`;
        const io = req.app.get('io'); // Access io instance from the app
        sendNotification(io, notificationMessage); // Emit notification to all connected clients

        // Prepare and send email notification
        const emailMessage = `New ${incident_type} incident reported on ${date} at ${time}.`;
        await sendEmailAlert(
          `Incident Report: ${incident_type}`,
          `${emailMessage}\n\nImage: ${imageUrl}\nVideo: ${videoUrl}`
        );

        // Respond with success
        res.status(200).send({
          message: `Incident of type ${incident_type} created successfully`,
          incident: newIncident,
        });
      } catch (innerError) {
        console.error('Error during delayed upload:', innerError.message);
        res.status(500).send({ error: 'Failed to upload and save incident' });
      }
    }, 30000); // Delay of 30 seconds before uploading

  } catch (error) {
    console.error('Error handling incident generation:', error.message);
    res.status(500).send({ error: 'Failed to create incident' });
  }
});

// Get all incidents
router.get('/getIncidents', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 5);

    // Fetch incidents with pagination
    const incidents = await Incident.find()
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    const totalCount = await Incident.countDocuments();

    // // Prepare the notification message
    // const notificationMessage = `${incidents.length} incidents fetched on page ${pageNumber}.`;

    // // Send real-time notification using the utility function
    // const io = req.app.get('io'); // Access io instance from the app
    // sendNotification(io, notificationMessage); // Emit notification to all connected clients

    // Send response with the fetched incidents and pagination data
    res.status(200).json({
      incidents,
      totalPages: Math.ceil(totalCount / limitNumber),
      currentPage: pageNumber,
      totalCount,
    });
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Error fetching incidents' });
  }
});


// GET API to fetch an image by incident ID or all images
router.get('/getIncidentImage/:id?', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the id format
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid or missing incident ID' });
    }

    // Fetch the incident with the image URL
    const incident = await Incident.findById(id).select('image');
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Check if the image field exists
    if (!incident.image) {
      return res.status(404).json({ message: 'Image not found for this incident' });
    }

    // Redirect the client to the image URL
    res.redirect(incident.image);
  } catch (error) {
    console.error('Error fetching incident image:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


// GET API to fetch a video by incident ID or all videos
router.get('/getIncidentVideo/:id?', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the incident with the video URL
    const incident = await Incident.findById(id).select('video');
    if (!incident.video) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Redirect the client to the video URL
    res.redirect(incident.video);
  } catch (error) {
    console.error('Error fetching incident video:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


// Get incident by ID
router.get('/getIncident/:id', async (req, res) => {
  const incident = await Incident.findById(req.params.id);

  if (!incident) return res.status(404).send({ message: 'Incident not found' });

  res.send(incident);
});

// Helper function to send notifications based on incident type
async function handleNotifications(incident) {
  const { incident_type, image, video } = incident;
  console.log(video);
  // Customize notifications based on incident type
  if (incident_type === 'fire') {
    sendWhatsAppAlert("Fire detected!", ["mobile", "backup_contact"], video,image);
    sendEmailAlert("Fire Alert", "A fire has been detected in your home.", "security_contact_email");
  } else if (incident_type === 'outsider') {
    sendWhatsAppAlert("Outsider detected!", ["mobile"], video,image);
  } else if (incident_type === 'weapon') {
    sendWhatsAppAlert("Weapon detected!", ["mobile", "backup_contact"], video,image);
    sendEmailAlert("Weapon Alert", "A weapon has been detected in your home.", "security_contact_email");
  }
}


module.exports = router;

