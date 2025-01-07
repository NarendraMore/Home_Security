const express = require('express');
const router = express.Router();
const User = require('../models/user');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Secret key for JWT
const JWT_SECRET = 'myjwtsecretkey';

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

// Registration endpoint
router.post('/register', upload.single('image'), async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if the email is already registered
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email is already registered' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate the next user_id
        const userId = await generateUserId();

        // Create a new registration document
        const user = new User({
            name: req.body.name,
            user_id: userId,
            email,
            password: hashedPassword,
            mobile: req.body.mobile,
            backup_contact: req.body.backup_contact,
            security_contact: req.body.security_contact,
            role: req.body.role,
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
router.post('/login', async (req, res) => {
  try {
      const { email, password } = req.body;

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
      io.emit('userLoggedIn', {
          message: `User ${user.name} has logged in.`,
          userDetails: {
              name: user.name,
              email: user.email,
              role: user.role,
          },
      });

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
      res.status(500).json({ error: err.message });
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
    const { name, email, mobile, backup_contact, security_contact} = req.body;
    
    try {
      let updateFields = {
        name,
        email,
        mobile,
        backup_contact,
        security_contact
      };
  
      // Check if a new file is uploaded and update the file field accordingly
      if (req.image) {
        updateFields.image = {
          filename: req.image.originalname, 
          data: req.image.buffer
      }
      }
      const user = await User.findByIdAndUpdate(
        id,
        updateFields,
        { new: true }
      );
  
      if (!user) {
        res.status(404).send('User not found');
      } else {
        // Create a notification message for the updated employee
        const notificationMessage = `User with name "${user.name}" has been updated.`;
  
        // Emit the notification via Socket.IO to all connected clients
        req.app.get('io').emit('updateNotification', {
          message: notificationMessage,
          updatedEmployee: user,
        });
  
        // Send the response with the updated user and notification message
        res.send({
          message: 'User updated successfully',
          notification: notificationMessage,
          updatedUser: user
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).send('Error updating user');
    }
  });
module.exports = router;
