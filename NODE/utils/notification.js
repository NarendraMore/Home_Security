const sendNotification = (io, message) => {
  if (io) {
    // Create a unique notification ID (this can be a timestamp or UUID)
    const notificationId = Date.now(); // or use a package like `uuid` for better uniqueness

    const notification = {
      id: notificationId,
      message: message
    };

    console.log('Sending Notification:', notification); // Log the message being sent
    io.emit('newNotification', notification); // Emit the notification with a unique ID
  } else {
    console.error("Socket.IO instance is not defined.");
  }
};

module.exports = sendNotification;
