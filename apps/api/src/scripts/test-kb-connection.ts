#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { kbStore } from '../agents/kb-store';
import { getDatabase } from '../lib/mongodb';

// Load environment variables
config();

async function testKbConnection() {
  console.log('🔍 Testing KB Store Connection...\n');
  
  try {
    // Test 1: Database connection
    console.log('1. Testing database connection...');
    const db = await getDatabase();
    console.log('✅ Database connected successfully');
    console.log(`   Database name: ${db.databaseName}`);
    
    // Test 2: KB Store initialization
    console.log('\n2. Testing KB Store initialization...');
    await kbStore.initialize();
    console.log('✅ KB Store initialized successfully');
    
    // Test 3: Collection access
    console.log('\n3. Testing collection access...');
    const stats = await kbStore.getStats();
    console.log('✅ Collection accessible');
    console.log(`   Total chunks: ${stats.totalChunks}`);
    console.log(`   Sources: ${stats.sources.length}`);
    console.log(`   Types: ${stats.types.length}`);
    
    // Test 4: Index verification
    console.log('\n4. Testing indexes...');
    const collection = await db.collection('kb_chunks');
    const indexes = await collection.listIndexes().toArray();
    console.log('✅ Indexes found:');
    indexes.forEach((index: any, i: number) => {
      console.log(`   ${i + 1}. ${index.name} (${Object.keys(index.key || {}).join(', ')})`);
    });
    
    // Test 5: Sample data test (if any exists)
    console.log('\n5. Testing sample data...');
    const sampleChunks = await kbStore.getChunksByMetadata({ 'metadata.type': 'educational' });
    if (sampleChunks.length > 0) {
      console.log(`✅ Found ${sampleChunks.length} sample chunks`);
      console.log(`   Sample chunk: ${sampleChunks[0].text.substring(0, 100)}...`);
    } else {
      console.log('⚠️  No sample chunks found. Run ingestion script to add sample data.');
    }
    
    console.log('\n🎉 All tests passed! KB Store is ready to use.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    
    // Provide troubleshooting hints
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Check your MONGODB_URI environment variable');
    console.log('2. Ensure your MongoDB Atlas cluster is running');
    console.log('3. Verify network access to your cluster');
    console.log('4. Check if the database name is correct');
    console.log('5. Make sure you have the necessary permissions');
    
    throw error;
  }
}

// Additional utility functions for debugging
async function debugInfo() {
  console.log('🔍 Debug Information:\n');
  
  console.log('Environment Variables:');
  console.log(`  MONGODB_URI: ${process.env.MONGODB_URI ? 'Set' : 'Not set'}`);
  console.log(`  MONGODB_DB_NAME: ${process.env.MONGODB_DB_NAME || 'Not set (using default)'}`);
  console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Set' : 'Not set'}`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
  
  console.log('\nNode.js Information:');
  console.log(`  Node.js version: ${process.version}`);
  console.log(`  Platform: ${process.platform}`);
  console.log(`  Architecture: ${process.arch}`);
}

// Run the test
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--debug')) {
    debugInfo()
      .then(() => testKbConnection())
      .then(() => {
        console.log('\n✅ Connection test completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Connection test failed:', error);
        process.exit(1);
      });
  } else {
    testKbConnection()
      .then(() => {
        console.log('\n✅ Connection test completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Connection test failed:', error);
        process.exit(1);
      });
  }
}

export { testKbConnection, debugInfo };