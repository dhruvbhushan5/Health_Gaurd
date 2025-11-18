const mongoose = require('mongoose');

async function testMongoConnection() {
  try {
    console.log('🔍 Testing MongoDB Connection...');
    console.log('📍 Connection URI: mongodb://127.0.0.1:27017/healthify-me');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb://127.0.0.1:27017/healthify-me', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ MongoDB connected successfully!');
    
    // Get database info
    const db = mongoose.connection.db;
    const admin = db.admin();
    
    console.log('\n📊 Database Information:');
    console.log(`🏷️  Database Name: ${db.databaseName}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
    console.log(`🔌 Port: ${mongoose.connection.port}`);
    console.log(`📁 Ready State: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected'}`);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log(`\n📂 Collections in database (${collections.length}):`);
    if (collections.length > 0) {
      for (let collection of collections) {
        const count = await db.collection(collection.name).countDocuments();
        console.log(`   📄 ${collection.name}: ${count} documents`);
      }
    } else {
      console.log('   📭 No collections found (database is empty)');
    }
    
    // Test a simple operation
    console.log('\n🧪 Testing database operations...');
    const testCollection = db.collection('connection_test');
    await testCollection.insertOne({ 
      test: true, 
      timestamp: new Date(),
      message: 'Connection test successful'
    });
    
    const testDoc = await testCollection.findOne({ test: true });
    console.log('✅ Write/Read test successful!');
    
    // Clean up test document
    await testCollection.deleteOne({ test: true });
    console.log('🧹 Test document cleaned up');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error('🔴 Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Possible solutions:');
      console.log('   1. Make sure MongoDB is installed and running');
      console.log('   2. Start MongoDB service: net start MongoDB');
      console.log('   3. Check if MongoDB is running on port 27017');
    }
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
  }
}

testMongoConnection();