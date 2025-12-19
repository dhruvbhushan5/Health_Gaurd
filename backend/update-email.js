const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const currentEmail = process.argv[2];
const newEmail = process.argv[3];

if (!currentEmail || !newEmail) {
    console.log('Usage: node update-email.js <current-email> <new-email>');
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/health-guard')
    .then(async () => {
        console.log('✅ Connected to MongoDB');

        // Check if new email is already taken
        const existingUser = await User.findOne({ email: newEmail });
        if (existingUser) {
            console.log(`❌ The email "${newEmail}" is already in use by another user.`);
            process.exit(1);
        }

        // Find the user to update
        const user = await User.findOne({ email: currentEmail });

        if (!user) {
            console.log(`❌ User with email ${currentEmail} not found.`);
            process.exit(1);
        }

        user.email = newEmail;
        await user.save();

        console.log(`✅ Successfully updated email from "${currentEmail}" to "${newEmail}"`);
        console.log('👉 Please logout and login with your NEW EMAIL.');

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Database error:', err);
        process.exit(1);
    });
