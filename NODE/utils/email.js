const nodemailer = require('nodemailer');
const User = require('../models/user'); 

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'boardapp8055@gmail.com',
    pass: 'qqeaawchpscyanry', 
  }
});

async function sendEmailAlert(subject, message) {
    try {
      // Fetch the recipient email from the User collection
      const user = await User.findOne();
  
      if (!user || !user.email) {
        console.error('No recipient email found in the database.');
        return;
      }
  
      const mailOptions = {
        from: 'boardapp8055@gmail.com',
        to: user.email,
        subject: subject,
        text: message, // Plain text body
      };
  
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent:', info.response);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }
  

module.exports = sendEmailAlert;
