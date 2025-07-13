const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testMongoDBConnection() {
  console.log('🔍 Testing MongoDB Connection...\n');
  
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    console.log('💡 Make sure you have MONGODB_URI set in your .env.local file');
    return false;
  }
  
  // Hide password in logs
  const cleanUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  console.log(`📡 Connection URI: ${cleanUri}`);
  console.log(`📋 Database: ${uri.split('/')[3]?.split('?')[0] || 'unknown'}`);
  
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
    console.log('\n🔍 Testing database access...');
    const db = client.db();
    await db.admin().ping();
    console.log('✅ Database ping successful!');
    
    // List collections
    console.log('\n📋 Listing collections...');
    const collections = await db.listCollections().toArray();
    console.log(`✅ Found ${collections.length} collections:`);
    collections.forEach(col => console.log(`   - ${col.name}`));
    
    // Test a simple operation
    console.log('\n🧪 Testing write/read operations...');
    const testCollection = db.collection('connection_test');
    
    const testDoc = { 
      test: true, 
      timestamp: new Date(),
      message: 'MongoDB connection test successful!'
    };
    
    const insertResult = await testCollection.insertOne(testDoc);
    console.log('✅ Write operation successful!');
    
    const foundDoc = await testCollection.findOne({ _id: insertResult.insertedId });
    console.log('✅ Read operation successful!');
    
    // Cleanup test document
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('✅ Cleanup successful!');
    
    console.log('\n🎉 All MongoDB tests passed!');
    console.log('💡 Your MongoDB connection is working correctly.');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ MongoDB connection failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('   1. Check that your cluster hostname is correct');
      console.log('   2. Verify your cluster is running in MongoDB Atlas');
      console.log('   3. Make sure your IP address is whitelisted');
    } else if (error.message.includes('Authentication failed')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('   1. Check your username and password');
      console.log('   2. Verify the database name is correct');
      console.log('   3. Make sure the user has proper permissions');
    }
    
    return false;
    
  } finally {
    if (client) {
      try {
        await client.close();
        console.log('\n🔌 Connection closed');
      } catch (closeError) {
        console.warn('⚠️  Error closing connection:', closeError.message);
      }
    }
  }
}

async function main() {
  console.log('🚀 MongoDB Connection Test\n');
  console.log('📅 Date:', new Date().toISOString());
  console.log('📋 Node.js version:', process.version);
  console.log('📋 Platform:', process.platform);
  
  const success = await testMongoDBConnection();
  
  if (success) {
    console.log('\n✅ MongoDB is ready for your application!');
    console.log('🚀 You can now run your video transcription pipeline');
  } else {
    console.log('\n❌ MongoDB connection failed');
    console.log('🔧 Please fix the connection issues before proceeding');
  }
  
  process.exit(success ? 0 : 1);
}

main().catch(console.error); 