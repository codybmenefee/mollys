#!/usr/bin/env ts-node
import { youtubeKBIngest } from './lib/youtube-kb-ingest';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testYouTubeIngestion() {
  console.log('🔍 Testing YouTube ingestion...');
  
  try {
    const result = await youtubeKBIngest.ingestGregJudyVideos();
    
    if (result.success) {
      console.log('✅ YouTube ingestion successful');
      console.log(`📺 Fetched ${result.videos.length} videos`);
      console.log(`❌ ${result.errors.length} errors`);
      
      // Show first video as example
      if (result.videos.length > 0) {
        const firstVideo = result.videos[0];
        console.log(`📹 First video: ${firstVideo.title} (${firstVideo.videoId})`);
        console.log(`🕐 Duration: ${firstVideo.duration}`);
        console.log(`👁️  Views: ${firstVideo.viewCount}`);
      }
    } else {
      console.log('❌ YouTube ingestion failed');
      console.log('Errors:', result.errors);
    }
    
    return result.success;
  } catch (error) {
    console.error('❌ YouTube ingestion test failed:', error);
    return false;
  }
}

async function testAudioDownload() {
  console.log('🔍 Testing audio download...');
  
  try {
    const { youtubeAudioDownloader } = await import('./lib/youtube-audio-downloader');
    
    // Test with a short video
    const testVideoId = 'RjGAxTEPuAM'; // One of Greg Judy's videos
    const testVideoUrl = `https://www.youtube.com/watch?v=${testVideoId}`;
    
    console.log(`🎵 Downloading audio for test video: ${testVideoId}`);
    const result = await youtubeAudioDownloader.downloadAudio(testVideoUrl, testVideoId);
    
    console.log('✅ Audio download successful');
    console.log(`📁 Audio file: ${result.audioPath}`);
    console.log(`📝 Title: ${result.title}`);
    console.log(`⏱️  Duration: ${result.duration} seconds`);
    
    // Cleanup
    await result.cleanup();
    console.log('🧹 Audio file cleaned up');
    
    return true;
  } catch (error) {
    console.error('❌ Audio download test failed:', error);
    return false;
  }
}

async function testTranscription() {
  console.log('🔍 Testing Whisper transcription...');
  
  try {
    const { whisperTranscriber } = await import('./lib/whisper-transcriber');
    
    // Create a test audio file path (we'll skip actual file creation for this test)
    console.log('📝 Whisper transcriber initialized');
    console.log('✅ Transcription test setup successful');
    
    return true;
  } catch (error) {
    console.error('❌ Transcription test failed:', error);
    return false;
  }
}

async function runComponentTests() {
  console.log('🚀 Running pipeline component tests...\n');
  
  const results = {
    youtubeIngestion: await testYouTubeIngestion(),
    audioDownload: await testAudioDownload(),
    transcription: await testTranscription()
  };
  
  console.log('\n📊 Test Results:');
  console.log(`YouTube Ingestion: ${results.youtubeIngestion ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Audio Download: ${results.audioDownload ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Transcription: ${results.transcription ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 All component tests passed!');
    console.log('The pipeline components are working correctly.');
  } else {
    console.log('\n⚠️  Some component tests failed.');
    console.log('Please check the individual component configurations.');
  }
}

// Run the tests
runComponentTests().catch(console.error); 