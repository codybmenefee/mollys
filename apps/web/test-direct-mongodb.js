const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testDirectConnection() {
  // Extract credentials from original URI
  const originalUri = process.env.MONGODB_URI;
  const credentialsMatch = originalUri.match(/\/\/([^@]+)@/);
  const credentials = credentialsMatch ? credentialsMatch[1] : '';
  
  // Direct connection using known working hosts
  const directUri = `mongodb://${credentials}@ac-fxhrtin-shard-00-00.9qjsfgn.mongodb.net:27017,ac-fxhrtin-shard-00-01.9qjsfgn.mongodb.net:27017,ac-fxhrtin-shard-00-02.9qjsfgn.mongodb.net:27017/pasturepilot?replicaSet=atlas-r1lz64-shard-0&retryWrites=true&w=majority&authSource=admin`;

  console.log('🔍 Testing direct replica set connection...');
  console.log('URI:', directUri.replace(/\/\/[^@]*@/, '//***:***@'));

  const options = {
    tls: true,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 15000,
    maxPoolSize: 10,
    retryWrites: true,
  };

  let client;
  try {
    client = new MongoClient(directUri, options);
    
    console.log('📡 Connecting...');
    await client.connect();
    
    console.log('✅ Connected successfully!');
    
    // Test database access
    const db = client.db('pasturepilot');
    await db.admin().ping();
    console.log('✅ Database ping successful!');
    
    // Test creating a collection
    const testCollection = db.collection('connection_test');
    await testCollection.insertOne({ test: true, timestamp: new Date() });
    console.log('✅ Write operation successful!');
    
    // Clean up test document
    await testCollection.deleteOne({ test: true });
    console.log('✅ Cleanup successful!');
    
    return directUri;
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    return null;
  } finally {
    if (client) {
      try {
        await client.close();
        console.log('✅ Connection closed');
      } catch (closeError) {
        console.log('⚠️  Error closing connection:', closeError.message);
      }
    }
  }
}

async function run() {
  console.log('🚀 Testing Direct MongoDB Connection\n');
  
  const workingUri = await testDirectConnection();
  
  if (workingUri) {
    console.log('\n🎉 SUCCESS! Found working connection');
    console.log('\n💡 Update your .env.local with this URI:');
    console.log('MONGODB_URI=' + workingUri);
    
    console.log('\n📝 Next steps:');
    console.log('1. Update your .env.local file with the working URI above');
    console.log('2. Restart your Next.js development server');
    console.log('3. Test the pipeline again');
  } else {
    console.log('\n❌ Direct connection also failed');
    console.log('\n🔧 Next steps:');
    console.log('1. Check MongoDB Atlas console for the correct connection string');
    console.log('2. Verify the cluster is running and accessible');
    console.log('3. Check IP whitelist settings in MongoDB Atlas');
    console.log('4. Consider creating a new cluster if this one is corrupted');
  }
}

run().catch(console.error); 