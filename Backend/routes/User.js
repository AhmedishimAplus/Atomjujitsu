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

            // Check if this attempt caused the account to be locked
            if (user.loginAttempts >= 5) {
                // Account should be locked now
                try {
                    console.log(`Account locked for ${user.email}, sending email notification`);
                    await sendLoginWarningEmail(user.email, user.loginAttempts, true);
                    console.log("Account lock email sent successfully");
                } catch (emailError) {
                    console.error("Failed to send account lock email:", emailError);
                }

                // Return locked account message
                const lockTime = 15; // default 15 minutes lock time
                return res.status(401).json({
                    error: `Account temporarily locked. Please try again in ${lockTime} minutes.`,
                    accountLocked: true,
                    lockTime
                });
            }
            // Not locked but should send warning after 3 attempts
            else if (user.loginAttempts >= 3) {
                try {
                    console.log(`Sending warning email to ${user.email}, attempts: ${user.loginAttempts}`);
                    await sendLoginWarningEmail(user.email, user.loginAttempts, false);
                    console.log("Warning email sent successfully");
                } catch (emailError) {
                    console.error("Failed to send warning email:", emailError);
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

                // Check if this attempt caused the account to be locked
                if (user.loginAttempts >= 5) {
                    // Account should be locked now
                    try {
                        console.log(`Account locked for ${user.email} after 2FA failure, sending email notification`);
                        await sendLoginWarningEmail(user.email, user.loginAttempts, true);
                        console.log("Account lock email sent successfully");
                    } catch (emailError) {
                        console.error("Failed to send account lock email:", emailError);
                    }

                    // Return locked account message
                    const lockTime = 15; // default 15 minutes lock time
                    return res.status(401).json({
                        error: `Account temporarily locked. Please try again in ${lockTime} minutes.`,
                        accountLocked: true,
                        lockTime
                    });
                }
                // Not locked but should send warning after 3 attempts
                else if (user.loginAttempts >= 3) {
                    try {
                        console.log(`Sending 2FA warning email to ${user.email}, attempts: ${user.loginAttempts}`);
                        await sendLoginWarningEmail(user.email, user.loginAttempts, false);
                        console.log("2FA warning email sent successfully");
                    } catch (emailError) {
                        console.error("Failed to send 2FA warning email:", emailError);
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

// Forgot password - request reset code
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !email.trim()) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() }).select('+twoFactorSecret');
        if (!user) {
            // For security, don't reveal if user exists or not
            return res.status(200).json({ message: 'If your email exists in our system, you will receive a password reset code' });
        }

        // If user has 2FA enabled and is an admin, instruct them to use their authenticator
        if (user.isTwoFactorEnabled && user.role === 'Admin') {
            return res.status(200).json({
                message: 'Please use your authenticator app to generate a verification code',
                requiresAuthenticator: true
            });
        }

        // Generate a 6-digit numeric code for better usability
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Store the reset code in memory (in production, consider using Redis or a database)
        otpStore.set(`password-reset-${email.toLowerCase()}`, { code: resetCode, expires });

        // Send email with reset code
        await sendVerificationEmail(
            email,
            resetCode
        );

        res.json({
            message: 'Password reset code has been sent to your email',
            email: email
        });
    } catch (error) {
        console.error('Error in forgot-password:', error);
        res.status(500).json({ error: 'An error occurred while processing your request' });
    }
});

// Verify reset code and set new password
router.post('/reset-password', async (req, res) => {
    try {
        const { email, resetCode, newPassword } = req.body;

        if (!email || !resetCode || !newPassword) {
            return res.status(400).json({ error: 'Email, reset code and new password are required' });
        }

        // Find user to check if they have 2FA
        const user = await User.findOne({ email: email.toLowerCase() }).select('+twoFactorSecret');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let codeValid = false;

        // If user has 2FA enabled and is an admin, verify against authenticator
        if (user.isTwoFactorEnabled && user.role === 'Admin') {
            const decryptedSecret = user.decryptTwoFactorSecret();
            codeValid = speakeasy.totp.verify({
                secret: decryptedSecret,
                encoding: 'base32',
                token: resetCode
            });

            if (!codeValid) {
                return res.status(400).json({ error: 'Invalid authenticator code' });
            }
        } else {
            // Otherwise check email reset code
            const resetData = otpStore.get(`password-reset-${email.toLowerCase()}`);
            if (!resetData || resetData.expires < Date.now()) {
                return res.status(400).json({ error: 'Invalid or expired reset code' });
            }

            if (resetData.code !== resetCode) {
                return res.status(400).json({ error: 'Invalid reset code' });
            }
            codeValid = true;

            // Clear the reset code from memory
            otpStore.delete(`password-reset-${email.toLowerCase()}`);
        }

        // We've already found and validated the user above

        // Password validation
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        // Update the password (will be hashed by the pre-save middleware)
        user.password = newPassword;
        await user.save();

        // Reset codes for non-2FA users are already cleared above

        res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Error in reset-password:', error);
        res.status(500).json({ error: 'An error occurred while processing your request' });
    }
});

// Admin routes for user management
// Admin verification endpoint temporarily removed
router.post('/verify-admin-access', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Access denied. Only administrators can perform this action.' });
        }

        // Generate a token for admin verification
        const adminVerificationToken = jwt.sign(
            {
                id: req.user.id,
                email: req.user.email,
                role: req.user.role,
                verified: true,
                verifiedAt: Date.now()
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // 1 hour expiration
        );

        // Auto verify without code
        res.json({
            message: 'Admin access verified successfully',
            adminVerificationToken,
            expiresIn: 3600 // 1 hour in seconds
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin verification endpoint temporarily removed

// Search for users by email or phone number (admin only with verification)
router.get('/search', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Access denied. Only administrators can search users.' });
        }

        // Admin verification temporarily removed
        // We'll implement a better security system later

        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        // Search by email or phone
        const users = await User.find({
            $or: [
                { email: { $regex: query, $options: 'i' } }, // Case-insensitive search
                { phone: { $regex: query, $options: 'i' } }
            ],
            role: 'Cashier' // Only search for cashier users
        }).select('+password'); // Include password for admin view (twoFactorSecret is already excluded by default)

        // Transform the user objects to have consistent property names
        const transformedUsers = users.map(user => ({
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            password: user.password, // Include the hashed password
            isEmailVerified: user.isEmailVerified,
            isTwoFactorEnabled: user.isTwoFactorEnabled,
            loginAttempts: user.loginAttempts,
            lockUntil: user.lockUntil
        }));

        res.json(transformedUsers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user details by ID (admin only)
router.get('/:id', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Access denied. Only administrators can view user details.' });
        }

        // Admin verification temporarily removed
        // We'll implement a better security system later

        const user = await User.findById(req.params.id).select('+password'); // twoFactorSecret is already excluded by default

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Only allow viewing cashier users
        if (user.role !== 'Cashier') {
            return res.status(403).json({ error: 'Access denied. Can only view cashier users.' });
        }

        // Transform the user object to include all necessary fields
        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            password: user.password, // Include the hashed password
            isEmailVerified: user.isEmailVerified,
            isTwoFactorEnabled: user.isTwoFactorEnabled,
            loginAttempts: user.loginAttempts,
            lockUntil: user.lockUntil,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        res.json(userResponse);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete user by ID (admin only)
router.delete('/:id', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Access denied. Only administrators can delete users.' });
        }

        // Admin verification temporarily removed
        // We'll implement a better security system later

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Only allow deleting cashier users
        if (user.role !== 'Cashier') {
            return res.status(403).json({ error: 'Access denied. Can only delete cashier users.' });
        }

        // Delete the user
        await User.findByIdAndDelete(req.params.id);

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;