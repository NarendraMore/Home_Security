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
} 

});

module.exports = mongoose.model('User', userSchema);
