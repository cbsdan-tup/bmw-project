const express = require('express');
const router = express.Router();
const { 
  getNotifications, 
  markAsRead, 
  markAllAsRead,
  createFromMessage
} = require('../controllers/notificationController');
const { isAuthenticatedUser } = require('../middleware/auth');

// Require authentication for all routes
router.use(isAuthenticatedUser);

// Get notifications
router.get('/notifications', getNotifications);

// Mark notification as read
router.put('/notifications/:id/read', markAsRead);

// Mark all notifications as read
router.put('/notifications/mark-all-read', markAllAsRead);

// Create notification from message
router.post('/notifications/message', createFromMessage);

module.exports = router;
