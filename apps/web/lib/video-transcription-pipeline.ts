import { youtubeKBIngest, YouTubeVideo } from './youtube-kb-ingest';
import { youtubeAudioDownloader, AudioDownloadResult } from './youtube-audio-downloader';
import { whisperTranscriber, TranscriptionResult } from './whisper-transcriber';
import { videoKBStore, VideoKBEntry, VideoKBStats } from './video-kb-store';

export interface PipelineResult {
  success: boolean;
  videosProcessed: number;
  videosCompleted: number;
  videosFailed: number;
  errors: Array<{
    videoId: string;
    stage: 'ingestion' | 'download' | 'transcription' | 'storage';
    error: string;
  }>;
  completedVideos: Array<{
    videoId: string;
    title: string;
    transcriptLength: number;
  }>;
}

export interface VideoProcessingResult {
  videoId: string;
  success: boolean;
  title?: string;
  transcriptLength?: number;
  stage?: 'ingestion' | 'download' | 'transcription' | 'storage';
  error?: string;
}

export interface PipelineOptions {
  maxVideos?: number;
  maxConcurrentDownloads?: number;
  skipExisting?: boolean;
  testMode?: boolean;
}

export class VideoTranscriptionPipeline {
  private readonly defaultOptions: PipelineOptions = {
    maxVideos: 5, // Conservative default for testing
    maxConcurrentDownloads: 1, // Reduced to 1 to avoid API rate limits
    skipExisting: true,
    testMode: false
  };

  /**
   * Run the complete video transcription pipeline
   * @param options Pipeline configuration options
   * @returns Promise<PipelineResult>
   */
  async runPipeline(options: PipelineOptions = {}): Promise<PipelineResult> {
    const opts = { ...this.defaultOptions, ...options };
    
    console.log('🚀 Starting video transcription pipeline...');
    console.log('📝 Pipeline options:', opts);
    
    const result: PipelineResult = {
      success: false,
      videosProcessed: 0,
      videosCompleted: 0,
      videosFailed: 0,
      errors: [],
      completedVideos: []
    };

    try {
      // Step 1: Initialize MongoDB store
      console.log('📦 Initializing MongoDB store...');
      await videoKBStore.initialize();
      
      // Step 2: Ingest YouTube videos
      console.log('📺 Ingesting YouTube videos...');
      const ingestionResult = await youtubeKBIngest.ingestGregJudyVideos();
      
      if (!ingestionResult.success) {
        throw new Error('YouTube ingestion failed');
      }
      
      // Limit number of videos for processing
      const videosToProcess = ingestionResult.videos.slice(0, opts.maxVideos);
      result.videosProcessed = videosToProcess.length;
      
      console.log(`📊 Processing ${videosToProcess.length} videos...`);
      
      // Step 3: Process videos (download, transcribe, store) in parallel
      console.log(`🚀 Processing ${videosToProcess.length} videos in parallel (max concurrent: ${opts.maxConcurrentDownloads})...`);
      
      // Process videos in parallel with controlled concurrency
      const processResults = await this.processVideosInParallel(videosToProcess, opts);
      
             // Aggregate results
       result.videosCompleted = processResults.filter((r: VideoProcessingResult) => r.success).length;
       result.videosFailed = processResults.filter((r: VideoProcessingResult) => !r.success).length;
       result.completedVideos = processResults
         .filter((r: VideoProcessingResult) => r.success)
         .map((r: VideoProcessingResult) => ({
           videoId: r.videoId,
           title: r.title || 'Unknown Title',
           transcriptLength: r.transcriptLength || 0
         }));
       result.errors = processResults
         .filter((r: VideoProcessingResult) => !r.success)
         .map((r: VideoProcessingResult) => ({
           videoId: r.videoId,
           stage: r.stage || 'download',
           error: r.error || 'Unknown error'
         }));
      
      // Step 4: Generate summary
      console.log('\n📊 Pipeline Summary:');
      console.log(`✅ Videos completed: ${result.videosCompleted}`);
      console.log(`❌ Videos failed: ${result.videosFailed}`);
      console.log(`📝 Total videos processed: ${result.videosProcessed}`);
      
      const stats = await videoKBStore.getStats();
      console.log(`📈 Total videos in KB: ${stats.totalVideos}`);
      console.log(`📄 Total transcript length: ${stats.totalTranscriptLength} characters`);
      
      result.success = result.videosCompleted > 0;
      
      return result;
      
    } catch (error) {
      console.error('🔥 Pipeline failed:', error);
      result.errors.push({
        videoId: 'pipeline',
        stage: 'ingestion',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return result;
    }
  }

  /**
   * Store initial video entry in the database
   */
  private async storeInitialVideoEntry(video: YouTubeVideo): Promise<void> {
    const entry: Omit<VideoKBEntry, '_id' | 'createdAt' | 'updatedAt' | 'version'> = {
      videoId: video.videoId,
      title: video.title,
      description: video.description,
      url: video.url,
      channelTitle: video.channelTitle,
      publishDate: video.publishDate,
      duration: video.duration,
      viewCount: video.viewCount,
      thumbnail: video.thumbnail,
      tags: video.tags,
      
      // Transcription data (empty initially)
      transcript: '',
      
      // Processing metadata
      processedAt: new Date(),
      processingStatus: 'pending',
      
      // Knowledge base metadata
      source: 'youtube',
      sourceChannel: video.channelTitle,
      sourceChannelId: 'UCi8jM5w49UezskDWBGyKq5g', // Greg Judy's channel ID
      category: 'regenerative-agriculture'
    };

    try {
      await videoKBStore.storeVideoKB(entry);
    } catch (error) {
      // If video already exists, update it
      if (error instanceof Error && error.message.includes('duplicate key')) {
        await videoKBStore.updateVideoKB(video.videoId, {
          processingStatus: 'pending',
          processedAt: new Date()
        });
      } else {
        throw error;
      }
    }
  }

  /**
   * Store complete video entry with transcription
   */
  private async storeCompleteVideoEntry(video: YouTubeVideo, transcription: TranscriptionResult): Promise<void> {
    const update: Partial<VideoKBEntry> = {
      transcript: transcription.text,
      transcriptionLanguage: transcription.language,
      transcriptionDuration: transcription.duration,
      transcriptionConfidence: transcription.confidence,
      transcriptionSegments: transcription.segments,
      processingStatus: 'completed',
      processedAt: new Date(),
      keywords: this.extractKeywords(transcription.text)
    };

    await videoKBStore.updateVideoKB(video.videoId, update);
  }

  /**
   * Extract keywords from transcript for better searchability
   */
  private extractKeywords(transcript: string): string[] {
    const farmingKeywords = [
      'grazing', 'pasture', 'livestock', 'cattle', 'sheep', 'paddock',
      'rotational', 'mob', 'forage', 'grass', 'fence', 'water',
      'breeding', 'health', 'nutrition', 'soil', 'regenerative',
      'sustainable', 'organic', 'ranch', 'farm', 'herd', 'flock'
    ];

    const words = transcript.toLowerCase().split(/\s+/);
    const foundKeywords = farmingKeywords.filter(keyword => 
      words.some(word => word.includes(keyword))
    );

    return Array.from(new Set(foundKeywords)); // Remove duplicates
  }

  /**
   * Process multiple videos in parallel with controlled concurrency
   */
  private async processVideosInParallel(
    videos: YouTubeVideo[], 
    options: PipelineOptions
  ): Promise<VideoProcessingResult[]> {
    const maxConcurrent = options.maxConcurrentDownloads || 2;
    const results: VideoProcessingResult[] = [];
    
    // Create a semaphore to limit concurrent operations
    const semaphore = new Array(maxConcurrent).fill(Promise.resolve());
    let semaphoreIndex = 0;

    const processVideo = async (video: YouTubeVideo): Promise<VideoProcessingResult> => {
      const videoId = video.videoId;
      
      try {
        console.log(`\n🎬 Processing video: ${videoId} - ${video.title}`);
        
        // Check if video already exists and skip if requested
        if (options.skipExisting) {
          const existingVideo = await videoKBStore.getVideoKB(videoId);
          if (existingVideo && existingVideo.processingStatus === 'completed') {
            console.log(`⏭️  Skipping existing video: ${videoId}`);
            return {
              videoId,
              success: true,
              title: video.title,
              transcriptLength: existingVideo.transcript?.length || 0
            };
          }
        }
        
        // Store initial video entry
        await this.storeInitialVideoEntry(video);
        
        // Download audio
        console.log(`🎵 Downloading audio for: ${videoId}`);
        await videoKBStore.updateVideoKB(videoId, {
          processingStatus: 'downloading',
          audioDownloadedAt: new Date()
        });
        
        const audioResult = await youtubeAudioDownloader.downloadAudio(video.url, videoId);
        
        // Transcribe audio
        console.log(`🎙️  Transcribing audio for: ${videoId}`);
        await videoKBStore.updateVideoKB(videoId, {
          processingStatus: 'transcribing',
          transcribedAt: new Date()
        });
        
        const transcriptionResult = await whisperTranscriber.transcribeWithFarmingContext(audioResult.audioPath);
        
        // Store complete video entry
        await this.storeCompleteVideoEntry(video, transcriptionResult);
        
        // Cleanup audio file
        await audioResult.cleanup();
        
        console.log(`✅ Completed video: ${videoId}`);
        
        return {
          videoId,
          success: true,
          title: video.title,
          transcriptLength: transcriptionResult.text.length
        };
        
      } catch (error) {
        console.error(`❌ Failed to process video ${videoId}:`, error);
        
        // Update video status to failed
        await videoKBStore.updateVideoKB(videoId, {
          processingStatus: 'failed',
          processingErrors: [error instanceof Error ? error.message : 'Unknown error']
        }).catch(console.warn); // Don't fail if this fails
        
        return {
          videoId,
          success: false,
          stage: 'download' as const, // Could be more specific based on where it failed
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    };

         // Process videos with controlled concurrency and staggered starts
     const videoPromises = videos.map(async (video, index) => {
       // Wait for an available slot in the semaphore
       const currentIndex = semaphoreIndex % maxConcurrent;
       semaphoreIndex++;
       
       await semaphore[currentIndex];
       
       // Add staggered delay to avoid hitting API limits
       if (index > 0) {
         const staggerDelay = 2000 + (index * 1000); // 2s base + 1s per video
         console.log(`⏱️  Staggering video ${video.videoId} start by ${staggerDelay}ms`);
         await new Promise(resolve => setTimeout(resolve, staggerDelay));
       }
       
       // Process the video and update the semaphore
       const promise = processVideo(video);
       semaphore[currentIndex] = promise.catch(() => {}); // Don't propagate errors in semaphore
       
       return promise;
     });

    // Wait for all videos to complete
    const allResults = await Promise.allSettled(videoPromises);
    
    // Extract results from Promise.allSettled
    allResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // Handle unexpected promise rejection
        results.push({
          videoId: videos[index].videoId,
          success: false,
                     stage: 'download' as const,
          error: result.reason instanceof Error ? result.reason.message : 'Unexpected error'
        });
      }
    });

    return results;
  }

  /**
   * Get pipeline statistics
   */
  async getStats(): Promise<VideoKBStats> {
    await videoKBStore.initialize();
    return videoKBStore.getStats();
  }

  /**
   * Search transcribed videos
   */
  async searchVideos(query: string, limit: number = 10): Promise<VideoKBEntry[]> {
    await videoKBStore.initialize();
    return videoKBStore.searchVideos(query, limit);
  }
}

// Export singleton instance
export const videoTranscriptionPipeline = new VideoTranscriptionPipeline();

// Export types for convenience
export type { VideoKBStats, VideoKBEntry } from './video-kb-store'; 