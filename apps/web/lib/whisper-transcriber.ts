import { createReadStream } from 'fs';
import { promises as fs } from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  confidence: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  temperature?: number;
  responseFormat?: 'json' | 'text' | 'verbose_json';
  maxRetries?: number;
  retryDelay?: number;
}

export class WhisperTranscriber {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1';
  private maxFileSize: number = 25 * 1024 * 1024; // 25MB limit for OpenAI
  private defaultMaxRetries: number = 3;
  private defaultRetryDelay: number = 2000; // 2 seconds

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
  }

  /**
   * Check if file size is within limits
   */
  private async checkFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      throw new Error(`Failed to check file size: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Split large audio file into chunks using FFmpeg
   */
  private async splitAudioFile(filePath: string, chunkDurationSeconds: number = 300): Promise<string[]> {
    const tempDir = path.join(os.tmpdir(), 'whisper-chunks');
    await fs.mkdir(tempDir, { recursive: true });

    const baseFileName = path.basename(filePath, path.extname(filePath));
    const outputPattern = path.join(tempDir, `${baseFileName}_chunk_%03d.mp3`);

    return new Promise((resolve, reject) => {
      const ffmpegArgs = [
        '-i', filePath,
        '-f', 'segment',
        '-segment_time', chunkDurationSeconds.toString(),
        '-c', 'copy',
        outputPattern
      ];

      console.log(`Splitting audio file into ${chunkDurationSeconds}s chunks...`);
      const child = spawn('ffmpeg', ffmpegArgs, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stderr = '';
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', async (code) => {
        if (code === 0) {
          try {
            // Find all chunk files
            const files = await fs.readdir(tempDir);
            const chunkFiles = files
              .filter(f => f.startsWith(`${baseFileName}_chunk_`) && f.endsWith('.mp3'))
              .sort()
              .map(f => path.join(tempDir, f));

            console.log(`Created ${chunkFiles.length} audio chunks`);
            resolve(chunkFiles);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Clean up chunk files
   */
  private async cleanupChunks(chunkFiles: string[]): Promise<void> {
    await Promise.all(chunkFiles.map(async (file) => {
      try {
        await fs.unlink(file);
        console.log(`Cleaned up chunk: ${path.basename(file)}`);
      } catch (error) {
        console.warn(`Failed to cleanup chunk ${file}:`, error);
      }
    }));
  }

  /**
   * Retry with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = this.defaultMaxRetries,
    baseDelay: number = this.defaultRetryDelay
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on non-retryable errors
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();
          // Don't retry on authentication, file size, or other permanent errors
          if (errorMessage.includes('unauthorized') || 
              errorMessage.includes('invalid') || 
              errorMessage.includes('too large') ||
              errorMessage.includes('unsupported')) {
            throw error;
          }
        }
        
        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`⚠️  Transcription attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`);
        console.log(`Error: ${lastError.message.substring(0, 200)}...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Transcribe audio file using OpenAI API with retry logic
   */
  async transcribeAudio(
    filePath: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    try {
      // Check file size
      const fileSize = await this.checkFileSize(filePath);
      console.log(`Audio file size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

      if (fileSize > this.maxFileSize) {
        console.log(`File too large (${(fileSize / 1024 / 1024).toFixed(2)} MB), chunking...`);
        return await this.transcribeAudioChunks(filePath, options);
      }

      // Direct transcription for small files with retry logic
      const maxRetries = options.maxRetries ?? this.defaultMaxRetries;
      const retryDelay = options.retryDelay ?? this.defaultRetryDelay;
      
      return await this.retryWithBackoff(
        () => this.transcribeAudioDirect(filePath, options),
        maxRetries,
        retryDelay
      );

    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transcribe audio file directly (for small files)
   */
  private async transcribeAudioDirect(
    filePath: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('file', createReadStream(filePath));
    formData.append('model', 'whisper-1');
    formData.append('language', options.language || 'en');
    formData.append('response_format', options.responseFormat || 'verbose_json');
    formData.append('temperature', (options.temperature || 0.1).toString());

    if (options.prompt) {
      formData.append('prompt', options.prompt);
    }

    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}\n\n${errorText}`);
    }

    const result = await response.json() as any;
    
    return {
      text: result.text || '',
      language: result.language || 'en',
      duration: result.duration || 0,
      confidence: 1.0, // OpenAI doesn't provide confidence scores
      segments: result.segments || []
    };
  }

  /**
   * Transcribe large audio file by splitting into chunks
   */
  private async transcribeAudioChunks(
    filePath: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    let chunkFiles: string[] = [];
    
    try {
      // Split audio into chunks
      chunkFiles = await this.splitAudioFile(filePath, 240); // 4-minute chunks
      
      const transcriptionPromises = chunkFiles.map(async (chunkFile, index) => {
        console.log(`Transcribing chunk ${index + 1}/${chunkFiles.length}: ${path.basename(chunkFile)}`);
        
        // Add slight delay between API calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, index * 1000));
        
        const chunkResult = await this.retryWithBackoff(
          () => this.transcribeAudioDirect(chunkFile, options),
          options.maxRetries ?? this.defaultMaxRetries,
          options.retryDelay ?? this.defaultRetryDelay
        );
        return {
          ...chunkResult,
          chunkIndex: index
        };
      });

      // Wait for all chunks to be transcribed
      const chunkResults = await Promise.all(transcriptionPromises);
      
      // Combine results
      const combinedText = chunkResults
        .sort((a, b) => a.chunkIndex - b.chunkIndex)
        .map(result => result.text)
        .join(' ');

      const totalDuration = chunkResults.reduce((sum, result) => sum + result.duration, 0);
      const avgConfidence = chunkResults.reduce((sum, result) => sum + result.confidence, 0) / chunkResults.length;

      // Combine segments with time offset
      let timeOffset = 0;
      const combinedSegments: Array<{start: number; end: number; text: string}> = [];
      
      for (const result of chunkResults.sort((a, b) => a.chunkIndex - b.chunkIndex)) {
        if (result.segments) {
          result.segments.forEach(segment => {
            combinedSegments.push({
              start: segment.start + timeOffset,
              end: segment.end + timeOffset,
              text: segment.text
            });
          });
          timeOffset += result.duration;
        }
      }

      return {
        text: combinedText,
        language: chunkResults[0]?.language || 'en',
        duration: totalDuration,
        confidence: avgConfidence,
        segments: combinedSegments
      };

    } finally {
      // Clean up chunk files
      if (chunkFiles.length > 0) {
        await this.cleanupChunks(chunkFiles);
      }
    }
  }

  /**
   * Transcribe audio with farming-specific context and enhanced retry settings
   */
  async transcribeWithFarmingContext(filePath: string): Promise<TranscriptionResult> {
    const farmingPrompt = `This is a video about farming, specifically rotational grazing, livestock management, and sustainable agriculture. The speaker discusses topics like pasture management, cattle, sheep, mobile fencing, water systems, and regenerative farming practices. Please transcribe accurately with focus on farming terminology.`;

    return await this.transcribeAudio(filePath, {
      prompt: farmingPrompt,
      language: 'en',
      temperature: 0.1,
      responseFormat: 'verbose_json',
      maxRetries: 4, // Extra retries for farming context (longer videos)
      retryDelay: 3000 // Slightly longer delay for better API stability
    });
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
      'ar', 'hi', 'tr', 'pl', 'nl', 'sv', 'da', 'no', 'fi'
    ];
  }
}

// Export singleton instance
export const whisperTranscriber = new WhisperTranscriber(); 