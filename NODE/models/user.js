const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String  },
  user_id: {type:String},
  email:{type:String},
  password:{type:String},
  country_code: { type: String, default: '+91' },
  mobile: { type: Number },
  backup_contact: { type: Number },
  security_contact: { type: Number },
  role: { type: String },
  image: {
    filename: String,
    data: Buffer
} ,
otp: { type: Number }, // Field to store the OTP
otpExpiry: { type: Date }, // Field to store the OTP expiration time
});

// Add an index for email to improve query performance
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
