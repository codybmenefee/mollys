#!/usr/bin/env ts-node

import { youtubeKBIngest } from './lib/youtube-kb-ingest';

async function testYouTubeIngestion() {
  try {
    console.log('🚀 Testing YouTube ingestion service...');
    console.log('Channel: Greg Judy (@gregjudyregenerativerancher)');
    console.log('Channel ID: UCi8jM5w49UezskDWBGyKq5g');
    console.log('');

    // Check if API key is set
    if (!process.env.YOUTUBE_API_KEY) {
      console.error('❌ YOUTUBE_API_KEY environment variable is not set');
      console.log('Please set your YouTube Data API key in the environment variables');
      process.exit(1);
    }

    console.log('✅ YouTube API key is configured');
    console.log('📡 Starting ingestion process...');
    console.log('');

    const result = await youtubeKBIngest.ingestGregJudyVideos();

    console.log('📊 INGESTION RESULTS:');
    console.log('=====================');
    console.log(`Success: ${result.success}`);
    console.log(`Total videos fetched: ${result.totalFetched}`);
    console.log(`Videos with transcripts: ${result.videos.filter(v => v.transcript).length}`);
    console.log(`Videos without transcripts: ${result.videos.filter(v => !v.transcript).length}`);
    console.log(`Errors: ${result.errors.length}`);
    console.log('');

    if (result.errors.length > 0) {
      console.log('❌ ERRORS:');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. Video ${error.videoId}: ${error.error}`);
      });
      console.log('');
    }

    if (result.videos.length > 0) {
      console.log('📹 SAMPLE VIDEOS:');
      result.videos.slice(0, 3).forEach((video, index) => {
        console.log(`${index + 1}. ${video.title}`);
        console.log(`   URL: ${video.url}`);
        console.log(`   Published: ${video.publishDate}`);
        console.log(`   Transcript: ${video.transcript ? 'Available' : 'Not available'}`);
        if (video.transcript) {
          console.log(`   Transcript length: ${video.transcript.length} characters`);
          console.log(`   Transcript preview: ${video.transcript.substring(0, 100)}...`);
        }
        console.log('');
      });
    }

    if (result.success) {
      console.log('✅ YouTube ingestion completed successfully!');
    } else {
      console.log('❌ YouTube ingestion failed.');
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error);
    process.exit(1);
  }
}

// Run the test
testYouTubeIngestion();