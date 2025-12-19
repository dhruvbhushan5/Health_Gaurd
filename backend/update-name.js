const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const email = process.argv[2];
const newName = process.argv[3];

if (!email || !newName) {
    console.log('Usage: node update-name.js <email> "<new-name>"');
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/health-guard')
    .then(async () => {
        console.log('✅ Connected to MongoDB');

        const user = await User.findOne({ email });

        if (!user) {
            console.log(`❌ User with email ${email} not found.`);
            process.exit(1);
        }

        user.name = newName;
        await user.save();

        console.log(`✅ Successfully updated name for ${user.email} to: "${newName}"`);
        console.log('👉 Please logout and login again to see the changes.');

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Database error:', err);
        process.exit(1);
    });
