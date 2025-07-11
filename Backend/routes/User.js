const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationEmail, sendTwoFactorEmail, sendLoginWarningEmail } = require('../services/emailService');

// In-memory OTP store (email -> {otp, expires})
const otpStore = new Map();

// Cleanup expired OTPs every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [email, data] of otpStore.entries()) {
        if (data.expires < now) {
            otpStore.delete(email);
        }
    }
}, 5 * 60 * 1000);

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create and save user without OTP in DB
        const user = new User({
            name,
            email,
            password,
            phone,
            role: role || 'Cashier' // Default to Cashier if no role provided
        });
        await user.save();

        // Generate OTP and store in memory
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
        otpStore.set(email, { otp, expires });
        await sendVerificationEmail(email, otp);

        res.status(201).json({
            message: 'Registration successful. Please check your email to verify your account.'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verify email with OTP
router.post('/verify-email', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const data = otpStore.get(email);
        if (!data || data.expires < Date.now()) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }
        if (data.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }
        user.isEmailVerified = true;
        await user.save();
        otpStore.delete(email);
        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password, twoFactorToken } = req.body;

        // Use select('+twoFactorSecret') to include the field in this query
        const user = await User.findOne({ email }).select('+twoFactorSecret');
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if account is locked
        if (user.isLocked()) {
            const lockTime = Math.ceil((user.lockUntil - Date.now()) / 60000); // convert to minutes
            return res.status(401).json({
                error: `Account is temporarily locked. Please try again in ${lockTime} minutes.`,
                accountLocked: true,
                lockTime
            });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            // Increment failed login attempts
            await user.incrementLoginAttempts();

            // Send warning email after certain number of attempts
            if (user.loginAttempts >= 3) {
                const isLocked = user.loginAttempts >= 5;
                try {
                    console.log(`Sending warning email to ${user.email}, attempts: ${user.loginAttempts}, locked: ${isLocked}`);
                    await sendLoginWarningEmail(user.email, user.loginAttempts, isLocked);
                    console.log("Warning email sent successfully");
                } catch (emailError) {
                    console.error("Failed to send warning email:", emailError);
                    // Continue with login flow even if email fails
                }
            }

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

            // Decrypt the stored secret
            const decryptedSecret = user.decryptTwoFactorSecret();

            const isValid = speakeasy.totp.verify({
                secret: decryptedSecret,
                encoding: 'base32',
                token: twoFactorToken
            });

            if (!isValid) {
                // Increment failed login attempts for incorrect 2FA codes too
                await user.incrementLoginAttempts();

                if (user.loginAttempts >= 3) {
                    const isLocked = user.loginAttempts >= 5;
                    try {
                        console.log(`Sending 2FA warning email to ${user.email}, attempts: ${user.loginAttempts}, locked: ${isLocked}`);
                        await sendLoginWarningEmail(user.email, user.loginAttempts, isLocked);
                        console.log("2FA warning email sent successfully");
                    } catch (emailError) {
                        console.error("Failed to send 2FA warning email:", emailError);
                        // Continue with login flow even if email fails
                    }
                }

                return res.status(401).json({ error: 'Invalid 2FA token' });
            }
        }

        // Reset login attempts on successful login
        await user.resetLoginAttempts();        // Generate JWT token
        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                role: user.role,
                isTwoFactorEnabled: user.isTwoFactorEnabled
            },
            process.env.JWT_SECRET,
            { expiresIn: '4.5h' }
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
        const user = await User.findById(req.user.id).select('+twoFactorSecret');

        // Generate new secret
        const secret = speakeasy.generateSecret({
            name: `AtomJujitsu:${user.email}`
        });

        // Encrypt and save secret to user
        user.twoFactorSecret = user.encryptTwoFactorSecret(secret.base32);
        await user.save();

        // Generate QR code
        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

        // Send email notification
        await sendTwoFactorEmail(
            user.email,
            '2FA setup has been initiated for your account. Please complete setup by verifying your code.'
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
        const user = await User.findById(req.user.id).select('+twoFactorSecret');

        // Decrypt the stored secret
        const decryptedSecret = user.decryptTwoFactorSecret();

        const verified = speakeasy.totp.verify({
            secret: decryptedSecret,
            encoding: 'base32',
            token
        });

        if (!verified) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        user.isTwoFactorEnabled = true;
        await user.save();

        // Send confirmation email
        await sendTwoFactorEmail(
            user.email,
            '2FA has been successfully enabled for your account. Your account is now more secure.'
        );

        res.json({ message: '2FA enabled successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Disable 2FA
router.post('/disable-2fa', auth, async (req, res) => {
    try {
        const { token } = req.body;

        // Check if token is provided
        if (!token) {
            return res.status(400).json({ error: 'Verification code is required to disable 2FA' });
        }

        const user = await User.findById(req.user.id).select('+twoFactorSecret');

        if (!user.isTwoFactorEnabled) {
            return res.status(400).json({ error: '2FA is not enabled for this account' });
        }

        // Verify the token before disabling 2FA
        const decryptedSecret = user.decryptTwoFactorSecret();

        const verified = speakeasy.totp.verify({
            secret: decryptedSecret,
            encoding: 'base32',
            token
        });

        if (!verified) {
            return res.status(400).json({ error: 'Invalid verification code. Please enter the current code from your authenticator app.' });
        }

        user.isTwoFactorEnabled = false;
        user.twoFactorSecret = undefined;
        await user.save();

        // Send email notification
        await sendTwoFactorEmail(
            user.email,
            '2FA has been disabled for your account. This reduces your account security. If you did not disable 2FA, please contact support immediately.'
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

            // Generate OTP and store in memory
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
            otpStore.set(email, { otp, expires });

            await sendVerificationEmail(email, otp);
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

// Resend email verification OTP
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if already verified
        if (user.isEmailVerified) {
            return res.status(400).json({ error: 'Email already verified' });
        }

        // Generate new OTP and store in memory
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
        otpStore.set(email, { otp, expires });

        await sendVerificationEmail(email, otp);

        res.json({ message: 'Verification email resent successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;