import { NextRequest, NextResponse } from 'next/server';
import { videoTranscriptionPipeline, PipelineOptions } from '../../../../lib/video-transcription-pipeline';

export async function POST(request: NextRequest) {
  try {
    console.log('🎬 Video transcription pipeline API called');
    
    // Parse request body for options
    const body = await request.json().catch(() => ({}));
    const options: PipelineOptions = {
      maxVideos: body.maxVideos || 5,
      maxConcurrentDownloads: body.maxConcurrentDownloads || 2,
      skipExisting: body.skipExisting !== false, // Default to true
      testMode: body.testMode === true
    };
    
    // Validate environment variables
    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: 'YouTube API key not configured' },
        { status: 500 }
      );
    }
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: 'MongoDB URI not configured' },
        { status: 500 }
      );
    }
    
    console.log('🚀 Starting video transcription pipeline with options:', options);
    
    // Run the pipeline
    const result = await videoTranscriptionPipeline.runPipeline(options);
    
    // Log the result for monitoring
    console.log('📊 Pipeline completed:', {
      success: result.success,
      videosProcessed: result.videosProcessed,
      videosCompleted: result.videosCompleted,
      videosFailed: result.videosFailed,
      errorCount: result.errors.length
    });
    
    if (!result.success && result.errors.length > 0) {
      console.error('❌ Pipeline errors:', result.errors);
    }
    
    // Return success response
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? 'Video transcription pipeline completed successfully'
        : 'Video transcription pipeline completed with errors',
      data: {
        videosProcessed: result.videosProcessed,
        videosCompleted: result.videosCompleted,
        videosFailed: result.videosFailed,
        completedVideos: result.completedVideos,
        errors: result.errors
      },
      summary: {
        totalProcessed: result.videosProcessed,
        successRate: result.videosProcessed > 0 
          ? (result.videosCompleted / result.videosProcessed * 100).toFixed(1) + '%'
          : '0%',
        errorRate: result.videosProcessed > 0
          ? (result.videosFailed / result.videosProcessed * 100).toFixed(1) + '%'
          : '0%'
      }
    });

  } catch (error) {
    console.error('🔥 Video transcription pipeline API error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to run video transcription pipeline'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check pipeline status and get stats
export async function GET() {
  try {
    console.log('📊 Getting pipeline stats...');
    
    // Validate environment variables
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: 'MongoDB URI not configured' },
        { status: 500 }
      );
    }
    
    const stats = await videoTranscriptionPipeline.getStats();
    
    return NextResponse.json({
      success: true,
      stats,
      pipeline: {
        status: 'ready',
        description: 'Video transcription pipeline for Greg Judy YouTube videos',
        capabilities: [
          'YouTube video metadata ingestion',
          'Audio download from YouTube videos',
          'Whisper transcription via OpenAI',
          'MongoDB storage with search indexing',
          'Farming-specific keyword extraction',
          'Parallel video processing with controlled concurrency'
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting pipeline stats:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to get pipeline statistics'
      },
      { status: 500 }
    );
  }
} 