# YouTube KB Ingestion Service

This service ingests videos from Greg Judy's YouTube channel (@gregjudyregenerativerancher) for the PasturePilot Knowledge Base feature.

## Overview

The YouTube KB Ingestion service automatically fetches video metadata and transcripts from Greg Judy's regenerative ranching channel (Channel ID: `UCi8jM5w49UezskDWBGyKq5g`). It uses the YouTube Data API to:

1. Get the channel's uploads playlist
2. Fetch up to 50 most recent videos
3. Attempt to retrieve auto-generated transcripts
4. Return structured video data for KB processing

## Files Created

- `apps/web/lib/youtube-kb-ingest.ts` - Main ingestion service
- `apps/web/app/api/kb/ingest/route.ts` - API endpoint
- `apps/web/test-youtube-ingest.ts` - Test script
- `apps/web/test-api.sh` - API test script

## Setup

### 1. Install Dependencies

```bash
cd apps/web
npm install googleapis
```

### 2. Configure YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select an existing one
3. Enable the YouTube Data API v3
4. Create credentials (API Key)
5. Add the API key to your environment variables:

```bash
export YOUTUBE_API_KEY="your-api-key-here"
```

Or add to your `.env.local` file:
```
YOUTUBE_API_KEY=your-api-key-here
```

### 3. Optional: MongoDB Configuration

If you want to log ingestion results to MongoDB, ensure `MONGODB_URI` is set in your environment variables.

## Usage

### API Endpoint

**POST** `/api/kb/ingest`

Triggers the YouTube ingestion process for Greg Judy's channel.

**Response Format:**
```json
{
  "success": true,
  "message": "YouTube ingestion completed successfully",
  "data": {
    "videosProcessed": 45,
    "totalFetched": 50,
    "errorCount": 5,
    "videos": [
      {
        "videoId": "abc123",
        "title": "Regenerative Grazing Techniques",
        "url": "https://www.youtube.com/watch?v=abc123",
        "transcript": "Welcome to today's discussion on...",
        "publishDate": "2024-01-15T10:00:00Z"
      }
    ]
  }
}
```

### Direct Service Usage

```typescript
import { youtubeKBIngest } from './lib/youtube-kb-ingest';

async function ingestVideos() {
  const result = await youtubeKBIngest.ingestGregJudyVideos();
  
  if (result.success) {
    console.log(`Successfully processed ${result.videos.length} videos`);
    
    // Process videos with transcripts
    const videosWithTranscripts = result.videos.filter(v => v.transcript);
    videosWithTranscripts.forEach(video => {
      console.log(`${video.title}: ${video.transcript?.length} characters`);
    });
  }
}
```

## Testing

### Test the Service Directly

```bash
cd apps/web
npx ts-node test-youtube-ingest.ts
```

### Test the API Endpoint

1. Start the Next.js development server:
```bash
npm run dev
```

2. Run the API test:
```bash
chmod +x test-api.sh
./test-api.sh
```

Or use curl directly:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/kb/ingest
```

## Features

### Transcript Retrieval

The service attempts to retrieve transcripts in the following order:
1. Auto-generated captions (ASR) in English
2. Any available English captions
3. Falls back to `null` if no captions are available

### Error Handling

- Graceful handling of videos without transcripts
- Individual video processing errors don't stop the entire process
- Comprehensive error logging and reporting

### Rate Limiting

The service is limited to 50 videos per request to respect YouTube API quotas.

### Logging

- Console logging for debugging
- Optional MongoDB logging for audit trails
- Ingestion results are logged with timestamps

## Data Structure

### YouTubeVideo Interface

```typescript
interface YouTubeVideo {
  videoId: string;        // YouTube video ID
  title: string;          // Video title
  url: string;            // Full YouTube URL
  transcript: string | null; // Full transcript text or null
  publishDate: string;    // ISO 8601 date string
}
```

### YouTubeIngestionResult Interface

```typescript
interface YouTubeIngestionResult {
  success: boolean;              // Overall success status
  videos: YouTubeVideo[];        // Successfully processed videos
  errors: YouTubeIngestionError[]; // Processing errors
  totalFetched: number;          // Total videos fetched from API
}
```

## Limitations

1. **Transcript Availability**: Not all videos have auto-generated captions
2. **API Quotas**: YouTube Data API has daily quotas
3. **Caption Download**: Some captions may be restricted or unavailable
4. **Language**: Only English captions are retrieved

## Next Steps

1. **Storage Integration**: Store ingested videos in your KB database
2. **Incremental Updates**: Track last ingestion date to avoid re-processing
3. **Whisper Integration**: Add fallback transcription for videos without captions
4. **Scheduling**: Set up automated ingestion via cron jobs or scheduled functions

## Error Handling

The service handles various error scenarios:

- Missing API key
- Network failures
- API rate limits
- Individual video processing errors
- MongoDB logging failures (non-blocking)

All errors are logged and returned in the response for debugging purposes.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `YOUTUBE_API_KEY` | Yes | YouTube Data API v3 key |
| `MONGODB_URI` | No | MongoDB connection string for logging |

## Channel Information

- **Channel Name**: Greg Judy
- **Handle**: @gregjudyregenerativerancher
- **Channel ID**: UCi8jM5w49UezskDWBGyKq5g
- **Focus**: Regenerative ranching and livestock management

This channel was specifically chosen for its high-quality content on regenerative agriculture practices that align with PasturePilot's mission.