const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Apply auth and admin middleware to all routes
router.use(auth);
router.use(admin);

// @route   GET /api/admin/stats
// @desc    Get system statistics
// @access  Private/Admin
router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const newUsersToday = await User.countDocuments({
            createdAt: { $gte: startOfToday }
        });

        const usersWithDiseases = await User.countDocuments({
            'diseases.diagnosed': true
        });

        // Construct a simple distribution of BMI (Underweight, Normal, Overweight, Obese)
        // This is computationally expensive on large datasets, so be careful in prod
        // MongoDB aggregation would be better here
        const statusDistribution = await User.aggregate([
            {
                $project: {
                    bmi: {
                        $divide: [
                            "$healthMetrics.weight",
                            { $pow: [{ $divide: ["$healthMetrics.height", 100] }, 2] }
                        ]
                    }
                }
            },
            {
                $bucket: {
                    groupBy: "$bmi",
                    boundaries: [0, 18.5, 25, 30, 200],
                    default: "Unknown",
                    output: {
                        count: { $sum: 1 }
                    }
                }
            }
        ]);

        res.json({
            totalUsers,
            newUsersToday,
            usersWithDiseases,
            bmiStats: statusDistribution
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/admin/users
// @desc    Get all users (paginated)
// @access  Private/Admin
router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const users = await User.find()
            .select('-password') // Exclude password
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments();

        res.json({
            users,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalUsers: total
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user
// @access  Private/Admin
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'admin') {
            return res.status(400).json({ message: 'Cannot delete an admin user' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
