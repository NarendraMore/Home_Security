const cloudinary = require('./cloudinary'); // Import Cloudinary configuration

// Function to upload file to Cloudinary (image or video)
const uploadFileToCloudinary = async (filePath, fileType) => {
  try {
    const resourceType = fileType === 'video' ? 'video' : 'image'; // Determine resource type
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: resourceType,
    });
    console.log(`${fileType} uploaded to Cloudinary: ${result.secure_url}`);
    return result.secure_url; // Return the secure URL of the uploaded file
  } catch (error) {
    console.error(`Error uploading ${fileType} to Cloudinary:`, error.message);
    throw error;
  }
};

module.exports = uploadFileToCloudinary;
