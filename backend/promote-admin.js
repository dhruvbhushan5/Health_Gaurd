const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const email = process.argv[2];

if (!email) {
    console.log('Usage: node promote-admin.js <email>');
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

        user.role = 'admin';
        await user.save();

        console.log(`✅ Successfully promoted ${user.name} (${user.email}) to Admin!`);
        console.log('👉 You can now login and access /admin');

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Database error:', err);
        process.exit(1);
    });
