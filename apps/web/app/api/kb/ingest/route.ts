import { NextRequest, NextResponse } from 'next/server';
import { youtubeKBIngest } from '../../../../lib/youtube-kb-ingest';

export async function POST(request: NextRequest) {
  try {
    console.log('YouTube KB ingestion API called');
    
    // Validate environment variables
    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: 'YouTube API key not configured' },
        { status: 500 }
      );
    }

    console.log('Starting YouTube ingestion process...');
    
    // Execute the ingestion
    const result = await youtubeKBIngest.ingestGregJudyVideos();
    
    // Log the result for monitoring
    console.log('YouTube ingestion completed:', {
      success: result.success,
      videosProcessed: result.videos.length,
      errors: result.errors.length,
      totalFetched: result.totalFetched,
    });

    // Optional: Log to MongoDB for monitoring/auditing
    if (process.env.MONGODB_URI) {
      try {
        const { default: clientPromise } = await import('../../../../lib/mongodb');
        const client = await clientPromise;
        const db = client.db('pasturepilot');
        const collection = db.collection('youtube_ingestion_logs');
        
        await collection.insertOne({
          timestamp: new Date(),
          channel: 'Greg Judy (@gregjudyregenerativerancher)',
          channelId: 'UCi8jM5w49UezskDWBGyKq5g',
          result: {
            success: result.success,
            videosProcessed: result.videos.length,
            errorCount: result.errors.length,
            totalFetched: result.totalFetched,
          },
          errors: result.errors,
          // Store video metadata for processing pipeline
          videosSummary: result.videos.map(v => ({ 
            videoId: v.videoId, 
            title: v.title,
            duration: v.duration,
            publishDate: v.publishDate,
            viewCount: v.viewCount
          })),
        });
        
        console.log('Ingestion results logged to MongoDB');
      } catch (logError) {
        console.error('Failed to log to MongoDB:', logError);
        // Don't fail the request if logging fails
      }
    }

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'YouTube ingestion failed',
          details: result.errors,
        },
        { status: 500 }
      );
    }

    // Return success response with video metadata
    return NextResponse.json({
      success: true,
      message: 'YouTube ingestion completed successfully',
      data: {
        videosProcessed: result.videos.length,
        totalFetched: result.totalFetched,
        errorCount: result.errors.length,
        videos: result.videos,
      },
      notes: {
        transcription: 'Video transcripts will be generated using Whisper during processing',
        nextSteps: 'Videos are ready for audio extraction and transcription pipeline'
      }
    });

  } catch (error) {
    console.error('YouTube ingestion API error:', error);
    
    // Log error to MongoDB if possible
    if (process.env.MONGODB_URI) {
      try {
        const { default: clientPromise } = await import('../../../../lib/mongodb');
        const client = await clientPromise;
        const db = client.db('pasturepilot');
        const collection = db.collection('youtube_ingestion_logs');
        
        await collection.insertOne({
          timestamp: new Date(),
          channel: 'Greg Judy (@gregjudyregenerativerancher)',
          channelId: 'UCi8jM5w49UezskDWBGyKq5g',
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      } catch (logError) {
        console.error('Failed to log error to MongoDB:', logError);
      }
    }
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}