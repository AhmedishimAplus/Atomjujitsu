const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

const sendVerificationEmail = async (email, token) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Email Verification - Atom Jujitsu',
        html: `
            <h1>Verify Your Email</h1>
            <p>Please click the link below to verify your email address:</p>
            <a href="${verificationUrl}">${verificationUrl}</a>
            <p>This link will expire in 24 hours.</p>
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

module.exports = {
    sendVerificationEmail,
    sendTwoFactorEmail
};
