import { NextRequest, NextResponse } from 'next/server';
import { videoBatchProcessor } from '../../../../lib/video-batch-processor';
import { youtubeKBIngest } from '../../../../lib/youtube-kb-ingest';

// POST - Add videos to batch queue
export async function POST(request: NextRequest) {
  try {
    console.log('📦 Batch processing API called');
    
    const body = await request.json().catch(() => ({}));
    const { 
      maxVideos = 10, 
      priority = 0, 
      startProcessor = true,
      processorOptions = {}
    } = body;

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

    // Ingest videos
    console.log('📺 Ingesting YouTube videos for batch processing...');
    const ingestionResult = await youtubeKBIngest.ingestGregJudyVideos();
    
    if (!ingestionResult.success) {
      return NextResponse.json(
        { error: 'Failed to ingest videos', details: 'YouTube ingestion failed' },
        { status: 500 }
      );
    }

    // Limit videos and add to batch
    const videosToProcess = ingestionResult.videos.slice(0, maxVideos);
    const jobIds = videoBatchProcessor.addBatch(videosToProcess, priority);

    // Start processor if requested
    if (startProcessor) {
      videoBatchProcessor.start();
    }

    return NextResponse.json({
      success: true,
      message: `Added ${videosToProcess.length} videos to batch queue`,
      data: {
        videosAdded: videosToProcess.length,
        jobIds: jobIds.slice(0, 5), // Show first 5 job IDs
        totalJobIds: jobIds.length,
        batchStatus: videoBatchProcessor.getStatus()
      }
    });

  } catch (error) {
    console.error('🔥 Batch API error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to process batch request'
      },
      { status: 500 }
    );
  }
}

// GET - Get batch status and queue information
export async function GET() {
  try {
    const status = videoBatchProcessor.getStatus();
    const recentJobs = videoBatchProcessor.getJobs().slice(-10); // Last 10 jobs

    return NextResponse.json({
      success: true,
      status,
      recentJobs: recentJobs.map(job => ({
        id: job.id,
        videoId: job.videoId,
        status: job.status,
        attempts: job.attempts,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        error: job.error?.substring(0, 100), // Truncate error messages
        result: job.result
      })),
      controls: {
        isRunning: status.isRunning,
        canStart: !status.isRunning,
        canStop: status.isRunning,
        canClear: status.totalJobs > 0
      }
    });

  } catch (error) {
    console.error('❌ Error getting batch status:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to get batch status'
      },
      { status: 500 }
    );
  }
}

// PUT - Control batch processor (start/stop)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'start':
        videoBatchProcessor.start();
        return NextResponse.json({
          success: true,
          message: 'Batch processor started',
          status: videoBatchProcessor.getStatus()
        });

      case 'stop':
        videoBatchProcessor.stop();
        return NextResponse.json({
          success: true,
          message: 'Batch processor stopped',
          status: videoBatchProcessor.getStatus()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action', validActions: ['start', 'stop'] },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ Error controlling batch processor:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 