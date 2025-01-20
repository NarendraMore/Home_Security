const cloudinary = require('./cloudinary'); // Import Cloudinary configuration
const fs = require('fs'); // To check file existence before uploading

// Function to upload file to Cloudinary (image or video)
const uploadFileToCloudinary = async (filePath, fileType) => {
  try {
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const resourceType = fileType === 'video' ? 'video' : 'image'; // Determine resource type

    // Log the file details for debugging
    // console.log(`Uploading ${fileType} from path: ${filePath}`);

    // Upload the file to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: resourceType,
      // For video, you can include additional parameters like quality adjustment, etc.
      ...(fileType === 'video' && { 
        resource_type: 'video',
        format: 'mp4',  // Ensuring it's in MP4 format
        public_id: `incident/${Date.now()}`,  // Optional: to define custom naming convention
      }),
    });

    console.log(`${fileType} uploaded to Cloudinary: ${result.secure_url}`);
    return result.secure_url; // Return the secure URL of the uploaded file
  } catch (error) {
    console.error(`Error uploading ${fileType} to Cloudinary:`, error.message);
    throw error;  // Re-throw the error to handle it further up
  }
};

module.exports = uploadFileToCloudinary;
