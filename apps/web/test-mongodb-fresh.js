const { MongoClient } = require('mongodb');

// Explicitly load environment from .env.local
require('dotenv').config({ path: '.env.local', override: true });

async function testFreshConnection() {
  console.log('🚀 Fresh MongoDB Connection Test\n');
  
  const uri = process.env.MONGODB_URI;
  console.log('📡 Testing URI:', uri ? uri.replace(/\/\/[^@]*@/, '//***:***@') : 'NOT FOUND');
  console.log('🏠 Hostname:', uri ? uri.split('@')[1]?.split('/')[0] : 'NOT FOUND');
  console.log('💾 Database:', uri ? uri.split('/')[3]?.split('?')[0] : 'NOT FOUND');
  
  if (!uri) {
    console.error('❌ No MONGODB_URI found!');
    return false;
  }
  
  let client;
  try {
    console.log('\n📡 Connecting to MongoDB...');
    
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    
    await client.connect();
    console.log('✅ Successfully connected to MongoDB!');
    
    // Test database access
    const db = client.db();
    await db.admin().ping();
    console.log('✅ Database ping successful!');
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log(`✅ Found ${collections.length} collections`);
    
    // Test write operation
    const testCollection = db.collection('connection_test');
    const testDoc = { test: true, timestamp: new Date() };
    const result = await testCollection.insertOne(testDoc);
    console.log('✅ Write test successful!');
    
    // Read back and cleanup
    await testCollection.deleteOne({ _id: result.insertedId });
    console.log('✅ Read/cleanup successful!');
    
    console.log('\n🎉 MongoDB connection is working perfectly!');
    return true;
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('💡 DNS resolution failed - check hostname');
    } else if (error.message.includes('authentication failed')) {
      console.log('💡 Authentication failed - check username/password');
    } else if (error.message.includes('timeout')) {
      console.log('💡 Connection timeout - check network/firewall');
    }
    
    return false;
    
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connection closed');
    }
  }
}

testFreshConnection()
  .then(success => {
    if (success) {
      console.log('\n✅ MongoDB is ready for your application!');
    } else {
      console.log('\n❌ Fix the connection issues before proceeding');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(console.error); 