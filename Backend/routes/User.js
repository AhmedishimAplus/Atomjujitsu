const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationEmail, sendTwoFactorEmail } = require('../services/emailService');

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create verification token
        const emailVerificationToken = crypto.randomBytes(32).toString('hex');
        const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const user = new User({
            name,
            email,
            password,
            phone,
            emailVerificationToken,
            emailVerificationExpires
        });

        await user.save();
        await sendVerificationEmail(email, emailVerificationToken);

        res.status(201).json({
            message: 'Registration successful. Please check your email to verify your account.'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verify email
router.get('/verify-email/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            emailVerificationToken: req.params.token,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                error: 'Invalid or expired verification token'
            });
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password, twoFactorToken } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!user.isEmailVerified) {
            return res.status(401).json({
                error: 'Please verify your email before logging in'
            });
        }

        // Check 2FA if enabled
        if (user.isTwoFactorEnabled) {
            if (!twoFactorToken) {
                return res.status(401).json({
                    error: '2FA token required',
                    requires2FA: true
                });
            }

            const isValid = speakeasy.totp.verify({
                secret: user.twoFactorSecret,
                encoding: 'base32',
                token: twoFactorToken
            });

            if (!isValid) {
                return res.status(401).json({ error: 'Invalid 2FA token' });
            }
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isTwoFactorEnabled: user.isTwoFactorEnabled
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Enable 2FA
router.post('/enable-2fa', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        // Generate new secret
        const secret = speakeasy.generateSecret({
            name: `AtomJujitsu:${user.email}`
        });

        // Save secret to user
        user.twoFactorSecret = secret.base32;
        await user.save();

        // Generate QR code
        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

        // Send email notification
        await sendTwoFactorEmail(
            user.email,
            '2FA has been enabled for your account. Please save your backup codes safely.'
        );

        res.json({
            message: '2FA setup initiated',
            qrCode: qrCodeUrl,
            secret: secret.base32 // This should be shown to user only once
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verify and complete 2FA setup
router.post('/verify-2fa-setup', auth, async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findById(req.user.id);

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token
        });

        if (!verified) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        user.isTwoFactorEnabled = true;
        await user.save();

        res.json({ message: '2FA enabled successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Disable 2FA
router.post('/disable-2fa', auth, async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findById(req.user.id);

        if (!user.isTwoFactorEnabled) {
            return res.status(400).json({ error: '2FA is not enabled' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token
        });

        if (!verified) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        user.isTwoFactorEnabled = false;
        user.twoFactorSecret = undefined;
        await user.save();

        await sendTwoFactorEmail(
            user.email,
            '2FA has been disabled for your account.'
        );

        res.json({ message: '2FA disabled successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user profile (requires 2FA verification if enabled)
router.put('/update-profile', auth, async (req, res) => {
    try {
        const { name, email, phone, currentPassword, newPassword, twoFactorToken } = req.body;
        const user = await User.findById(req.user.id);

        // Verify 2FA if enabled
        if (user.isTwoFactorEnabled) {
            if (!twoFactorToken) {
                return res.status(401).json({
                    error: '2FA verification required for profile updates'
                });
            }

            const verified = speakeasy.totp.verify({
                secret: user.twoFactorSecret,
                encoding: 'base32',
                token: twoFactorToken
            });

            if (!verified) {
                return res.status(401).json({ error: 'Invalid 2FA token' });
            }
        }

        // Update basic info
        if (name) user.name = name;
        if (phone) user.phone = phone;

        // Handle email update
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                return res.status(400).json({ error: 'Email already in use' });
            }

            user.email = email;
            user.isEmailVerified = false;
            user.emailVerificationToken = crypto.randomBytes(32).toString('hex');
            user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

            await sendVerificationEmail(email, user.emailVerificationToken);
        }

        // Handle password update
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({
                    error: 'Current password is required to set new password'
                });
            }

            const isPasswordValid = await user.comparePassword(currentPassword);
            if (!isPasswordValid) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }

            user.password = newPassword;
        }

        await user.save();

        res.json({
            message: 'Profile updated successfully',
            requiresEmailVerification: email && email !== user.email
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;