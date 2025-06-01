const User = require('../models/User');

const adminAuth = async (req, res, next) => {
    try {
        // Check if user is populated by auth middleware and has the admin role
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }
        next();
    } catch (error) {
        // Generic error for authorization failure
        res.status(401).json({ error: 'Authorization failed. Please ensure you are logged in with an admin account.' });
    }
};

module.exports = adminAuth;