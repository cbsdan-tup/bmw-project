const express = require('express');
const router = express.Router();
const { 
  getNotifications,
  getNotificationCount,
  markAsRead, 
  markAllAsRead,
  createFromMessage,
  deleteNotification 
} = require('../controllers/notificationController');
const { isAuthenticatedUser } = require('../middleware/auth');

router.get('/notifications', isAuthenticatedUser, getNotifications);
router.get('/notifications/count', isAuthenticatedUser, getNotificationCount);
router.put('/notifications/:id/read', isAuthenticatedUser, markAsRead);
router.put('/notifications/mark-all-read', isAuthenticatedUser, markAllAsRead);
router.post('/notifications/message', isAuthenticatedUser, createFromMessage);
router.delete('/notifications/:id', isAuthenticatedUser, deleteNotification);

module.exports = router;
