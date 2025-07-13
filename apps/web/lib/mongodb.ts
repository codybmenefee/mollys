import { MongoClient, MongoClientOptions } from 'mongodb';

const uri = process.env.MONGODB_URI!;

if (!uri) {
  throw new Error('MONGODB_URI environment variable is not set');
}

// MongoDB connection options with improved error handling
const options: MongoClientOptions = {
  // Connection pool settings
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000, // Reduced for faster failures
  socketTimeoutMS: 45000,
  
  // Connection timeout
  connectTimeoutMS: 10000,
  
  // Retry configuration
  retryWrites: true,
  retryReads: true,
  
  // Monitoring (only in development)
  monitorCommands: process.env.NODE_ENV === 'development',
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Declare global for caching the connection
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

async function createMongoClient(): Promise<MongoClient> {
  try {
    console.log('🔗 Connecting to MongoDB...');
    
    const newClient = new MongoClient(uri, options);
    await newClient.connect();
    
    // Test the connection
    await newClient.db().admin().ping();
    console.log('✅ MongoDB connected successfully');
    
    return newClient;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    
    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('ENOTFOUND')) {
        console.error('💡 DNS resolution failed. Check your MongoDB cluster hostname.');
      } else if (error.message.includes('Authentication failed')) {
        console.error('💡 Authentication failed. Check your username/password.');
      } else if (error.message.includes('SSL') || error.message.includes('TLS')) {
        console.error('💡 SSL/TLS error. Your MongoDB cluster configuration may need updating.');
      }
    }
    
    throw error;
  }
}

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the value
  // across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = createMongoClient();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  clientPromise = createMongoClient();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

/**
 * Get a database instance
 */
export async function getDatabase(dbName?: string) {
  const client = await clientPromise;
  return client.db(dbName);
}

/**
 * Check if MongoDB connection is healthy
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const client = await clientPromise;
    await client.db().admin().ping();
    return true;
  } catch (error) {
    console.error('MongoDB health check failed:', error);
    return false;
  }
}

/**
 * Get connection status and stats
 */
export async function getConnectionInfo() {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    const [
      serverStatus,
      collections,
      dbStats
    ] = await Promise.all([
      db.admin().serverStatus(),
      db.listCollections().toArray(),
      db.stats()
    ]);

    return {
      connected: true,
      host: serverStatus.host,
      version: serverStatus.version,
      uptime: serverStatus.uptime,
      collections: collections.length,
      totalSize: dbStats.totalSize,
      dataSize: dbStats.dataSize,
      indexSize: dbStats.indexSize
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}