const nodemailer = require('nodemailer');

const sendNotificationEmail = async (toEmail, subject, message, attachments = []) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: toEmail,
            subject: subject || 'New Notification from Admin',
            text: message,
            attachments: attachments, // Add this line
        };

        console.log('-------------------------------------------');
        console.log(`[EMAIL NOTIFICATION]`);
        console.log(`To: ${toEmail}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`Message: ${message}`);
        console.log('-------------------------------------------');

        const info = await transporter.sendMail(mailOptions);
        console.log('SMTP Success: ' + info.response);
        return { success: true, info };
    } catch (error) {
        console.error('Error sending email through SMTP:', error);
        return { success: false, error };
    }
};

module.exports = {
    sendNotificationEmail,
};
