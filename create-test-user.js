const mongoose = require('mongoose');
const { hashPassword } = require('./backend/utils/encryption');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/healthify-me');

async function createTestUser() {
  try {
    // Define User schema (minimal version for testing)
    const userSchema = new mongoose.Schema({
      name: String,
      email: { type: String, unique: true },
      password: String
    });

    const TestUser = mongoose.model('TestUser', userSchema, 'users');

    // Create a test user with the new encryption
    const testPassword = 'TestPassword123!';
    const hashedPassword = await hashPassword(testPassword);

    console.log('🔐 Creating test user...');
    console.log('📧 Email: testuser@example.com');
    console.log('🔑 Password: TestPassword123!');

    // Remove existing test user if exists
    await TestUser.deleteOne({ email: 'testuser@example.com' });

    // Create new test user
    const testUser = new TestUser({
      name: 'Test User',
      email: 'testuser@example.com', 
      password: hashedPassword
    });

    await testUser.save();
    console.log('✅ Test user created successfully!');
    console.log('🎯 You can now login with:');
    console.log('   Email: testuser@example.com');
    console.log('   Password: TestPassword123!');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestUser();