import { MongoClient, Db, Collection, Document as MongoDocument } from 'mongodb';

// MongoDB Atlas Vector Search requires MongoDB 6.0.11+ and Atlas cluster tier M10+
// To enable Vector Search on your Atlas cluster:
// 1. Navigate to your Atlas cluster
// 2. Go to the "Search" tab
// 3. Create a new Search Index
// 4. Choose "Vector Search" as the index type
// 5. Use the following configuration for the kb_chunks collection:
/*
{
  "fields": [
    {
      "numDimensions": 1536,
      "path": "embedding",
      "similarity": "cosine",
      "type": "vector"
    }
  ]
}
*/

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB_NAME || 'pasture-pilot';

if (!uri) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const options = {
  // Optional: specify connection options here
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Database and Collection getters
export const getDatabase = async (): Promise<Db> => {
  const client = await clientPromise;
  return client.db(dbName);
};

export const getKbChunksCollection = async (): Promise<Collection<MongoDocument>> => {
  const db = await getDatabase();
  return db.collection('kb_chunks');
};

// Initialize indexes for the kb_chunks collection
export const initializeKbIndexes = async (): Promise<void> => {
  try {
    const collection = await getKbChunksCollection();
    
    // Create text index for traditional text search
    await collection.createIndex({ text: 'text' });
    
    // Create compound index for metadata queries
    await collection.createIndex({ 'metadata.source': 1, 'metadata.type': 1 });
    
    console.log('KB indexes initialized successfully');
  } catch (error) {
    console.error('Error initializing KB indexes:', error);
    throw error;
  }
};

export default clientPromise;