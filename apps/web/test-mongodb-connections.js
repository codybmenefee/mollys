const { MongoClient } = require('mongodb');
require('dotenv').config();

const originalUri = process.env.MONGODB_URI;

// Different connection configurations to try
const connectionConfigs = [
  {
    name: "Original Configuration",
    uri: originalUri,
    options: {
      tls: true,
      tlsInsecure: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    }
  },
  {
    name: "Without TLS Insecure Flags",
    uri: originalUri,
    options: {
      tls: true,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    }
  },
  {
    name: "With TLS CA File (System)",
    uri: originalUri,
    options: {
      tls: true,
      tlsCAFile: undefined, // Use system CA
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    }
  },
  {
    name: "Modified URI with SSL=false",
    uri: originalUri.replace('ssl=true', 'ssl=false').replace('&tls=true', ''),
    options: {
      tls: false,
      ssl: false,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    }
  },
  {
    name: "Standard MongoDB+SRV without extra params",
    uri: originalUri.split('?')[0] + '?retryWrites=true&w=majority',
    options: {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    }
  },
  {
    name: "Direct connection (non-SRV)",
    uri: originalUri.replace('mongodb+srv://', 'mongodb://').replace('@cluster0.9qjsfgn.mongodb.net', '@ac-fxhrtin-shard-00-00.9qjsfgn.mongodb.net:27017,ac-fxhrtin-shard-00-01.9qjsfgn.mongodb.net:27017,ac-fxhrtin-shard-00-02.9qjsfgn.mongodb.net:27017'),
    options: {
      replicaSet: 'atlas-r1lz64-shard-0',
      tls: true,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    }
  }
];

async function testConnection(config) {
  console.log(`\n🔍 Testing: ${config.name}`);
  console.log(`URI: ${config.uri.replace(/\/\/[^@]*@/, '//***:***@')}`);
  console.log(`Options:`, JSON.stringify(config.options, null, 2));
  
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
    const collections = await db.listCollections().toArray();
    console.log(`  ✅ Found ${collections.length} collections`);
    
    return true;
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`);
    if (error.code) {
      console.log(`  📋 Error code: ${error.code}`);
    }
    return false;
  } finally {
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        console.log(`  ⚠️  Error closing connection: ${closeError.message}`);
      }
    }
  }
}

async function runConnectionTests() {
  console.log('🚀 Testing MongoDB Connection Configurations\n');
  console.log('📋 Node.js version:', process.version);
  console.log('📋 Platform:', process.platform);
  
  let successfulConfig = null;
  
  for (const config of connectionConfigs) {
    const success = await testConnection(config);
    if (success && !successfulConfig) {
      successfulConfig = config;
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Summary:');
  if (successfulConfig) {
    console.log('✅ Found working configuration!');
    console.log('🎉 Successful config:', successfulConfig.name);
    console.log('\n💡 Recommended configuration:');
    console.log('URI:', successfulConfig.uri.replace(/\/\/[^@]*@/, '//***:***@'));
    console.log('Options:', JSON.stringify(successfulConfig.options, null, 2));
  } else {
    console.log('❌ No configurations worked. Additional troubleshooting needed.');
    console.log('\n🔧 Next steps:');
    console.log('1. Check MongoDB Atlas firewall settings');
    console.log('2. Verify credentials');
    console.log('3. Check if IP address is whitelisted');
    console.log('4. Try updating Node.js or MongoDB driver');
  }
}

runConnectionTests().catch(console.error); 