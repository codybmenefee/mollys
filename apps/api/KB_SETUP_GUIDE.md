# Knowledge Base Storage Setup Guide

This guide explains how to set up MongoDB Atlas Vector Search for knowledge base storage and retrieval.

## Prerequisites

1. **MongoDB Atlas Cluster**: You need a MongoDB Atlas cluster (M10+ tier required for Vector Search)
2. **OpenAI API Key**: Required for generating embeddings
3. **Node.js Dependencies**: MongoDB driver and OpenAI SDK

## MongoDB Atlas Vector Search Setup

### Step 1: Enable Vector Search on Your Atlas Cluster

1. Log into your MongoDB Atlas dashboard
2. Navigate to your cluster
3. Click on the **"Search"** tab
4. Click **"Create Search Index"**
5. Select **"Vector Search"** as the index type
6. Choose your database and collection (`kb_chunks`)

### Step 2: Configure the Vector Search Index

Use the following configuration for the vector search index:

```json
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
```

**Important Notes:**
- Index name should be: `vector_index`
- Collection name should be: `kb_chunks`
- Database name: Use your database name (default: `pasture-pilot`)
- Embedding dimensions: 1536 (for OpenAI text-embedding-3-small)
- Similarity metric: cosine

### Step 3: Environment Variables

Add these environment variables to your `.env` file:

```bash
# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/

# Database name (optional, defaults to 'pasture-pilot')
MONGODB_DB_NAME=pasture-pilot

# OpenAI API key for embeddings
OPENAI_API_KEY=your-openai-api-key
```

## KB Store Usage

### Basic Usage

```typescript
import { kbStore } from './agents/kb-store';
import { generateEmbedding } from './scripts/ingest-sample-data';

// Initialize the KB store
await kbStore.initialize();

// Insert a single chunk
const chunkId = await kbStore.insertChunk({
  text: "Your knowledge base content here",
  embedding: await generateEmbedding("Your content"),
  metadata: {
    source: "document-name",
    type: "educational",
    createdAt: new Date(),
    updatedAt: new Date(),
  }
});

// Search for similar content
const queryEmbedding = await generateEmbedding("search query");
const results = await kbStore.semanticSearch(queryEmbedding, {
  limit: 5,
  threshold: 0.7
});
```

### Schema Definition

```typescript
interface KbChunk {
  _id?: string;
  text: string;
  embedding: number[];
  metadata: {
    source: string;
    type: string;
    createdAt: Date;
    updatedAt: Date;
    chunkIndex?: number;
    sourceId?: string;
    [key: string]: any;
  };
}
```

### Available Methods

#### Insert Operations
- `insertChunk(chunk)` - Insert a single chunk
- `insertChunks(chunks)` - Insert multiple chunks at once

#### Search Operations
- `semanticSearch(embedding, options)` - Vector similarity search
- `vectorSearch(embedding, options)` - Alias for semanticSearch
- `getChunksByMetadata(filter)` - Filter by metadata

#### Management Operations
- `updateChunk(id, updates)` - Update a chunk
- `deleteChunk(id)` - Delete a chunk
- `deleteChunksByMetadata(filter)` - Delete by metadata
- `getStats()` - Get collection statistics

### Search Options

```typescript
interface QueryOptions {
  limit?: number;      // Default: 5
  threshold?: number;  // Default: 0.7 (cosine similarity)
  filter?: Filter<KbChunk>; // MongoDB filter
}
```

## Running the Sample Ingestion

### Install Dependencies
```bash
cd apps/api
npm install
```

### Run the Sample Data Ingestion
```bash
# Using ts-node
npx ts-node src/scripts/ingest-sample-data.ts

# Or using npm script (add to package.json)
npm run ingest-sample
```

### Sample Package.json Script
Add this to your `apps/api/package.json`:

```json
{
  "scripts": {
    "ingest-sample": "ts-node src/scripts/ingest-sample-data.ts",
    "kb-stats": "ts-node -e \"import('./src/agents/kb-store').then(({kbStore}) => kbStore.initialize().then(() => kbStore.getStats()).then(console.log))\""
  }
}
```

## Testing the Setup

### Test Vector Search Index
```bash
# Test if vector search is working
npx ts-node -e "
import { kbStore } from './src/agents/kb-store';
import { generateEmbedding } from './src/scripts/ingest-sample-data';

(async () => {
  await kbStore.initialize();
  const embedding = await generateEmbedding('test query');
  const results = await kbStore.semanticSearch(embedding, { limit: 1 });
  console.log('Vector search test:', results.length > 0 ? 'PASS' : 'FAIL');
})();
"
```

### Check Collection Stats
```bash
npx ts-node -e "
import { kbStore } from './src/agents/kb-store';
(async () => {
  await kbStore.initialize();
  const stats = await kbStore.getStats();
  console.log('KB Stats:', stats);
})();
"
```

## Integration with Processing Module

When integrating with your processing module, the workflow should be:

1. **Process Documents**: Use your existing processing module to chunk documents
2. **Generate Embeddings**: Use OpenAI API to generate embeddings for each chunk
3. **Store in KB**: Use `kbStore.insertChunks()` to store processed chunks
4. **Search**: Use `kbStore.semanticSearch()` for retrieval

```typescript
// Example integration
async function processAndStore(documents: Document[]) {
  const chunks = await processDocuments(documents); // Your processing module
  
  const kbChunks = await Promise.all(
    chunks.map(async (chunk) => ({
      text: chunk.text,
      embedding: await generateEmbedding(chunk.text),
      metadata: {
        source: chunk.source,
        type: chunk.type,
        createdAt: new Date(),
        updatedAt: new Date(),
        chunkIndex: chunk.index,
        sourceId: chunk.sourceId,
      }
    }))
  );
  
  await kbStore.insertChunks(kbChunks);
}
```

## Error Handling

The KB store includes comprehensive error handling:

- **Connection errors**: Automatic retry with exponential backoff
- **Validation errors**: Embedding dimension validation
- **Search errors**: Graceful fallback to metadata search
- **Index errors**: Automatic index creation on first use

## Performance Considerations

- **Batch Inserts**: Use `insertChunks()` for multiple documents
- **Connection Pooling**: MongoDB driver handles connection pooling automatically
- **Index Optimization**: Vector search index is optimized for cosine similarity
- **Rate Limiting**: Sample script includes rate limiting for OpenAI API calls

## Troubleshooting

### Common Issues

1. **"Vector search index not found"**
   - Ensure the vector search index is created in Atlas
   - Check that the index name is exactly `vector_index`

2. **"Invalid embedding dimensions"**
   - Verify you're using the correct embedding model
   - text-embedding-3-small produces 1536 dimensions

3. **"Connection timeout"**
   - Check your MongoDB connection string
   - Verify network access in Atlas

4. **"No search results"**
   - Check the similarity threshold (try lowering it)
   - Verify embeddings are generated correctly

### Debug Mode
Set `NODE_ENV=development` for detailed logging.

## Security Best Practices

1. **Environment Variables**: Store sensitive data in environment variables
2. **Connection Security**: Use MongoDB Atlas built-in security features
3. **Access Control**: Implement proper authentication in your API
4. **Rate Limiting**: Implement rate limiting for embedding generation
5. **Input Validation**: Validate all inputs before processing

## Next Steps

1. **Implement Authentication**: Add user-based access control
2. **Add Caching**: Implement Redis caching for frequent searches
3. **Monitoring**: Add metrics and logging for production use
4. **Scaling**: Consider horizontal scaling for large datasets
5. **Fine-tuning**: Optimize similarity thresholds based on your use case
