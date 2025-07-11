const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Middleware to check if user is admin
const adminAuth = (req, res, next) => {
    if (req.user && req.user.role === 'Admin') {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};

// Get all cashiers (admin only)
router.get('/cashiers', auth, adminAuth, async (req, res) => {
    try {
        const cashiers = await User.find({ role: 'Cashier' })
            .select('_id name email phone isEmailVerified isTwoFactorEnabled isApproved loginAttempts lockUntil createdAt');

        res.json(cashiers);
    } catch (error) {
        console.error('Error fetching cashiers:', error);
        res.status(500).json({ error: 'Error fetching cashiers' });
    }
});

// Get specific cashier details (admin only)
router.get('/cashiers/:id', auth, adminAuth, async (req, res) => {
    try {
        const cashier = await User.findOne({ _id: req.params.id, role: 'Cashier' })
            .select('_id name email phone isEmailVerified isTwoFactorEnabled isApproved loginAttempts lockUntil createdAt');

        if (!cashier) {
            return res.status(404).json({ error: 'Cashier not found' });
        }

        res.json(cashier);
    } catch (error) {
        console.error('Error fetching cashier details:', error);
        res.status(500).json({ error: 'Error fetching cashier details' });
    }
});

// Approve a cashier (admin only)
router.post('/cashiers/:id/approve', auth, adminAuth, async (req, res) => {
    try {
        const cashier = await User.findOneAndUpdate(
            { _id: req.params.id, role: 'Cashier' },
            { isApproved: true },
            { new: true }
        ).select('name email');

        if (!cashier) {
            return res.status(404).json({ error: 'Cashier not found' });
        }

        // Send approval notification email - using existing email service
        const { sendVerificationEmail } = require('../services/emailService');
        try {
            await sendVerificationEmail(
                cashier.email,
                `Your account has been approved. You can now log in to the system.`
            );
        } catch (emailError) {
            console.error('Error sending approval email:', emailError);
        }

        res.json({
            message: 'Cashier approved successfully',
            cashier: {
                id: cashier._id,
                name: cashier.name,
                email: cashier.email,
                isApproved: true
            }
        });
    } catch (error) {
        console.error('Error approving cashier:', error);
        res.status(500).json({ error: 'Error approving cashier' });
    }
});

// Delete a cashier (admin only)
router.delete('/cashiers/:id', auth, adminAuth, async (req, res) => {
    try {
        const cashier = await User.findOneAndDelete({
            _id: req.params.id,
            role: 'Cashier'
        });

        if (!cashier) {
            return res.status(404).json({ error: 'Cashier not found' });
        }

        res.json({ message: 'Cashier deleted successfully' });
    } catch (error) {
        console.error('Error deleting cashier:', error);
        res.status(500).json({ error: 'Error deleting cashier' });
    }
});

module.exports = router;
