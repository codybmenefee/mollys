# Knowledge Base RAG Implementation

## Overview

This implementation integrates KB (Knowledge Base) retrieval into the PasturePilot chat system for RAG (Retrieval-Augmented Generation). The system allows ingesting farming-related content and retrieving relevant information to enhance chat responses with source citations.

## Features

- **Knowledge Base Storage**: Store and manage farming content with metadata
- **Vector Embeddings**: Generate embeddings using OpenRouter API
- **Semantic Search**: Retrieve relevant chunks based on similarity
- **Source Citations**: Include source URLs in chat responses
- **Multiple Source Types**: Support for YouTube, articles, documents, and manuals
- **Streaming Support**: Works with streaming chat responses

## Architecture

### Components

1. **KnowledgeBaseStore** (`lib/kb-store.ts`): Core KB management
2. **Chat Integration** (`lib/chat.ts`): KB retrieval in chat flow
3. **KBRetrieverAgent** (`lib/agents.ts`): Specialized agent for KB-enhanced responses
4. **MessageRenderer** (`components/MessageRenderer.tsx`): Renders source citations
5. **API Endpoints**: `/api/kb/embed` and `/api/kb/query`

### Data Flow

1. **Ingestion**: Content → Chunking → Embedding → Storage
2. **Retrieval**: Query → Embedding → Similarity Search → Top-K Results
3. **Chat Integration**: User Query → KB Retrieval → Enhanced System Prompt → AI Response

## Getting Started

### 1. Environment Setup

Ensure you have the `OPENROUTER_API_KEY` environment variable set for embedding generation.

### 2. Manual Content Ingestion (POC)

Use the POC utility to test the system:

```typescript
// In browser console
await KBIngestionPOC.demoRAGWorkflow()
```

This will:
- Ingest sample sheep farming content
- Test various queries
- Demonstrate the complete RAG workflow

### 3. Individual Operations

```typescript
// Ingest content
await KBIngestionPOC.ingestSheepGrazingContent()

// Test queries
await KBIngestionPOC.testKBQuery('sheep grazing tips')

// Clear KB
KBIngestionPOC.clearKnowledgeBase()
```

## API Endpoints

### `/api/kb/embed`
Generate embeddings for text content.

**Request:**
```json
{
  "text": "sheep grazing management tips"
}
```

**Response:**
```json
{
  "embedding": [0.1, 0.2, 0.3, ...]
}
```

### `/api/kb/query`
Query the knowledge base for relevant content.

**Request:**
```json
{
  "query": "sheep grazing tips",
  "topK": 3
}
```

**Response:**
```json
{
  "query": "sheep grazing tips",
  "chunks": [
    {
      "id": "chunk-1",
      "content": "Sheep grazing management...",
      "similarity": 0.85,
      "source": {
        "url": "https://youtube.com/watch?v=...",
        "title": "Sheep Grazing Guide",
        "type": "youtube"
      },
      "tags": ["sheep", "grazing"]
    }
  ],
  "totalSources": 1,
  "totalChunks": 5,
  "retrievedChunks": 3
}
```

## Chat Integration

The system automatically integrates with the chat flow:

1. **User sends message**: "What are some sheep grazing tips?"
2. **KB retrieval**: System queries KB for relevant chunks
3. **Enhanced prompt**: AI receives context with source information
4. **Sourced response**: AI responds with citations

### Example Enhanced System Prompt

```
You are PasturePilot, an AI assistant specialized in regenerative livestock farming...

Use these sources to provide more detailed and accurate information:

Source 1 (Sheep Grazing 101): Sheep need about 2-3 inches of grass height for optimal nutrition. Never let them graze below 2 inches as this damages the root system.
[Source URL: https://youtube.com/watch?v=sheep-grazing-101]

When referencing these sources, include the source URL in your response for citation.
```

## Source Citation Format

The system uses a special citation format that's rendered with enhanced styling:

```markdown
[Source: Title](URL)
```

This renders as a styled citation block with a book emoji (📚) and proper link formatting.

## Knowledge Base Management

### Storage
- **Location**: Browser localStorage (for POC)
- **Key**: `pasturepilot_kb_store`
- **Format**: JSON with sources and embedded chunks

### Limits
- **Max chunks**: 1000 (configurable)
- **Chunk size**: 500 characters
- **Chunk overlap**: 50 characters

### Statistics
```typescript
const stats = KnowledgeBaseStore.getStats()
// Returns: totalSources, totalChunks, sourceTypes, lastUpdated
```

## Supported Source Types

- **YouTube**: Video content and transcripts
- **Article**: Web articles and blog posts
- **Document**: PDFs and text documents
- **Manual**: Technical manuals and guides

## Testing

### Manual Testing (POC)

1. **Open browser console**
2. **Run demo workflow**:
   ```javascript
   await KBIngestionPOC.demoRAGWorkflow()
   ```

3. **Test individual queries**:
   ```javascript
   await KBIngestionPOC.testKBQuery('sheep health monitoring')
   ```

### Test Scenarios

- **Sheep grazing tips**: Should retrieve rotational grazing information
- **Sheep health monitoring**: Should return health observation guidelines
- **Pasture management**: Should provide grass and soil management advice

## Integration with Agents

The `KBRetrieverAgent` is specialized for KB-enhanced responses:

- **Capabilities**: knowledge_retrieval, source_citation, farming_insights
- **Model**: mistralai/mistral-7b-instruct
- **Focus**: Synthesizing KB content with farming expertise

## Future Enhancements

1. **Database Storage**: Replace localStorage with persistent database
2. **Vector Database**: Use dedicated vector DB (Pinecone, Weaviate)
3. **Automatic Ingestion**: YouTube API integration for automatic content ingestion
4. **Advanced Chunking**: Semantic chunking strategies
5. **Relevance Scoring**: Improved similarity algorithms
6. **Content Validation**: Quality scoring and filtering

## Troubleshooting

### Common Issues

1. **No embeddings generated**: Check OPENROUTER_API_KEY
2. **No results returned**: Verify content was ingested successfully
3. **Low similarity scores**: Content may not be relevant to farming topics
4. **Storage full**: Clear KB or increase MAX_CHUNKS limit

### Debug Commands

```javascript
// Check KB stats
console.log(KnowledgeBaseStore.getStats())

// View all sources
console.log(KnowledgeBaseStore.getSources())

// Test embedding API
fetch('/api/kb/embed', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({text: 'test'})
}).then(r => r.json()).then(console.log)
```

## Production Considerations

1. **Rate Limiting**: Implement rate limiting for embedding API
2. **Content Moderation**: Validate ingested content quality
3. **Performance**: Optimize similarity search for large datasets
4. **Monitoring**: Track query performance and relevance
5. **Backup**: Implement KB backup and recovery

## Example Usage Flow

1. **Manual ingestion** (POC):
   ```javascript
   await KBIngestionPOC.ingestSheepGrazingContent()
   ```

2. **User chats**: "How often should I move sheep between paddocks?"

3. **System retrieves**: Relevant chunks about rotational grazing

4. **AI responds**: "Based on the sources, sheep should be moved every 3-4 days between paddocks. [Source: Sheep Grazing 101](https://youtube.com/watch?v=sheep-grazing-101) This allows grass to recover and prevents overgrazing."

5. **User sees**: Enhanced response with clickable source citation

This creates a comprehensive RAG system that enhances farming advice with verified, sourced information.