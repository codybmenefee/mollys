import { KnowledgeBaseStore, KnowledgeChunk, RetrievalResult } from './kb-store';
import { VideoKBStore, VideoKBEntry } from './video-kb-store';

interface EnhancedKnowledgeChunk extends KnowledgeChunk {
  videoId?: string;
  channelTitle?: string;
  publishDate?: string;
  relevanceScore?: number;
  sourceType: 'youtube' | 'article' | 'document' | 'manual';
}

interface EnhancedRetrievalResult extends RetrievalResult {
  chunks: EnhancedKnowledgeChunk[];
}

interface SourceAttribution {
  id: string;
  title: string;
  url: string;
  type: 'youtube' | 'article' | 'document' | 'manual';
  relevanceScore: number;
  publishDate?: string;
  channelTitle?: string;
}

export class EnhancedKBStore {
  private static videoKBStore = new VideoKBStore();
  
  /**
   * Query both traditional KB and video KB for relevant information
   */
  static async query(query: string, topK: number = 5): Promise<EnhancedRetrievalResult> {
    try {
      // Initialize video KB store if needed
      await this.videoKBStore.initialize();
      
      // Query video KB with higher priority (more results)
      const videoResult = await this.queryVideoKB(query, topK * 2);
      
      // Query traditional KB (reduced priority due to embedding issues)
      let traditionalResult;
      try {
        traditionalResult = await KnowledgeBaseStore.query(query, Math.ceil(topK / 4));
      } catch (error) {
        console.error('Traditional KB query failed, using video KB only:', error);
        traditionalResult = { chunks: [], sources: new Set<string>(), totalChunks: 0 };
      }
      
      // Combine and rank results with diversity promotion
      const combinedChunks = [
        ...traditionalResult.chunks.map(chunk => this.enhanceTraditionalChunk(chunk)),
        ...videoResult
      ];
      
      // Promote diversity by selecting chunks from different sources
      const topChunks = this.selectDiverseChunks(combinedChunks, topK);
      
      const sources = new Set([
        ...Array.from(traditionalResult.sources),
        ...topChunks.filter(chunk => chunk.videoId).map(chunk => chunk.metadata.sourceUrl)
      ]);
      
      return {
        chunks: topChunks,
        sources,
        totalChunks: traditionalResult.totalChunks + videoResult.length
      };
    } catch (error) {
      console.error('Enhanced KB query error:', error);
      // Fallback to traditional KB
      const fallbackResult = await KnowledgeBaseStore.query(query, topK);
      return {
        chunks: fallbackResult.chunks.map(chunk => this.enhanceTraditionalChunk(chunk)),
        sources: fallbackResult.sources,
        totalChunks: fallbackResult.totalChunks
      };
    }
  }
  
  /**
   * Query video KB with transcript search
   */
  private static async queryVideoKB(query: string, limit: number): Promise<EnhancedKnowledgeChunk[]> {
    try {
      // Get more videos to ensure diversity
      const videos = await this.videoKBStore.searchVideos(query, Math.max(limit, 10));
      const chunks: EnhancedKnowledgeChunk[] = [];
      
      // Process each video and get the best chunks
      for (const video of videos) {
        if (video.transcript && video.processingStatus === 'completed') {
          // Create chunks from video transcript
          const videoChunks = this.createVideoChunks(video, query);
          // Take the best chunk from each video to promote diversity
          if (videoChunks.length > 0) {
            chunks.push(videoChunks[0]); // Best chunk from this video
            // Add second best chunk if it's significantly different
            if (videoChunks.length > 1 && videoChunks[1].relevanceScore && videoChunks[1].relevanceScore > 0.3) {
              chunks.push(videoChunks[1]);
            }
          }
        }
      }
      
      // Sort by relevance and return diverse results
      return chunks
        .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
        .slice(0, limit);
    } catch (error) {
      console.error('Video KB query error:', error);
      return [];
    }
  }
  
  /**
   * Create relevant chunks from video transcript
   */
  private static createVideoChunks(video: VideoKBEntry, query: string): EnhancedKnowledgeChunk[] {
    const chunks: EnhancedKnowledgeChunk[] = [];
    const transcript = video.transcript;
    const chunkSize = 500;
    const overlap = 50;
    
    // Split transcript into sentences
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim() + '.';
      
      if (currentChunk.length + sentence.length > chunkSize) {
        if (currentChunk.trim()) {
          const relevanceScore = this.calculateRelevanceScore(currentChunk, query);
          
          // Only include chunks with decent relevance
          if (relevanceScore > 0.1) {
            chunks.push({
              id: `${video.videoId}-chunk-${chunkIndex}`,
              content: currentChunk.trim(),
              embedding: [], // Will be populated if needed
              similarity: relevanceScore,
              relevanceScore,
              videoId: video.videoId,
              channelTitle: video.channelTitle,
              publishDate: video.publishDate,
              sourceType: 'youtube',
              metadata: {
                sourceUrl: video.url,
                title: video.title,
                sourceType: 'youtube',
                timestamp: new Date(video.publishDate),
                tags: video.tags
              }
            });
          }
          chunkIndex++;
        }
        
        // Start new chunk with overlap
        const overlap_text = currentChunk.slice(-overlap);
        currentChunk = overlap_text + ' ' + sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }
    
    // Add remaining content
    if (currentChunk.trim()) {
      const relevanceScore = this.calculateRelevanceScore(currentChunk, query);
      if (relevanceScore > 0.1) {
        chunks.push({
          id: `${video.videoId}-chunk-${chunkIndex}`,
          content: currentChunk.trim(),
          embedding: [],
          similarity: relevanceScore,
          relevanceScore,
          videoId: video.videoId,
          channelTitle: video.channelTitle,
          publishDate: video.publishDate,
          sourceType: 'youtube',
          metadata: {
            sourceUrl: video.url,
            title: video.title,
            sourceType: 'youtube',
            timestamp: new Date(video.publishDate),
            tags: video.tags
          }
        });
      }
    }
    
    return chunks.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }
  
  /**
   * Calculate relevance score based on query match
   */
  private static calculateRelevanceScore(text: string, query: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const textWords = text.toLowerCase().split(/\s+/);
    
    let score = 0;
    let matchedWords = 0;
    
    for (const queryWord of queryWords) {
      if (queryWord.length < 3) continue; // Skip short words
      
      for (const textWord of textWords) {
        if (textWord.includes(queryWord) || queryWord.includes(textWord)) {
          score += 1;
          matchedWords++;
          break;
        }
      }
    }
    
    // Bonus for multiple word matches
    if (matchedWords > 1) {
      score += matchedWords * 0.5;
    }
    
    // Normalize by text length
    return Math.min(score / Math.max(textWords.length / 50, 1), 1);
  }
  
  /**
   * Select diverse chunks to ensure representation from multiple sources
   */
  private static selectDiverseChunks(chunks: EnhancedKnowledgeChunk[], topK: number): EnhancedKnowledgeChunk[] {
    if (chunks.length === 0) return [];
    
    // Sort all chunks by relevance score first
    const sortedChunks = chunks.sort((a, b) => 
      (b.relevanceScore || b.similarity || 0) - (a.relevanceScore || a.similarity || 0)
    );
    
    const selectedChunks: EnhancedKnowledgeChunk[] = [];
    const sourceTracker = new Map<string, number>(); // Track how many chunks per source
    const maxChunksPerSource = Math.max(1, Math.floor(topK / 3)); // Allow up to topK/3 chunks per source
    
    // First pass: Select the best chunk from each unique source
    const seenSources = new Set<string>();
    for (const chunk of sortedChunks) {
      const sourceUrl = chunk.metadata.sourceUrl;
      if (!seenSources.has(sourceUrl) && selectedChunks.length < topK) {
        selectedChunks.push(chunk);
        seenSources.add(sourceUrl);
        sourceTracker.set(sourceUrl, 1);
      }
    }
    
    // Second pass: Fill remaining slots with additional chunks, respecting per-source limits
    for (const chunk of sortedChunks) {
      if (selectedChunks.length >= topK) break;
      
      const sourceUrl = chunk.metadata.sourceUrl;
      const currentCount = sourceTracker.get(sourceUrl) || 0;
      
      // Skip if we already selected this chunk or reached the per-source limit
      if (selectedChunks.includes(chunk) || currentCount >= maxChunksPerSource) {
        continue;
      }
      
      selectedChunks.push(chunk);
      sourceTracker.set(sourceUrl, currentCount + 1);
    }
    
    // Sort final selection by relevance score again
    return selectedChunks.sort((a, b) => 
      (b.relevanceScore || b.similarity || 0) - (a.relevanceScore || a.similarity || 0)
    );
  }
  
  /**
   * Enhance traditional KB chunk with additional metadata
   */
  private static enhanceTraditionalChunk(chunk: KnowledgeChunk): EnhancedKnowledgeChunk {
    return {
      ...chunk,
      relevanceScore: chunk.similarity,
      sourceType: chunk.metadata.sourceType as 'youtube' | 'article' | 'document' | 'manual'
    };
  }
  
  /**
   * Get source attributions for better citations
   */
  static async getSourceAttributions(chunks: EnhancedKnowledgeChunk[]): Promise<SourceAttribution[]> {
    const attributions: SourceAttribution[] = [];
    const seenSources = new Set<string>();
    
    for (const chunk of chunks) {
      if (!seenSources.has(chunk.metadata.sourceUrl)) {
        seenSources.add(chunk.metadata.sourceUrl);
        
        attributions.push({
          id: chunk.videoId || chunk.id,
          title: chunk.metadata.title,
          url: chunk.metadata.sourceUrl,
          type: chunk.sourceType,
          relevanceScore: chunk.relevanceScore || chunk.similarity || 0,
          publishDate: chunk.publishDate,
          channelTitle: chunk.channelTitle
        });
      }
    }
    
    return attributions.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
  
  /**
   * Get statistics about available knowledge
   */
  static async getEnhancedStats(): Promise<{
    traditionalKB: any;
    videoKB: any;
    totalSources: number;
    totalChunks: number;
  }> {
    await this.videoKBStore.initialize();
    
    const traditionalStats = KnowledgeBaseStore.getStats();
    const videoStats = await this.videoKBStore.getStats();
    
    return {
      traditionalKB: traditionalStats,
      videoKB: videoStats,
      totalSources: traditionalStats.totalSources + videoStats.completedVideos,
      totalChunks: traditionalStats.totalChunks + videoStats.completedVideos
    };
  }
} 