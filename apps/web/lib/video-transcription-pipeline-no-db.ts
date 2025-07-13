import { youtubeKBIngest, YouTubeVideo } from './youtube-kb-ingest';
import { youtubeAudioDownloaderDirect, AudioDownloadResult } from './youtube-audio-downloader-direct';
import { whisperTranscriber, TranscriptionResult } from './whisper-transcriber';
import { promises as fs } from 'fs';
import path from 'path';

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
    transcriptPreview: string;
  }>;
  outputFile?: string;
}

export interface PipelineOptions {
  maxVideos?: number;
  skipExisting?: boolean;
  outputDir?: string;
}

export class VideoTranscriptionPipelineNoDb {
  private readonly defaultOptions: PipelineOptions = {
    maxVideos: 3, // Start small for testing
    skipExisting: true,
    outputDir: './pipeline-output'
  };

  /**
   * Run the complete video transcription pipeline without MongoDB
   * @param options Pipeline configuration options
   * @returns Promise<PipelineResult>
   */
  async runPipeline(options: PipelineOptions = {}): Promise<PipelineResult> {
    const opts = { ...this.defaultOptions, ...options };
    
    console.log('🚀 Starting video transcription pipeline (No MongoDB)...');
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
      // Ensure output directory exists
      await fs.mkdir(opts.outputDir!, { recursive: true });
      
      // Step 1: Ingest YouTube videos
      console.log('📺 Ingesting YouTube videos...');
      const ingestionResult = await youtubeKBIngest.ingestGregJudyVideos();
      
      if (!ingestionResult.success) {
        throw new Error('YouTube ingestion failed');
      }
      
      // Limit number of videos for processing
      const videosToProcess = ingestionResult.videos.slice(0, opts.maxVideos);
      result.videosProcessed = videosToProcess.length;
      
      console.log(`📊 Processing ${videosToProcess.length} videos...`);
      
      const processedVideos: any[] = [];
      
      // Step 2: Process videos (download, transcribe)
      for (const video of videosToProcess) {
        try {
          console.log(`\n🎬 Processing video: ${video.videoId} - ${video.title}`);
          
          // Check if already processed (if file exists)
          const outputFile = path.join(opts.outputDir!, `${video.videoId}.json`);
          if (opts.skipExisting && await this.fileExists(outputFile)) {
            console.log(`⏭️  Skipping existing video: ${video.videoId}`);
            const existingData = JSON.parse(await fs.readFile(outputFile, 'utf8'));
            result.completedVideos.push({
              videoId: video.videoId,
              title: video.title,
              transcriptLength: existingData.transcript?.length || 0,
              transcriptPreview: existingData.transcript?.substring(0, 200) + '...' || ''
            });
            result.videosCompleted++;
            continue;
          }
          
          // Download audio
          console.log(`🎵 Downloading audio for: ${video.videoId}`);
          const audioResult = await youtubeAudioDownloaderDirect.downloadAudio(video.url, video.videoId);
          
          // Transcribe audio
          console.log(`🎙️  Transcribing audio for: ${video.videoId}`);
          const transcriptionResult = await whisperTranscriber.transcribeWithFarmingContext(audioResult.audioPath);
          
          // Create complete video entry
          const videoEntry = {
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
            
            // Transcription data
            transcript: transcriptionResult.text,
            transcriptionLanguage: transcriptionResult.language,
            transcriptionDuration: transcriptionResult.duration,
            transcriptionConfidence: transcriptionResult.confidence,
            transcriptionSegments: transcriptionResult.segments,
            
            // Processing metadata
            processedAt: new Date().toISOString(),
            processingStatus: 'completed',
            
            // Keywords
            keywords: this.extractKeywords(transcriptionResult.text)
          };
          
          // Save to file
          await fs.writeFile(outputFile, JSON.stringify(videoEntry, null, 2));
          processedVideos.push(videoEntry);
          
          // Cleanup audio file
          await audioResult.cleanup();
          
          result.videosCompleted++;
          result.completedVideos.push({
            videoId: video.videoId,
            title: video.title,
            transcriptLength: transcriptionResult.text.length,
            transcriptPreview: transcriptionResult.text.substring(0, 200) + '...'
          });
          
          console.log(`✅ Completed video: ${video.videoId}`);
          
        } catch (error) {
          console.error(`❌ Failed to process video ${video.videoId}:`, error);
          
          result.videosFailed++;
          result.errors.push({
            videoId: video.videoId,
            stage: 'download', // This could be more specific
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      // Save summary file
      const summaryFile = path.join(opts.outputDir!, 'summary.json');
      const summary = {
        pipelineRun: new Date().toISOString(),
        videosProcessed: result.videosProcessed,
        videosCompleted: result.videosCompleted,
        videosFailed: result.videosFailed,
        errors: result.errors,
        completedVideos: result.completedVideos,
        processedVideos
      };
      
      await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
      result.outputFile = summaryFile;
      
      // Step 3: Generate summary
      console.log('\n📊 Pipeline Summary:');
      console.log(`✅ Videos completed: ${result.videosCompleted}`);
      console.log(`❌ Videos failed: ${result.videosFailed}`);
      console.log(`📝 Total videos processed: ${result.videosProcessed}`);
      console.log(`📁 Output directory: ${opts.outputDir}`);
      console.log(`📄 Summary file: ${summaryFile}`);
      
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
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const videoTranscriptionPipelineNoDb = new VideoTranscriptionPipelineNoDb(); 