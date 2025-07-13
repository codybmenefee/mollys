import { MongoClient, Collection, InsertOneResult } from 'mongodb';
import clientPromise from './mongodb';

export interface VideoKBEntry {
  _id?: string;
  videoId: string;
  title: string;
  description?: string;
  url: string;
  channelTitle: string;
  publishDate: string;
  duration: string;
  viewCount: number;
  thumbnail: string;
  tags: string[];
  
  // Transcription data
  transcript: string;
  transcriptionLanguage?: string;
  transcriptionDuration?: number;
  transcriptionConfidence?: number;
  transcriptionSegments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  
  // Processing metadata
  audioDownloadedAt?: Date;
  transcribedAt?: Date;
  processedAt: Date;
  processingStatus: 'pending' | 'downloading' | 'transcribing' | 'completed' | 'failed';
  processingErrors?: string[];
  
  // Knowledge base metadata
  source: 'youtube';
  sourceChannel: string;
  sourceChannelId: string;
  category: 'regenerative-agriculture' | 'livestock-farming' | 'grazing-management' | 'general';
  
  // Search and indexing
  searchableText?: string;
  keywords?: string[];
  
  // Versioning
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoKBStats {
  totalVideos: number;
  completedVideos: number;
  failedVideos: number;
  totalTranscriptLength: number;
  avgTranscriptionConfidence: number;
  processingStatusCounts: Record<string, number>;
}

export class VideoKBStore {
  private collection: Collection<VideoKBEntry> | null = null;
  private dbName = 'pasturepilot';
  private collectionName = 'video_kb';

  async initialize(): Promise<void> {
    try {
      const client = await clientPromise;
      const db = client.db(this.dbName);
      this.collection = db.collection<VideoKBEntry>(this.collectionName);
      
      // Create indexes for efficient searching
      await this.createIndexes();
      
      console.log('VideoKBStore initialized successfully');
    } catch (error) {
      console.error('Failed to initialize VideoKBStore:', error);
      throw error;
    }
  }

  private async createIndexes(): Promise<void> {
    if (!this.collection) return;
    
    try {
      // Create indexes for efficient searching
      await this.collection.createIndex({ videoId: 1 }, { unique: true });
      await this.collection.createIndex({ processingStatus: 1 });
      await this.collection.createIndex({ sourceChannel: 1 });
      await this.collection.createIndex({ category: 1 });
      await this.collection.createIndex({ publishDate: -1 });
      await this.collection.createIndex({ createdAt: -1 });
      
      // Text search index
      await this.collection.createIndex({ 
        title: 'text',
        description: 'text',
        transcript: 'text',
        searchableText: 'text'
      });
      
      console.log('MongoDB indexes created successfully');
    } catch (error) {
      console.error('Error creating indexes:', error);
      // Don't throw here, as indexes might already exist
    }
  }

  async storeVideoKB(entry: Omit<VideoKBEntry, '_id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<InsertOneResult> {
    if (!this.collection) {
      await this.initialize();
    }
    
    if (!this.collection) {
      throw new Error('Failed to initialize collection');
    }

    const now = new Date();
    const fullEntry: VideoKBEntry = {
      ...entry,
      version: 1,
      createdAt: now,
      updatedAt: now,
      searchableText: this.createSearchableText(entry)
    };

    try {
      const result = await this.collection.insertOne(fullEntry);
      console.log(`Stored video KB entry: ${entry.videoId}`);
      return result;
    } catch (error) {
      console.error(`Error storing video KB entry ${entry.videoId}:`, error);
      throw error;
    }
  }

  async updateVideoKB(videoId: string, update: Partial<VideoKBEntry>): Promise<boolean> {
    if (!this.collection) {
      await this.initialize();
    }
    
    if (!this.collection) {
      throw new Error('Failed to initialize collection');
    }

    try {
      const result = await this.collection.updateOne(
        { videoId },
        { 
          $set: { 
            ...update, 
            updatedAt: new Date(),
            searchableText: update.transcript ? this.createSearchableText(update as VideoKBEntry) : undefined
          },
          $inc: { version: 1 }
        }
      );
      
      console.log(`Updated video KB entry: ${videoId}`);
      return result.modifiedCount > 0;
    } catch (error) {
      console.error(`Error updating video KB entry ${videoId}:`, error);
      throw error;
    }
  }

  async getVideoKB(videoId: string): Promise<VideoKBEntry | null> {
    if (!this.collection) {
      await this.initialize();
    }
    
    if (!this.collection) {
      throw new Error('Failed to initialize collection');
    }

    try {
      const result = await this.collection.findOne({ videoId });
      return result;
    } catch (error) {
      console.error(`Error retrieving video KB entry ${videoId}:`, error);
      throw error;
    }
  }

  async getVideosByStatus(status: VideoKBEntry['processingStatus']): Promise<VideoKBEntry[]> {
    if (!this.collection) {
      await this.initialize();
    }
    
    if (!this.collection) {
      throw new Error('Failed to initialize collection');
    }

    try {
      const results = await this.collection.find({ processingStatus: status }).toArray();
      return results;
    } catch (error) {
      console.error(`Error retrieving videos by status ${status}:`, error);
      throw error;
    }
  }

  async searchVideos(query: string, limit: number = 10): Promise<VideoKBEntry[]> {
    if (!this.collection) {
      await this.initialize();
    }
    
    if (!this.collection) {
      throw new Error('Failed to initialize collection');
    }

    try {
      const results = await this.collection
        .find({ 
          $text: { $search: query },
          processingStatus: 'completed' 
        })
        .limit(limit)
        .toArray();
      
      return results;
    } catch (error) {
      console.error(`Error searching videos with query "${query}":`, error);
      throw error;
    }
  }

  async getStats(): Promise<VideoKBStats> {
    if (!this.collection) {
      await this.initialize();
    }
    
    if (!this.collection) {
      throw new Error('Failed to initialize collection');
    }

    try {
      const [
        totalVideos,
        completedVideos,
        failedVideos,
        statusCounts,
        transcriptStats
      ] = await Promise.all([
        this.collection.countDocuments(),
        this.collection.countDocuments({ processingStatus: 'completed' }),
        this.collection.countDocuments({ processingStatus: 'failed' }),
        this.collection.aggregate([
          { $group: { _id: '$processingStatus', count: { $sum: 1 } } }
        ]).toArray(),
        this.collection.aggregate([
          { $match: { processingStatus: 'completed' } },
          { $group: { 
            _id: null,
            totalLength: { $sum: { $strLenCP: '$transcript' } },
            avgConfidence: { $avg: '$transcriptionConfidence' }
          }}
        ]).toArray()
      ]);

      const processingStatusCounts = statusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>);

      const transcriptData = transcriptStats[0] || { totalLength: 0, avgConfidence: 0 };

      return {
        totalVideos,
        completedVideos,
        failedVideos,
        totalTranscriptLength: transcriptData.totalLength,
        avgTranscriptionConfidence: transcriptData.avgConfidence,
        processingStatusCounts
      };
    } catch (error) {
      console.error('Error getting video KB stats:', error);
      throw error;
    }
  }

  private createSearchableText(entry: Partial<VideoKBEntry>): string {
    const parts = [
      entry.title,
      entry.description,
      entry.transcript,
      entry.channelTitle,
      entry.tags?.join(' '),
      entry.keywords?.join(' ')
    ].filter(Boolean);
    
    return parts.join(' ');
  }
}

// Export singleton instance
export const videoKBStore = new VideoKBStore(); 