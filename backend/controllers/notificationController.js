const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendNotificationEmail } = require('../services/mailService');

// @desc    Send notification to faculty
// @route   POST /api/notifications/send
// @access  Private/Admin
const sendNotification = async (req, res) => {
    const { recipientId, message, type } = req.body;

    if (!recipientId || !message) {
        return res.status(400).json({ message: 'Please provide recipient and message' });
    }

    try {
        const recipient = await User.findById(recipientId);

        if (!recipient) {
            return res.status(404).json({ message: 'Recipient not found' });
        }

        const notification = await Notification.create({
            recipient: recipientId,
            message,
            type: type || 'general',
        });

        // Send direct email notification
        if (recipient.email) {
            await sendNotificationEmail(
                recipient.email,
                `Notification: ${type || 'General'}`,
                message
            );
        }

        res.status(201).json({
            message: 'Notification sent successfully',
            notification,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while sending notification' });
    }
};

// @desc    Get notifications for logged-in user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .sort({ createdAt: -1 });
        res.status(200).json(notifications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while fetching notifications' });
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        // Check if notification belongs to user
        if (notification.recipient.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        notification.read = true;
        await notification.save();

        res.status(200).json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while updating notification' });
    }
};

module.exports = {
    sendNotification,
    getNotifications,
    markAsRead,
};
