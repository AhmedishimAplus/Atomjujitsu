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
