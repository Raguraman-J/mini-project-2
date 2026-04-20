const express = require('express');
const router = express.Router();
const {
    sendNotification,
    getNotifications,
    markAsRead,
} = require('../controllers/notificationController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/send', protect, admin, sendNotification);
router.get('/', protect, getNotifications);
router.put('/:id/read', protect, markAsRead);

module.exports = router;
