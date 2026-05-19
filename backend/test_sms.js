const dotenv = require('dotenv');
const { sendSMSViaSMTP } = require('./services/mailService');

dotenv.config();

const testSMS = async () => {
    console.log('--- Testing SMS via SMTP ---');
    console.log('Recipient:', '1234567890'); // Dummy number
    console.log('Sender:', '9876543210'); // Dummy number
    console.log('Message:', 'Hello from Antigravity!');

    const result = await sendSMSViaSMTP('1234567890', '9876543210', 'Hello from Antigravity!');

    if (result.success) {
        console.log('Test successful! Check your email sent folder (if using a real SMTP).');
    } else {
        console.error('Test failed:', result.error);
    }
};

testSMS();
