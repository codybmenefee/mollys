import { google } from 'googleapis';
import { youtube_v3 } from 'googleapis';

// Types for our YouTube video data
export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  url: string;
  publishDate: string;
  duration: string;
  viewCount: number;
  thumbnail: string;
  channelTitle: string;
  tags: string[];
  // Note: transcript will be generated using Whisper during processing
}

export interface YouTubeIngestionError {
  videoId: string;
  error: string;
}

export interface YouTubeIngestionResult {
  success: boolean;
  videos: YouTubeVideo[];
  errors: YouTubeIngestionError[];
  totalFetched: number;
}

export class YouTubeKBIngest {
  private youtube: youtube_v3.Youtube | null = null;
  private readonly channelId = 'UCi8jM5w49UezskDWBGyKq5g'; // Greg Judy's channel ID
  private readonly maxResults = 50;

  constructor() {
    // Initialize lazily to avoid build-time errors
  }

  private initializeYouTubeClient(): youtube_v3.Youtube {
    if (!this.youtube) {
      const apiKey = process.env.YOUTUBE_API_KEY;
      
      if (!apiKey) {
        throw new Error('YOUTUBE_API_KEY environment variable is required');
      }

      this.youtube = google.youtube({
        version: 'v3',
        auth: apiKey,
      });
    }
    return this.youtube;
  }

  async ingestGregJudyVideos(): Promise<YouTubeIngestionResult> {
    try {
      console.log('Starting YouTube ingestion for Greg Judy channel...');
      
      // Step 1: Get the uploads playlist ID
      const uploadsPlaylistId = await this.getUploadsPlaylistId();
      console.log(`Found uploads playlist: ${uploadsPlaylistId}`);

      // Step 2: Fetch video metadata from the uploads playlist
      const videoMetadata = await this.fetchVideoMetadata(uploadsPlaylistId);
      console.log(`Fetched ${videoMetadata.length} videos metadata`);

      // Step 3: Get detailed video information
      const videos: YouTubeVideo[] = [];
      const errors: YouTubeIngestionError[] = [];

      for (const video of videoMetadata) {
        try {
          const detailedVideo = await this.getDetailedVideoInfo(video.videoId);
          if (detailedVideo) {
            videos.push(detailedVideo);
            console.log(`✓ Processed video: ${detailedVideo.title}`);
          }
        } catch (error) {
          console.error(`Error processing video ${video.videoId}:`, error);
          errors.push({
            videoId: video.videoId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      console.log(`Successfully processed ${videos.length} videos with ${errors.length} errors`);

      return {
        success: true,
        videos,
        errors,
        totalFetched: videoMetadata.length,
      };
    } catch (error) {
      console.error('YouTube ingestion failed:', error);
      return {
        success: false,
        videos: [],
        errors: [{
          videoId: 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
        }],
        totalFetched: 0,
      };
    }
  }

  private async getUploadsPlaylistId(): Promise<string> {
    try {
      const youtube = this.initializeYouTubeClient();
      const response = await youtube.channels.list({
        part: ['contentDetails'],
        id: [this.channelId],
      });

      const channel = response.data.items?.[0];
      if (!channel?.contentDetails?.relatedPlaylists?.uploads) {
        throw new Error('Could not find uploads playlist for channel');
      }

      return channel.contentDetails.relatedPlaylists.uploads;
    } catch (error) {
      console.error('Error getting uploads playlist ID:', error);
      throw new Error('Failed to get uploads playlist ID');
    }
  }

  private async fetchVideoMetadata(playlistId: string): Promise<Array<{
    videoId: string;
    title: string;
    publishDate: string;
  }>> {
    try {
      const youtube = this.initializeYouTubeClient();
      const response = await youtube.playlistItems.list({
        part: ['snippet'],
        playlistId,
        maxResults: this.maxResults,
      });

      const items = response.data.items || [];
      
      return items.map(item => ({
        videoId: item.snippet?.resourceId?.videoId || '',
        title: item.snippet?.title || 'Unknown Title',
        publishDate: item.snippet?.publishedAt || new Date().toISOString(),
      })).filter(video => video.videoId); // Filter out any items without videoId
    } catch (error) {
      console.error('Error fetching video metadata:', error);
      throw new Error('Failed to fetch video metadata');
    }
  }

  private async getDetailedVideoInfo(videoId: string): Promise<YouTubeVideo | null> {
    try {
      const youtube = this.initializeYouTubeClient();
      
      const response = await youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: [videoId],
      });

      const video = response.data.items?.[0];
      if (!video) {
        console.log(`No video found for ID: ${videoId}`);
        return null;
      }

      const snippet = video.snippet;
      const statistics = video.statistics;
      const contentDetails = video.contentDetails;

      return {
        videoId,
        title: snippet?.title || 'Unknown Title',
        description: snippet?.description || '',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        publishDate: snippet?.publishedAt || new Date().toISOString(),
        duration: contentDetails?.duration || 'PT0S',
        viewCount: parseInt(statistics?.viewCount || '0', 10),
        thumbnail: snippet?.thumbnails?.high?.url || snippet?.thumbnails?.default?.url || '',
        channelTitle: snippet?.channelTitle || 'Unknown Channel',
        tags: snippet?.tags || [],
      };
    } catch (error) {
      console.error(`Error getting detailed video info for ${videoId}:`, error);
      throw error;
    }
  }

  // Helper method to parse YouTube duration format (PT4M13S) to seconds
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    
    return hours * 3600 + minutes * 60 + seconds;
  }
}

// Export singleton instance
export const youtubeKBIngest = new YouTubeKBIngest();