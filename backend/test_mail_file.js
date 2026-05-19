const dotenv = require('dotenv');
const { sendNotificationEmail } = require('./services/mailService');
const fs = require('fs');
const path = require('path');

dotenv.config();

const testMailWithFile = async () => {
    // 1. Create a sample file to send
    const filePath = path.join(__dirname, 'test_attachment.txt');
    fs.writeFileSync(filePath, 'Hello! This is a test file attachment from Campus Connect.');

    console.log('--- Testing Email with File Attachment ---');
    console.log('Recipient Email:', process.env.EMAIL_USER);
    
    // 2. Define the attachment
    const attachments = [
        {
            filename: 'test_attachment.txt',
            path: filePath
        }
    ];

    const result = await sendNotificationEmail(
        process.env.EMAIL_USER, 
        'Email with File Attachment Test', 
        'Please find the attached file.',
        attachments
    );

    if (result.success) {
        console.log('Test successful! Check your inbox for the attachment.');
        // Clean up the test file
        // fs.unlinkSync(filePath); 
    } else {
        console.error('Test failed:', result.error);
    }
};

testMailWithFile();
