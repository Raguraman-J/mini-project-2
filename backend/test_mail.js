const dotenv = require('dotenv');
const { sendNotificationEmail } = require('./services/mailService');

dotenv.config();

const testMail = async () => {
    console.log('--- Testing Direct Email Notification ---');
    console.log('Recipient Email:', process.env.EMAIL_USER); // Testing by sending to yourself
    console.log('Message:', 'This is a direct email test from your Campus Connect app!');

    const result = await sendNotificationEmail(
        process.env.EMAIL_USER, 
        'Direct Email Test', 
        'This is a direct email test from your Campus Connect app!'
    );

    if (result.success) {
        console.log('Test successful! Check your inbox.');
    } else {
        console.error('Test failed:', result.error);
    }
};

testMail();
