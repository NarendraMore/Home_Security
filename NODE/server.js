const http = require('http');
const socketIo = require('socket.io');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

// Import your routers
const surveillanceRouter = require('./routers/surveillanceMode');
const incidentRouter = require('./routers/incident');
const userRouter = require('./routers/user');
const camConfigurationRouter = require('./routers/camConfiguration');

const app = express();
const server = http.createServer(app);

// Create Socket.IO server instance with CORS setup
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:4200', // Angular default port (change if different)
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  },
});

// Make io accessible in all routes
app.set('io', io);

// Body-parser and other middlewares
app.use(bodyParser.json());
app.use(cors());

// MongoDB connection setup
mongoose.connect('mongodb://localhost:27017/Home_security', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Use routers
app.use(surveillanceRouter);
app.use(incidentRouter);
app.use(userRouter);
app.use(camConfigurationRouter);

// // Emit notification every 5 seconds
// let notificationCount = 1;
// setInterval(() => {
//   io.emit(`${notificationCount}`);
//   notificationCount++;
// }, 5000);

// Listen for socket connection
io.on('connection', (socket) => {
  console.log('A user connected');

  // Listen for events from clients
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Start the server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
