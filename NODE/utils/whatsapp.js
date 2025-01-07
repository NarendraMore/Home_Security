// const twilio = require('twilio')
// const accountSid = 'ACa29cc6cd14a8b1014a426d0c2ae05800';
// const authToken = '8256dd027407b2868118df8495feb50a';
// const client = twilio(accountSid, authToken);
// const User = require('../models/user'); // Import the User model

// async function sendWhatsAppAlert(message, videoUrl, imageUrl) {
//     try {
//       const users = await User.find({}, 'mobile country_code'); // Fetch users
  
//       for (const user of users) {
//         const fullNumber = `${user.country_code}${user.mobile}`;
  
//         await client.messages.create({
//           from: 'whatsapp:+14155238886', // Twilio sandbox number
//           to: `whatsapp:${fullNumber}`,
//           body: `${message}\n\nImage: ${imageUrl}\nVideo: ${videoUrl}`, // Include image and video links
//         });
  
//         console.log(`WhatsApp alert sent to ${fullNumber}`);
//       }
//     } catch (error) {
//       console.error('Error sending WhatsApp alerts:', error);
//     }
//   }
  

// module.exports = sendWhatsAppAlert;
