const { MongoClient } = require('mongodb');
const tls = require('tls');
require('dotenv').config();

// Set Node.js TLS options to work with OpenSSL 3.x
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Temporary workaround

async function testWithTLSOptions() {
  const originalUri = process.env.MONGODB_URI;
  const credentialsMatch = originalUri.match(/\/\/([^@]+)@/);
  const credentials = credentialsMatch ? credentialsMatch[1] : '';
  
  // Different TLS configurations to try
  const configs = [
    {
      name: "TLS 1.2 with legacy support",
      uri: `mongodb://${credentials}@ac-fxhrtin-shard-00-00.9qjsfgn.mongodb.net:27017,ac-fxhrtin-shard-00-01.9qjsfgn.mongodb.net:27017,ac-fxhrtin-shard-00-02.9qjsfgn.mongodb.net:27017/pasturepilot?replicaSet=atlas-r1lz64-shard-0&retryWrites=true&w=majority&authSource=admin`,
      options: {
        tls: true,
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 15000,
        securityLevel: 0, // Lower security level for compatibility
      }
    },
    {
      name: "No TLS verification",
      uri: `mongodb://${credentials}@ac-fxhrtin-shard-00-00.9qjsfgn.mongodb.net:27017,ac-fxhrtin-shard-00-01.9qjsfgn.mongodb.net:27017,ac-fxhrtin-shard-00-02.9qjsfgn.mongodb.net:27017/pasturepilot?replicaSet=atlas-r1lz64-shard-0&retryWrites=true&w=majority&authSource=admin`,
      options: {
        tls: true,
        checkServerIdentity: () => undefined, // Disable hostname verification
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 15000,
      }
    },
    {
      name: "Custom TLS context",
      uri: `mongodb://${credentials}@ac-fxhrtin-shard-00-00.9qjsfgn.mongodb.net:27017,ac-fxhrtin-shard-00-01.9qjsfgn.mongodb.net:27017,ac-fxhrtin-shard-00-02.9qjsfgn.mongodb.net:27017/pasturepilot?replicaSet=atlas-r1lz64-shard-0&retryWrites=true&w=majority&authSource=admin`,
      options: {
        tls: true,
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true,
        secureContext: tls.createSecureContext({
          secureProtocol: 'TLSv1_2_method',
          secureOptions: require('constants').SSL_OP_LEGACY_SERVER_CONNECT,
        }),
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 15000,
      }
    }
  ];

  for (const config of configs) {
    console.log(`\n🔍 Testing: ${config.name}`);
    
    let client;
    try {
      client = new MongoClient(config.uri, config.options);
      
      console.log('  📡 Connecting...');
      await client.connect();
      
      console.log('  ✅ Connected successfully!');
      
      // Test database access
      const db = client.db('pasturepilot');
      await db.admin().ping();
      console.log('  ✅ Database ping successful!');
      
      // Test a simple operation
      const testCollection = db.collection('connection_test');
      await testCollection.insertOne({ test: true, timestamp: new Date(), config: config.name });
      console.log('  ✅ Write operation successful!');
      
      // Clean up
      await testCollection.deleteOne({ test: true, config: config.name });
      console.log('  ✅ Cleanup successful!');
      
      return { success: true, config, uri: config.uri };
      
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`);
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          console.log(`  ⚠️  Error closing: ${closeError.message}`);
        }
      }
    }
    
    // Wait between attempts
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return { success: false };
}

async function run() {
  console.log('🚀 Testing TLS Compatibility Configurations\n');
  console.log('Node.js version:', process.version);
  console.log('OpenSSL version:', process.versions.openssl);
  
  const result = await testWithTLSOptions();
  
  if (result.success) {
    console.log('\n🎉 SUCCESS! Found working TLS configuration');
    console.log(`Working config: ${result.config.name}`);
    console.log('\n💡 Update your .env.local with this URI:');
    console.log('MONGODB_URI=' + result.uri);
    
    console.log('\n📝 And update your mongodb.ts with these options:');
    console.log(JSON.stringify(result.config.options, null, 2));
    
  } else {
    console.log('\n❌ All TLS configurations failed');
    console.log('\n🔧 Alternative solutions:');
    console.log('1. Use MongoDB Compass to test connection');
    console.log('2. Create a new MongoDB Atlas cluster');
    console.log('3. Use a different MongoDB hosting service');
    console.log('4. Use a local MongoDB instance for development');
  }
}

run().catch(console.error); 