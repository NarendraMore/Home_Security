const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'ddyck28zx', // Replace with your Cloudinary cloud name
  api_key: '164534242633988', // Replace with your API key
  api_secret: 'HDDRczeye2yjJqXtPHtej1bySAc', // Replace with your API secret
});

module.exports = cloudinary;
