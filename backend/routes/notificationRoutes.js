const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const {
  sendNotification,
  getNotifications,
  markAsRead,
  getNotificationById,
  deleteNotification,
} = require('../controllers/notificationController');

// GET ONE APPOINTMENT / NOTIFICATION
router.get('/details/:id', authMiddleware, getNotificationById);

// SEND
router.post('/', authMiddleware, sendNotification);

// GET USER NOTIFICATIONS
router.get('/:userId', authMiddleware, getNotifications);

// MARK AS READ
router.patch('/:id/read', authMiddleware, markAsRead);

// DELETE
router.delete('/:id', authMiddleware, deleteNotification);

module.exports = router;