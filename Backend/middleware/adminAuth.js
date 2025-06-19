const User = require('../models/User');

const adminAuth = async (req, res, next) => {
    try {
        // Assumes the auth middleware has already run and set req.user
        if (!req.user) {
            throw new Error('Authentication required');
        }

        // Check if the user has Admin role
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }

        next();
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate as administrator.' });
    }
};

module.exports = adminAuth;
