import { videoKBStore, VideoKBEntry } from './video-kb-store';
import { youtubeAudioDownloader } from './youtube-audio-downloader';
import { whisperTranscriber } from './whisper-transcriber';
import { YouTubeVideo } from './youtube-kb-ingest';

export interface BatchJob {
  id: string;
  videoId: string;
  video: YouTubeVideo;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'retrying';
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  maxAttempts: number;
  error?: string;
  result?: {
    transcriptLength: number;
    processingTimeMs: number;
  };
}

export interface BatchProcessorOptions {
  maxConcurrentJobs: number;
  minDelayBetweenJobs: number; // ms
  maxRetries: number;
  retryDelayBase: number; // ms
  offPeakHours?: { start: number; end: number }; // 24-hour format
  enableOffPeakMode?: boolean;
}

export class VideoBatchProcessor {
  private jobs: Map<string, BatchJob> = new Map();
  private processingQueue: BatchJob[] = [];
  private activeJobs: Set<string> = new Set();
  private options: BatchProcessorOptions;
  private isRunning: boolean = false;
  private processInterval?: NodeJS.Timeout;

  constructor(options: Partial<BatchProcessorOptions> = {}) {
    this.options = {
      maxConcurrentJobs: 1, // Conservative for API limits
      minDelayBetweenJobs: 5000, // 5 seconds between jobs
      maxRetries: 3,
      retryDelayBase: 10000, // 10 seconds base retry delay
      offPeakHours: { start: 2, end: 6 }, // 2 AM - 6 AM
      enableOffPeakMode: false,
      ...options
    };
  }

  /**
   * Add a video to the processing queue
   */
  addJob(video: YouTubeVideo, priority: number = 0): string {
    const jobId = `job_${video.videoId}_${Date.now()}`;
    
    const job: BatchJob = {
      id: jobId,
      videoId: video.videoId,
      video,
      status: 'queued',
      priority,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: this.options.maxRetries
    };

    this.jobs.set(jobId, job);
    this.addToQueue(job);
    
    console.log(`📝 Added job ${jobId} for video ${video.videoId} to batch queue`);
    return jobId;
  }

  /**
   * Add multiple videos as a batch
   */
  addBatch(videos: YouTubeVideo[], priority: number = 0): string[] {
    const jobIds = videos.map(video => this.addJob(video, priority));
    console.log(`📦 Added batch of ${videos.length} videos to queue`);
    return jobIds;
  }

  /**
   * Start the batch processor
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️  Batch processor is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting video batch processor...');
    
    // Process queue every 1 second
    this.processInterval = setInterval(() => {
      this.processQueue();
    }, 1000);
  }

  /**
   * Stop the batch processor
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = undefined;
    }
    
    console.log('⏹️  Stopped video batch processor');
  }

  /**
   * Get queue status
   */
  getStatus() {
    const statusCounts = {
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      retrying: 0
    };

    Array.from(this.jobs.values()).forEach(job => {
      statusCounts[job.status as keyof typeof statusCounts]++;
    });

    return {
      totalJobs: this.jobs.size,
      queueLength: this.processingQueue.length,
      activeJobs: this.activeJobs.size,
      statusCounts,
      isRunning: this.isRunning,
      nextJobETA: this.getNextJobETA()
    };
  }

  /**
   * Get jobs by status
   */
  getJobs(status?: BatchJob['status']): BatchJob[] {
    const allJobs = Array.from(this.jobs.values());
    return status ? allJobs.filter(job => job.status === status) : allJobs;
  }

  /**
   * Add job to queue with priority sorting
   */
  private addToQueue(job: BatchJob): void {
    this.processingQueue.push(job);
    // Sort by priority (higher first), then by creation time (older first)
    this.processingQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Check if we can process more jobs
    if (this.activeJobs.size >= this.options.maxConcurrentJobs) {
      return;
    }

    // Check off-peak hours if enabled
    if (this.options.enableOffPeakMode && !this.isOffPeakHours()) {
      return;
    }

    // Get next job from queue
    const nextJob = this.processingQueue.find(job => 
      job.status === 'queued' && !this.activeJobs.has(job.id)
    );

    if (!nextJob) {
      return;
    }

    // Remove from queue and start processing
    this.processingQueue = this.processingQueue.filter(job => job.id !== nextJob.id);
    await this.processJob(nextJob);
  }

  /**
   * Process a single job
   */
  private async processJob(job: BatchJob): Promise<void> {
    this.activeJobs.add(job.id);
    job.status = 'processing';
    job.startedAt = new Date();
    job.attempts++;

    console.log(`🎬 Processing job ${job.id} for video ${job.videoId} (attempt ${job.attempts})`);

    try {
      // Initialize store
      await videoKBStore.initialize();

      // Check if video already exists
      const existingVideo = await videoKBStore.getVideoKB(job.videoId);
      if (existingVideo && existingVideo.processingStatus === 'completed') {
        console.log(`⏭️  Video ${job.videoId} already completed, skipping`);
        this.completeJob(job, { transcriptLength: existingVideo.transcript?.length || 0, processingTimeMs: 0 });
        return;
      }

      // Store initial video entry
      await this.storeInitialVideoEntry(job.video);

      // Download audio
      console.log(`🎵 Downloading audio for: ${job.videoId}`);
      await videoKBStore.updateVideoKB(job.videoId, {
        processingStatus: 'downloading',
        audioDownloadedAt: new Date()
      });

      const audioResult = await youtubeAudioDownloader.downloadAudio(job.video.url, job.videoId);

      // Wait for minimum delay before transcription
      await this.waitForMinDelay(job);

      // Transcribe audio
      console.log(`🎙️  Transcribing audio for: ${job.videoId}`);
      await videoKBStore.updateVideoKB(job.videoId, {
        processingStatus: 'transcribing',
        transcribedAt: new Date()
      });

      const startTime = Date.now();
      const transcriptionResult = await whisperTranscriber.transcribeWithFarmingContext(audioResult.audioPath);
      const processingTimeMs = Date.now() - startTime;

      // Store complete video entry
      await this.storeCompleteVideoEntry(job.video, transcriptionResult);

      // Cleanup audio file
      await audioResult.cleanup();

      // Mark job as completed
      this.completeJob(job, {
        transcriptLength: transcriptionResult.text.length,
        processingTimeMs
      });

      console.log(`✅ Completed job ${job.id} for video ${job.videoId} in ${processingTimeMs}ms`);

    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error);
      await this.handleJobError(job, error as Error);
    } finally {
      this.activeJobs.delete(job.id);
    }
  }

  /**
   * Handle job completion
   */
  private completeJob(job: BatchJob, result: { transcriptLength: number; processingTimeMs: number }): void {
    job.status = 'completed';
    job.completedAt = new Date();
    job.result = result;
    job.error = undefined;
  }

  /**
   * Handle job error with retry logic
   */
  private async handleJobError(job: BatchJob, error: Error): Promise<void> {
    job.error = error.message;

    // Update video status to failed
    await videoKBStore.updateVideoKB(job.videoId, {
      processingStatus: 'failed',
      processingErrors: [error.message]
    }).catch(console.warn);

    // Check if we should retry
    if (job.attempts < job.maxAttempts) {
      job.status = 'retrying';
      
      // Calculate retry delay with exponential backoff
      const retryDelay = this.options.retryDelayBase * Math.pow(2, job.attempts - 1);
      
      console.log(`🔄 Retrying job ${job.id} in ${retryDelay}ms (attempt ${job.attempts + 1}/${job.maxAttempts})`);
      
      // Schedule retry
      setTimeout(() => {
        if (this.isRunning) {
          job.status = 'queued';
          this.addToQueue(job);
        }
      }, retryDelay);
    } else {
      job.status = 'failed';
      job.completedAt = new Date();
      console.error(`💥 Job ${job.id} failed permanently after ${job.attempts} attempts`);
    }
  }

  /**
   * Wait for minimum delay between jobs
   */
  private async waitForMinDelay(job: BatchJob): Promise<void> {
    const timeSinceStart = job.startedAt ? Date.now() - job.startedAt.getTime() : 0;
    const remainingDelay = Math.max(0, this.options.minDelayBetweenJobs - timeSinceStart);
    
    if (remainingDelay > 0) {
      console.log(`⏱️  Waiting ${remainingDelay}ms before transcription for API rate limiting`);
      await new Promise(resolve => setTimeout(resolve, remainingDelay));
    }
  }

  /**
   * Check if current time is in off-peak hours
   */
  private isOffPeakHours(): boolean {
    if (!this.options.offPeakHours) {
      return true;
    }

    const now = new Date();
    const hour = now.getHours();
    const { start, end } = this.options.offPeakHours;
    
    if (start <= end) {
      return hour >= start && hour < end;
    } else {
      // Handle overnight range (e.g., 22-6)
      return hour >= start || hour < end;
    }
  }

  /**
   * Get ETA for next job
   */
  private getNextJobETA(): string | null {
    if (this.processingQueue.length === 0) {
      return null;
    }

    const avgProcessingTime = this.getAverageProcessingTime();
    const queuePosition = this.processingQueue.findIndex(job => job.status === 'queued');
    
    if (queuePosition === -1) {
      return null;
    }

    const estimatedMs = queuePosition * (avgProcessingTime + this.options.minDelayBetweenJobs);
    const estimatedMinutes = Math.ceil(estimatedMs / 60000);
    
    return `~${estimatedMinutes} minutes`;
  }

  /**
   * Get average processing time from completed jobs
   */
  private getAverageProcessingTime(): number {
    const completedJobs = Array.from(this.jobs.values()).filter(job => 
      job.status === 'completed' && job.result
    );

    if (completedJobs.length === 0) {
      return 60000; // Default 1 minute estimate
    }

    const totalTime = completedJobs.reduce((sum, job) => sum + (job.result?.processingTimeMs || 0), 0);
    return totalTime / completedJobs.length;
  }

  /**
   * Store initial video entry (same as pipeline)
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
      transcript: '',
      processedAt: new Date(),
      processingStatus: 'pending',
      source: 'youtube',
      sourceChannel: video.channelTitle,
      sourceChannelId: 'UCi8jM5w49UezskDWBGyKq5g',
      category: 'regenerative-agriculture'
    };

    try {
      await videoKBStore.storeVideoKB(entry);
    } catch (error) {
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
   * Store complete video entry (same as pipeline)
   */
  private async storeCompleteVideoEntry(video: YouTubeVideo, transcription: any): Promise<void> {
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
   * Extract keywords (same as pipeline)
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

    return Array.from(new Set(foundKeywords));
  }
}

// Export singleton instance
export const videoBatchProcessor = new VideoBatchProcessor(); 