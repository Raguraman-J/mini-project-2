const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { sendMessage, getHistory, clearHistory } = require('../controllers/chatController');

router.route('/send').post(protect, sendMessage);
router.route('/history').get(protect, getHistory).delete(protect, clearHistory);

module.exports = router;
