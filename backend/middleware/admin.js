const jwt = require('jsonwebtoken');
const User = require('../models/User');

const admin = async (req, res, next) => {
    try {
        // Auth middleware should have already run and attached user to req
        // But we double check just in case
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Check if user is admin
        // Note: req.user might be just the payload from JWT, or the full user doc depending on auth middleware
        // Let's assume auth middleware attaches the user document or at least the ID
        // If it's just ID/payload, we might need to fetch the user if 'role' isn't in the token

        // Safety check: fetch fresh user data to be sure about the role
        const user = await User.findById(req.user._id || req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied: Admin privileges required' });
        }

        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({ message: 'Server error in admin authorization' });
    }
};

module.exports = admin;
