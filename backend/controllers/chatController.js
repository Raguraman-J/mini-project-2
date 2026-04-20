const Chat = require('../models/Chat');
const aiService = require('../services/aiService');

// @desc    Send a message and get AI response
// @route   POST /api/chat/send
// @access  Private (Student only recommended)
const sendMessage = async (req, res) => {
    const { message } = req.body;
    const userId = req.user._id;

    if (!message) {
        return res.status(400).json({ message: 'Message content is required' });
    }

    try {
        // 1. Save User Message
        const userChat = await Chat.create({
            userId,
            role: 'user',
            content: message
        });

        // 2. Generate AI Response
        const aiResponseContent = await aiService.generateResponse(message);

        // 3. Save AI Message
        const aiChat = await Chat.create({
            userId,
            role: 'assistant',
            content: aiResponseContent
        });

        // 4. Return the AI response (and maybe the user message id for confirmation)
        res.status(201).json({
            userMessage: userChat,
            aiMessage: aiChat
        });

    } catch (error) {
        console.error('Chat Error:', error);
        res.status(500).json({ message: 'Failed to process message' });
    }
};

// @desc    Get chat history
// @route   GET /api/chat/history
// @access  Private
const getHistory = async (req, res) => {
    const userId = req.user._id;

    try {
        const history = await Chat.find({ userId }).sort({ createdAt: 1 }); // Oldest first
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch history' });
    }
};

// @desc    Clear chat history
// @route   DELETE /api/chat/history
// @access  Private
const clearHistory = async (req, res) => {
    const userId = req.user._id;
    try {
        await Chat.deleteMany({ userId });
        res.json({ message: 'Chat history cleared' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to clear history' });
    }
}

module.exports = {
    sendMessage,
    getHistory,
    clearHistory
};
