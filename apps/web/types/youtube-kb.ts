// YouTube KB Ingestion Types

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

export interface YouTubeChannelInfo {
  channelId: string;
  channelName: string;
  handle: string;
  uploadsPlaylistId?: string;
}

export interface YouTubeIngestionLog {
  timestamp: Date;
  channel: string;
  channelId: string;
  result?: {
    success: boolean;
    videosProcessed: number;
    errorCount: number;
    totalFetched: number;
  };
  errors?: YouTubeIngestionError[];
  error?: string;
  success: boolean;
}

// API Response Types
export interface YouTubeIngestionAPIResponse {
  success: boolean;
  message?: string;
  data?: {
    videosProcessed: number;
    totalFetched: number;
    errorCount: number;
    videos: YouTubeVideo[];
  };
  error?: string;
  details?: YouTubeIngestionError[];
}

export interface YouTubeIngestionAPIError {
  error: string;
  message?: string;
  details?: YouTubeIngestionError[];
}