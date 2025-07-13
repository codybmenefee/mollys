import { NextRequest, NextResponse } from 'next/server';
import { videoTranscriptionPipelineNoDb, PipelineOptions } from '../../../../lib/video-transcription-pipeline-no-db';

export async function POST(request: NextRequest) {
  try {
    console.log('🎬 Video transcription pipeline (No DB) API called');
    
    // Parse request body for options
    const body = await request.json().catch(() => ({}));
    const options: PipelineOptions = {
      maxVideos: body.maxVideos || 2, // Start with just 2 videos for testing
      skipExisting: body.skipExisting !== false, // Default to true
      outputDir: body.outputDir || './pipeline-output'
    };
    
    // Validate required environment variables
    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: 'YouTube API key not configured' },
        { status: 500 }
      );
    }
    
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }
    
    console.log('🚀 Starting video transcription pipeline (No DB) with options:', options);
    
    // Run the pipeline
    const result = await videoTranscriptionPipelineNoDb.runPipeline(options);
    
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
        ? 'Video transcription pipeline completed successfully (saved to files)'
        : 'Video transcription pipeline completed with errors',
      data: {
        videosProcessed: result.videosProcessed,
        videosCompleted: result.videosCompleted,
        videosFailed: result.videosFailed,
        completedVideos: result.completedVideos,
        errors: result.errors,
        outputFile: result.outputFile
      },
      summary: {
        totalProcessed: result.videosProcessed,
        successRate: result.videosProcessed > 0 
          ? (result.videosCompleted / result.videosProcessed * 100).toFixed(1) + '%'
          : '0%',
        errorRate: result.videosProcessed > 0
          ? (result.videosFailed / result.videosProcessed * 100).toFixed(1) + '%'
          : '0%'
      },
      notes: {
        storage: 'Results saved to local files instead of MongoDB',
        files: 'Check the output directory for individual video JSON files',
        summary: 'Complete summary available in summary.json'
      }
    });

  } catch (error) {
    console.error('🔥 Video transcription pipeline (No DB) API error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to run video transcription pipeline (No DB version)'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check pipeline status
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      pipeline: {
        status: 'ready',
        version: 'no-database',
        description: 'Video transcription pipeline for Greg Judy YouTube videos (File-based storage)',
        capabilities: [
          'YouTube video metadata ingestion',
          'Audio download from YouTube videos',
          'Whisper transcription via OpenRouter',
          'Local file storage (JSON format)',
          'Farming-specific keyword extraction'
        ],
        storage: {
          type: 'local-files',
          location: './pipeline-output',
          format: 'JSON'
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting pipeline status:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to get pipeline status'
      },
      { status: 500 }
    );
  }
} 