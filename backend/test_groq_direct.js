require('dotenv').config();
const { generateResponse } = require('./services/aiService');

async function testGroq() {
    console.log('Testing Groq with key:', process.env.GROQ_API_KEY?.substring(0, 10) + '...');
    const response = await generateResponse('Hello, are you working?');
    console.log('Bot Response:', response);
}

testGroq();
