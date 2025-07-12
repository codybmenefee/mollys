import { google } from 'googleapis';
import { youtube_v3 } from 'googleapis';

// Types for our YouTube video data
export interface YouTubeVideo {
  videoId: string;
  title: string;
  url: string;
  transcript: string | null;
  publishDate: string;
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

      // Step 3: Process each video to get transcript
      const videos: YouTubeVideo[] = [];
      const errors: YouTubeIngestionError[] = [];

      for (const video of videoMetadata) {
        try {
          const transcript = await this.getVideoTranscript(video.videoId);
          
          videos.push({
            videoId: video.videoId,
            title: video.title,
            url: `https://www.youtube.com/watch?v=${video.videoId}`,
            transcript,
            publishDate: video.publishDate,
          });
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

  private async getVideoTranscript(videoId: string): Promise<string | null> {
    try {
      const youtube = this.initializeYouTubeClient();
      
      // Step 1: Get available captions for the video
      const captionsResponse = await youtube.captions.list({
        part: ['snippet'],
        videoId,
      });

      const captions = captionsResponse.data.items || [];
      
      // Look for auto-generated captions first, then any English captions
      const autoCaption = captions.find(caption => 
        caption.snippet?.trackKind === 'asr' && 
        caption.snippet?.language === 'en'
      );
      
      const englishCaption = captions.find(caption => 
        caption.snippet?.language === 'en'
      );

      const selectedCaption = autoCaption || englishCaption;

      if (!selectedCaption?.id) {
        console.log(`No captions available for video ${videoId}`);
        return null;
      }

      // Step 2: Download the caption
      try {
        const captionResponse = await youtube.captions.download({
          id: selectedCaption.id,
          tfmt: 'srt', // Request SRT format
        });

        // The response should contain the caption text
        if (captionResponse.data && typeof captionResponse.data === 'string') {
          return this.parseSRTTranscript(captionResponse.data);
        }
        
        console.log(`Caption download returned empty data for video ${videoId}`);
        return null;
      } catch (downloadError) {
        console.log(`Could not download captions for video ${videoId}:`, downloadError);
        return null;
      }
    } catch (error) {
      console.log(`Error getting transcript for video ${videoId}:`, error);
      return null;
    }
  }

  private parseSRTTranscript(srtContent: string): string {
    try {
      // Parse SRT format to extract just the text
      const lines = srtContent.split('\n');
      const textLines: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip sequence numbers and timestamps
        if (line && !line.match(/^\d+$/) && !line.match(/^\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}$/)) {
          textLines.push(line);
        }
      }
      
      return textLines.join(' ').trim();
    } catch (error) {
      console.error('Error parsing SRT transcript:', error);
      return srtContent; // Return raw content if parsing fails
    }
  }
}

// Export singleton instance
export const youtubeKBIngest = new YouTubeKBIngest();