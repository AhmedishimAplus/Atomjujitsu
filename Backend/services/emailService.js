const nodemailer = require('nodemailer');

// Create transporter with error handling
let transporter;
try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        console.error('EMAIL_USER or EMAIL_APP_PASSWORD environment variables are not set');
    }

    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
        }
    });

    // Verify the connection configuration
    transporter.verify(function (error, success) {
        if (error) {
            console.error('SMTP connection error:', error);
        } else {
            console.log('SMTP server is ready to send messages');
        }
    });
} catch (err) {
    console.error('Failed to create email transporter:', err);
}

const sendVerificationEmail = async (email, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Email Verification - Atom Jujitsu',
        html: `
            <h1>Verify Your Email</h1>
            <p>Your verification code is:</p>
            <h2 style="letter-spacing: 4px;">${otp}</h2>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't create an account, please ignore this email.</p>
        `
    };

    return transporter.sendMail(mailOptions);
};

const sendTwoFactorEmail = async (email, message) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: '2FA Setup - Atom Jujitsu',
        html: `
            <h1>Two-Factor Authentication Setup</h1>
            <p>${message}</p>
            <p>If you didn't request this, please secure your account immediately.</p>
        `
    };

    return transporter.sendMail(mailOptions);
};

const sendLoginWarningEmail = async (email, attempts, isLocked) => {
    try {
        if (!transporter) {
            console.error('Email transporter not initialized');
            return Promise.reject(new Error('Email transporter not initialized'));
        }

        if (!email) {
            console.error('No email address provided for warning email');
            return Promise.reject(new Error('No email address provided'));
        }

        console.log(`Preparing login warning email to ${email} (Attempts: ${attempts}, Locked: ${isLocked})`);

        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@atomjujitsu.com',
            to: email,
            subject: 'Account Security Alert - Atom Jujitsu',
            html: `
                <h1>Security Alert</h1>
                <p>There have been ${attempts} failed login attempts on your account.</p>
                ${isLocked ?
                    `<p><strong>Your account has been temporarily locked for 15 minutes for security purposes.</strong></p>`
                    : `<p>If you reach 5 failed attempts, your account will be temporarily locked.</p>`
                }
                <p>If this wasn't you, please consider changing your password immediately.</p>
                <p>Time of alert: ${new Date().toLocaleString()}</p>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(`Warning email sent successfully to ${email}, message ID: ${result.messageId}`);
        return result;
    } catch (error) {
        console.error(`Failed to send warning email to ${email}:`, error);
        throw error; // Re-throw for handling in the calling function
    }
};

module.exports = {
    sendVerificationEmail,
    sendTwoFactorEmail,
    sendLoginWarningEmail
};
