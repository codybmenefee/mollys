import { Collection, Document as MongoDocument, Filter, ObjectId } from 'mongodb';
import { getKbChunksCollection, initializeKbIndexes } from '../lib/mongodb';

// Define the schema for KB chunks
export interface KbChunk {
  _id?: ObjectId;
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

export interface SearchResult {
  chunk: KbChunk & { _id?: string };
  score: number;
}

export interface QueryOptions {
  limit?: number;
  threshold?: number;
  filter?: Filter<MongoDocument>;
}

export class KbStore {
  private collection: Collection<MongoDocument> | null = null;
  
  // Initialize the KB store and ensure indexes are created
  async initialize(): Promise<void> {
    try {
      this.collection = await getKbChunksCollection();
      await initializeKbIndexes();
      console.log('KB Store initialized successfully');
    } catch (error) {
      console.error('Error initializing KB Store:', error);
      throw error;
    }
  }

  // Get the collection, initializing if necessary
  private async getCollection(): Promise<Collection<MongoDocument>> {
    if (!this.collection) {
      await this.initialize();
    }
    return this.collection!;
  }

  // Insert a single chunk into the KB
  async insertChunk(chunk: Omit<KbChunk, '_id'>): Promise<string> {
    try {
      const collection = await this.getCollection();
      
      // Validate embedding dimensions (OpenAI embeddings are 1536 dimensions)
      if (!chunk.embedding || chunk.embedding.length !== 1536) {
        throw new Error('Invalid embedding: Must be 1536 dimensions for OpenAI embeddings');
      }

      // Add timestamps
      const chunkWithTimestamps: KbChunk = {
        ...chunk,
        metadata: {
          ...chunk.metadata,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = await collection.insertOne(chunkWithTimestamps);
      console.log(`Inserted chunk with ID: ${result.insertedId}`);
      return result.insertedId.toString();
    } catch (error) {
      console.error('Error inserting chunk:', error);
      throw error;
    }
  }

  // Insert multiple chunks at once
  async insertChunks(chunks: Omit<KbChunk, '_id'>[]): Promise<string[]> {
    try {
      const collection = await this.getCollection();
      
      // Validate all chunks
      for (const chunk of chunks) {
        if (!chunk.embedding || chunk.embedding.length !== 1536) {
          throw new Error('Invalid embedding: Must be 1536 dimensions for OpenAI embeddings');
        }
      }

      // Add timestamps to all chunks
      const chunksWithTimestamps: KbChunk[] = chunks.map(chunk => ({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }));

      const result = await collection.insertMany(chunksWithTimestamps);
      const insertedIds = Object.values(result.insertedIds).map(id => id.toString());
      console.log(`Inserted ${insertedIds.length} chunks`);
      return insertedIds;
    } catch (error) {
      console.error('Error inserting chunks:', error);
      throw error;
    }
  }

  // Perform vector search using MongoDB Atlas Vector Search
  async vectorSearch(
    queryEmbedding: number[],
    options: QueryOptions = {}
  ): Promise<SearchResult[]> {
    try {
      const collection = await this.getCollection();
      const { limit = 5, threshold = 0.7, filter = {} } = options;

      // Validate query embedding
      if (!queryEmbedding || queryEmbedding.length !== 1536) {
        throw new Error('Invalid query embedding: Must be 1536 dimensions for OpenAI embeddings');
      }

      // Build the aggregation pipeline for vector search
      const pipeline = [
        {
          $vectorSearch: {
            index: 'vector_index', // This is the name of the vector search index in Atlas
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: limit * 10, // Search more candidates for better results
            limit: limit,
            filter: filter,
          },
        },
        {
          $addFields: {
            score: { $meta: 'vectorSearchScore' },
          },
        },
        {
          $match: {
            score: { $gte: threshold },
          },
        },
        {
          $sort: { score: -1 },
        },
      ];

      const cursor = collection.aggregate(pipeline);
      const results: SearchResult[] = [];

      await cursor.forEach((doc) => {
        results.push({
          chunk: {
            _id: doc._id?.toString(),
            text: doc.text,
            embedding: doc.embedding,
            metadata: doc.metadata,
          },
          score: doc.score,
        });
      });

      console.log(`Vector search returned ${results.length} results`);
      return results;
    } catch (error) {
      console.error('Error performing vector search:', error);
      throw error;
    }
  }

  // Perform semantic search (wrapper for vector search with better naming)
  async semanticSearch(
    queryEmbedding: number[],
    options: QueryOptions = {}
  ): Promise<SearchResult[]> {
    return this.vectorSearch(queryEmbedding, options);
  }

  // Get chunks by metadata filter
  async getChunksByMetadata(filter: Filter<MongoDocument>): Promise<(KbChunk & { _id?: string })[]> {
    try {
      const collection = await this.getCollection();
      const cursor = collection.find(filter);
      const chunks: (KbChunk & { _id?: string })[] = [];

      await cursor.forEach((doc: any) => {
        chunks.push({
          _id: doc._id?.toString(),
          text: doc.text,
          embedding: doc.embedding,
          metadata: doc.metadata,
        });
      });

      return chunks;
    } catch (error) {
      console.error('Error getting chunks by metadata:', error);
      throw error;
    }
  }

  // Update a chunk
  async updateChunk(id: string, updates: Partial<Omit<KbChunk, '_id'>>): Promise<boolean> {
    try {
      const collection = await this.getCollection();
      
      // Add updated timestamp to metadata if it exists
      const updateDoc: any = { ...updates };
      if (updates.metadata) {
        updateDoc.metadata = {
          ...updates.metadata,
          updatedAt: new Date(),
        };
      }

      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateDoc }
      );

      return result.matchedCount > 0;
    } catch (error) {
      console.error('Error updating chunk:', error);
      throw error;
    }
  }

  // Delete a chunk
  async deleteChunk(id: string): Promise<boolean> {
    try {
      const collection = await this.getCollection();
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting chunk:', error);
      throw error;
    }
  }

  // Delete chunks by metadata filter
  async deleteChunksByMetadata(filter: Filter<MongoDocument>): Promise<number> {
    try {
      const collection = await this.getCollection();
      const result = await collection.deleteMany(filter);
      return result.deletedCount;
    } catch (error) {
      console.error('Error deleting chunks by metadata:', error);
      throw error;
    }
  }

  // Get collection statistics
  async getStats(): Promise<{
    totalChunks: number;
    sources: string[];
    types: string[];
  }> {
    try {
      const collection = await this.getCollection();
      
      const [totalChunks, sources, types] = await Promise.all([
        collection.countDocuments(),
        collection.distinct('metadata.source'),
        collection.distinct('metadata.type'),
      ]);

      return {
        totalChunks,
        sources,
        types,
      };
    } catch (error) {
      console.error('Error getting KB stats:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const kbStore = new KbStore();