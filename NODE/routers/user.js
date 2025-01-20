const express = require('express');
const router = express.Router();
const User = require('../models/user');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendOTPEMailAlert = require('../utils/sendOTPEMailAlert');
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;

// Set up Multer for in-memory storage and image filtering
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Check if the uploaded file is an image
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('File type not allowed'), false);
        }
        cb(null, true);
    },
});

// Function to generate the next user_id
async function generateUserId() {
    const lastUser = await User.findOne().sort({ user_id: -1 }).exec();
    const lastId = lastUser && !isNaN(parseInt(lastUser.user_id, 10))
        ? parseInt(lastUser.user_id, 10)
        : 0;
    const newId = lastId + 1;
    return newId.toString().padStart(2, '0');
}

// Helper function to validate email and password
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Standard email regex
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
  return passwordRegex.test(password);
};

router.post('/register', upload.single('image'), async (req, res) => {
  try {
      const { email, password, name, mobile, backup_contact, security_contact, role } = req.body;

      // Validate email format
      if (!validateEmail(email)) {
          return res.status(400).json({ error: 'Invalid email format' });
      }

      // Validate password strength
      if (!validatePassword(password)) {
          return res.status(400).json({
              error: 'Password must be at least 8 characters long and include one uppercase letter, one lowercase letter, one number, and one special character',
          });
      }

      // Check if the email is already registered
      const existingUser = await User.findOne({ email });
      if (existingUser) {
          return res.status(400).json({ error: 'Email is already registered' });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate the next user_id (assuming you have a function for this)
      const userId = await generateUserId();

      // Create a new registration document
      const user = new User({
          name,
          user_id: userId,
          email,
          password: hashedPassword,
          mobile,
          backup_contact,
          security_contact,
          role,
          image: req.file
              ? {
                    filename: req.file.originalname,
                    data: req.file.buffer,
                }
              : undefined, // Image is optional
      });

      // Save the registration document to the database
      const result = await user.save();

      // Send real-time notification using Socket.IO
      const io = req.app.get('io'); // Get the `io` instance from the app
      if (io) {
          io.emit('userRegistered', {
              message: `A new person named ${result.name} has been registered.`,
              registrationDetails: {
                  name: result.name,
                  user_id: result.user_id,
                  email: result.email,
                  role: result.role,
              },
          });
      }

      // Respond to the client
      res.status(200).json({
          message: `A new person named ${result.name} has been registered.`,
          registrationDetails: result,
      });
  } catch (err) {
      console.error('Error during registration:', err.message);
      res.status(500).json({ error: err.message });
  }
});


// Login endpoint
const validEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Standard email regex
  return emailRegex.test(email);
};

const validPassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
  return passwordRegex.test(password);
};

router.post('/login', async (req, res) => {
  try {
      const { email, password } = req.body;

      // Validate email and password format
      if (!validEmail(email)) {
          return res.status(400).json({ error: 'Invalid email format' });
      }
      if (!validPassword(password)) {
          return res.status(400).json({
              error: 'Invalid password format. Password must be at least 8 characters long and include one uppercase letter, one lowercase letter, one number, and one special character.',
          });
      }

      // Find the user by email
      const user = await User.findOne({ email });
      if (!user) {
          return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Compare the provided password with the hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
          return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate a JWT token
      const token = jwt.sign(
          {
              userId: user.user_id,
              email: user.email,
              role: user.role,
          },
          JWT_SECRET,
          { expiresIn: '1h' } // Token expires in 1 hour
      );

      // Send real-time notification using Socket.IO
      const io = req.app.get('io'); // Access the `io` instance from the app
      if (io) {
          io.emit('userLoggedIn', {
              message: `User ${user.name} has logged in.`,
              userDetails: {
                  name: user.name,
                  email: user.email,
                  role: user.role,
              },
          });
      } else {
          console.warn('Socket.IO not initialized');
      }

      // Send response with the JWT token and user details
      res.status(200).json({
          message: 'Login successful',
          token,
          userDetails: {
              name: user.name,
              email: user.email,
              role: user.role,
          },
      });
  } catch (err) {
      console.error('Error during login:', err.message);
      res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});


// Get all incidents
router.get('/getUser', async (req, res) => {
    const users = await User.find();
    res.send(users);
  });


// Get user by ID
// router.get('/:id', async (req, res) => {
//   const user = await User.findById(req.params.id);
//   if (!user) return res.status(404).send({ message: 'User not found' });
//   res.send(user);
// });

// Update user contact information
router.put('/update/:id', async (req, res) => {
  const { backup_contact, security_contact } = req.body;
  const user = await User.findById(req.params.id);

  if (!user) return res.status(404).send({ message: 'User not found' });

  user.backup_contact = backup_contact || user.backup_contact;
  user.security_contact = security_contact || user.security_contact;

  await user.save();
  res.send({ message: 'User contacts updated', user });
});

//Update User data
router.put('/updateUser/:id', upload.single('image'), async (req, res) => {
  const id = req.params.id;
  const { name, email, password, mobile, role, backup_contact, security_contact } = req.body;

  try {
      // Initialize updateFields and only add non-empty, valid fields
      let updateFields = {};

      if (name && name.trim()) updateFields.name = name.trim();
      if (email && email.trim()) updateFields.email = email.trim();
      if (mobile && !isNaN(mobile)) updateFields.mobile = mobile;
      if (role && role.trim()) updateFields.role = role.trim();
      if (backup_contact && !isNaN(backup_contact)) updateFields.backup_contact = backup_contact;
      if (security_contact && !isNaN(security_contact)) updateFields.security_contact = security_contact;

      // Check if a new image file is uploaded
      if (req.file) {
          updateFields.image = {
              filename: req.file.originalname, // File name from multer
              data: req.file.buffer,          // File data as buffer
          };
      }

      // Hash the password if it's provided and not empty
      if (password && password.trim()) {
          const saltRounds = 10; // Number of salt rounds
          const hashedPassword = await bcrypt.hash(password.trim(), saltRounds);
          updateFields.password = hashedPassword; // Save the hashed password
      }

      // Ensure there is at least one valid field to update
      if (Object.keys(updateFields).length === 0) {
          return res.status(400).json({ message: 'No valid fields provided for update' });
      }

      // Update the user by ID
      const user = await User.findByIdAndUpdate(
          id,
          { $set: updateFields }, // Only update provided fields
          { new: true }           // Return the updated document
      );

      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      // Create a notification message for the updated user
      const notificationMessage = `User with name "${user.name}" has been updated.`;

      // Emit the notification via Socket.IO to all connected clients
      req.app.get('io').emit('updateNotification', {
          message: notificationMessage,
          updatedUser: user,
      });

      // Send the response with the updated user and notification message
      res.status(200).json({
          message: 'User updated successfully',
          notification: notificationMessage,
          updatedUser: user,
      });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});

// DELETE API to delete a user by user_id
router.delete('/delete-user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
      // Find and delete the user
      const deletedUser = await User.findOneAndDelete({ user_id: userId });

      if (!deletedUser) {
          return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json({
          message: 'User deleted successfully',
          deletedUser,
      });
  } catch (error) {
      res.status(500).json({
          message: 'Error deleting user',
          error: error.message,
      });
  }
});  

//***************************************************** */
//API for Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid or missing email' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User with this email does not exist' });
    }

    const otp = crypto.randomInt(100000, 999999);

    user.otp = otp;
    user.otpExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    const isEmailSent = await sendOTPEMailAlert(otp, email);
    if (!isEmailSent) {
      return res.status(500).json({ error: 'Failed to send OTP email' });
    }

    res.status(200).json({ message: 'OTP has been sent to your email' });
  } catch (error) {
    console.error('Error in Forgot Password:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//API for Reset password
router.post('/reset-password', async (req, res) => {
  try {
      const { email, otp, newPassword } = req.body;

      // Validate input
      if (!email || !otp || !newPassword) {
          return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
      }

      // Find the user by email
      const user = await User.findOne({ email });
      if (!user) {
          return res.status(404).json({ error: 'User not found with the provided email.' });
      }

      // Check if OTP matches
      if (user.otp !== parseInt(otp, 10)) {
          return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
      }

      // Check if OTP is expired
      if (Date.now() > user.otpExpiry) {
          return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the password and clear OTP fields
      user.password = hashedPassword;
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();

      res.status(200).json({ message: 'Password has been successfully reset.' });
  } catch (error) {
      console.error('Error in Reset Password:', error.message);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
