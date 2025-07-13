import * as YTDlpWrapModule from 'yt-dlp-wrap';
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

export class YouTubeAudioDownloader {
  private ytDlp: any;
  private tempDir: string;

  constructor() {
    const YTDlpWrap = (YTDlpWrapModule as any).default || YTDlpWrapModule;
    this.ytDlp = new YTDlpWrap();
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
   * Download audio from a YouTube video URL
   * @param videoUrl - The YouTube video URL
   * @param videoId - The video ID for naming
   * @returns Promise<AudioDownloadResult>
   */
  async downloadAudio(videoUrl: string, videoId: string): Promise<AudioDownloadResult> {
    const audioId = randomUUID();
    const outputTemplate = path.join(this.tempDir, `${audioId}-%(title)s`);
    
    try {
      console.log(`Starting audio download for video: ${videoId}`);
      await this.ensureTempDir(); // Ensure directory exists
      
      // Download audio using yt-dlp
      console.log(`yt-dlp command: extract-audio from ${videoUrl}`);
      
      const result = await this.ytDlp.exec([
        videoUrl,
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '0', // Best quality
        '--output', `${outputTemplate}.%(ext)s`,
        '--no-playlist',
        '--quiet'
      ]);

      console.log(`yt-dlp completed, looking for downloaded file...`);

      // Find the downloaded file
      const files = await fs.readdir(this.tempDir);
      console.log(`Files in temp dir: ${files.join(', ')}`);
      
      // Look for the file with our UUID prefix
      const audioFile = files.find(f => f.startsWith(audioId) && f.endsWith('.mp3'));
      
      if (!audioFile) {
        // Try alternative naming patterns - look for any mp3 file that contains the videoId
        const alternativeFile = files.find(f => f.includes(videoId) && f.endsWith('.mp3'));
        if (alternativeFile) {
          console.log(`Found alternative file: ${alternativeFile}`);
        } else {
          // Look for any new mp3 files
          const mp3Files = files.filter(f => f.endsWith('.mp3'));
          console.log(`Available MP3 files: ${mp3Files.join(', ')}`);
          
          if (mp3Files.length > 0) {
            // Use the most recently created file
            const stats = await Promise.all(mp3Files.map(async (f) => {
              const filePath = path.join(this.tempDir, f);
              const stat = await fs.stat(filePath);
              return { file: f, mtime: stat.mtime };
            }));
            
            const newestFile = stats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())[0];
            console.log(`Using newest MP3 file: ${newestFile.file}`);
            
            const audioPath = path.join(this.tempDir, newestFile.file);
            
            // Get video info for title and duration
            let title = 'Unknown Title';
            let duration = 0;
            
            try {
              console.log('Getting video metadata...');
              const infoResult = await this.ytDlp.exec([
                videoUrl,
                '--print', 'title',
                '--print', 'duration',
                '--quiet'
              ]);
              
              // Parse output
              const output = infoResult.toString();
              const lines = output.trim().split('\n').filter((line: string) => line.trim());
              
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
          } else {
            console.error(`Available files: ${files.join(', ')}`);
            throw new Error(`Audio file not found after download for video ${videoId}. Expected file with prefix ${audioId}.mp3`);
          }
        }
      }
      
      const actualFile = audioFile || files.find(f => f.includes(videoId) && f.endsWith('.mp3'));
      const audioPath = path.join(this.tempDir, actualFile!);
      
      console.log(`Audio downloaded successfully: ${audioPath}`);
      
      // Get video info for title and duration
      let title = 'Unknown Title';
      let duration = 0;
      
      try {
        console.log('Getting video metadata...');
        const infoResult = await this.ytDlp.exec([
          videoUrl,
          '--print', 'title',
          '--print', 'duration',
          '--quiet'
        ]);
        
        // Parse output
        const output = infoResult.toString();
                    const lines = output.trim().split('\n').filter((line: string) => line.trim());
        
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
   * @param videos - Array of video objects with url and videoId
   * @returns Promise<AudioDownloadResult[]>
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
        // Continue with other videos even if one fails
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
export const youtubeAudioDownloader = new YouTubeAudioDownloader(); 