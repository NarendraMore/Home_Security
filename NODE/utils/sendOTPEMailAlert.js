const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'boardapp8055@gmail.com',
    pass: 'qqeaawchpscyanry', // App-specific password
  },
});

async function sendOTPEMailAlert(otp, email) {
    console.log('Recipient Email:', email); // Debug log
    try {
      if (!email) {
        throw new Error('Recipient email is not defined');
      }
      const subject = 'Password Reset OTP';
      const message = `Hello,\n\nYour OTP for password reset is: ${otp}. It is valid for 15 minutes.\n\nIf you did not request this, please ignore this email.`;
  
      const mailOptions = {
        from: 'boardapp8055@gmail.com',
        to: email, // Ensure this is populated
        subject: subject,
        text: message,
      };
  
      const info = await transporter.sendMail(mailOptions);
      console.log('OTP Email sent:', info.response);
      return true;
    } catch (error) {
      console.error('Error sending OTP email:', error.message);
      return false;
    }
  }
  

module.exports = sendOTPEMailAlert;
