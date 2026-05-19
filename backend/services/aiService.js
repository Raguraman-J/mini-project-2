const Groq = require("groq-sdk");
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL_NAME = 'llama-3.3-70b-versatile';

const generateResponse = async (userMessage) => {
    try {
        const response = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a helpful multi-lingual AI assistant for college students. You help them with scheduling, studying, and general inquiries. You must always reply in the exact language the user used to speak to you. Keep your answers concise, clear, and extremely fast."
                },
                {
                    role: "user",
                    content: userMessage
                }
            ],
            model: MODEL_NAME,
        });

        if (response.choices && response.choices.length > 0) {
            return response.choices[0].message.content;
        } else {
            throw new Error('Invalid response from Groq');
        }
    } catch (error) {
        console.error('CRITICAL Groq API Error:', error.message);
        if (error.response) {
            console.error('Error Status:', error.status);
            console.error('Error Data:', error.data);
        }
        return "I'm currently unable to reach my AI brain. The server might be experiencing high load or my API key may be misconfigured.";
    }
};

module.exports = {
    generateResponse
};
