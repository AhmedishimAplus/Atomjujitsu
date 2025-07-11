require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('Email configuration test script');
console.log('------------------------------');
console.log(`EMAIL_USER: ${process.env.EMAIL_USER ? '✓ Set' : '✗ Not set'}`);
console.log(`EMAIL_APP_PASSWORD: ${process.env.EMAIL_APP_PASSWORD ? '✓ Set' : '✗ Not set'}`);

if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.error('Error: Email environment variables are not properly set');
    process.exit(1);
}

async function testEmailConnection() {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD
            }
        });

        console.log('Testing SMTP connection...');
        await transporter.verify();
        console.log('✓ SMTP connection successful');

        console.log('Sending test email...');
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Send to self for testing
            subject: 'Email Configuration Test',
            html: `
                <h1>Email Configuration Test</h1>
                <p>This is a test email to confirm that your email configuration for Atom Jujitsu POS System is working correctly.</p>
                <p>Time: ${new Date().toISOString()}</p>
            `
        });
        
        console.log('✓ Test email sent successfully');
        console.log(`Message ID: ${info.messageId}`);
    } catch (error) {
        console.error('✗ Email test failed:', error);
        process.exit(1);
    }
}

testEmailConnection().catch(console.error);
