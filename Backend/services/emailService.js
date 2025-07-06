const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

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
    const mailOptions = {
        from: process.env.EMAIL_USER,
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

    return transporter.sendMail(mailOptions);
};

module.exports = {
    sendVerificationEmail,
    sendTwoFactorEmail,
    sendLoginWarningEmail
};
