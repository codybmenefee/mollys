import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import os from 'os';

export interface AudioDownloadResult {
  audioPath: string;
  videoId: string;
  title: string;
  duration: number;
  cleanup: () => Promise<void>;
}

export class YouTubeAudioDownloaderDirect {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'youtube-audio-downloads');
    this.ensureTempDir();
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  /**
   * Execute yt-dlp command using child_process
   */
  private async execYtDlp(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('yt-dlp', args, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`yt-dlp failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Download audio from a YouTube video URL
   */
  async downloadAudio(videoUrl: string, videoId: string): Promise<AudioDownloadResult> {
    const audioId = randomUUID();
    const outputPath = path.join(this.tempDir, audioId);
    
    try {
      console.log(`Starting audio download for video: ${videoId}`);
      await this.ensureTempDir();
      
      // Download audio using yt-dlp
      console.log(`Executing yt-dlp for audio extraction...`);
      
      await this.execYtDlp([
        videoUrl,
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '0',
        '--output', `${outputPath}.%(ext)s`,
        '--no-playlist'
      ]);

      console.log(`yt-dlp completed, looking for downloaded file...`);

      // Find the downloaded file
      const files = await fs.readdir(this.tempDir);
      console.log(`Files in temp dir: ${files.join(', ')}`);
      
      const audioFile = files.find(f => f.startsWith(audioId) && f.endsWith('.mp3'));
      
      if (!audioFile) {
        console.error(`Available files: ${files.join(', ')}`);
        throw new Error(`Audio file not found after download for video ${videoId}`);
      }
      
      const audioPath = path.join(this.tempDir, audioFile);
      console.log(`Audio downloaded successfully: ${audioPath}`);
      
      // Get video metadata
      let title = 'Unknown Title';
      let duration = 0;
      
      try {
        console.log('Getting video metadata...');
        const output = await this.execYtDlp([
          videoUrl,
          '--print', 'title',
          '--print', 'duration'
        ]);
        
        const lines = output.trim().split('\n').filter(line => line.trim());
        if (lines.length >= 2) {
          title = lines[0] || 'Unknown Title';
          duration = parseInt(lines[1]) || 0;
        }
        
        console.log(`Video metadata: ${title} (${duration}s)`);
      } catch (infoError) {
        console.warn(`Failed to get video info for ${videoId}:`, infoError);
      }
      
      return {
        audioPath,
        videoId,
        title,
        duration,
        cleanup: async () => {
          try {
            await fs.unlink(audioPath);
            console.log(`Cleaned up audio file: ${audioPath}`);
          } catch (cleanupError) {
            console.warn(`Failed to cleanup audio file: ${cleanupError}`);
          }
        }
      };

    } catch (error) {
      console.error(`Error downloading audio for video ${videoId}:`, error);
      
      // Debug: List all files in temp directory
      try {
        const allFiles = await fs.readdir(this.tempDir);
        console.log(`Debug - All files in ${this.tempDir}: ${allFiles.join(', ')}`);
      } catch (debugError) {
        console.log('Debug - Could not list temp directory files');
      }
      
      throw new Error(`Failed to download audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download audio from multiple YouTube videos
   */
  async downloadMultipleAudios(videos: Array<{url: string; videoId: string}>): Promise<AudioDownloadResult[]> {
    const results: AudioDownloadResult[] = [];
    
    for (const video of videos) {
      try {
        const result = await this.downloadAudio(video.url, video.videoId);
        results.push(result);
        console.log(`✓ Downloaded audio for ${video.videoId}`);
      } catch (error) {
        console.error(`✗ Failed to download audio for ${video.videoId}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Cleanup all temporary files
   */
  async cleanupAll(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      await Promise.all(files.map(file => 
        fs.unlink(path.join(this.tempDir, file)).catch(console.warn)
      ));
    } catch (error) {
      console.warn('Failed to cleanup temp directory:', error);
    }
  }
}

// Export singleton instance
export const youtubeAudioDownloaderDirect = new YouTubeAudioDownloaderDirect(); 