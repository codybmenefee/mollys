const { google } = require('googleapis');
require('dotenv').config();

async function testYouTubeConnection() {
  console.log('🔍 Testing YouTube API connection...');
  
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      throw new Error('YOUTUBE_API_KEY environment variable is not set');
    }

    const youtube = google.youtube({
      version: 'v3',
      auth: apiKey,
    });

    console.log('📺 Fetching Greg Judy channel info...');
    const channelResponse = await youtube.channels.list({
      part: ['snippet', 'contentDetails'],
      id: ['UCi8jM5w49UezskDWBGyKq5g'],
    });

    const channel = channelResponse.data.items?.[0];
    if (!channel) {
      throw new Error('Could not find Greg Judy channel');
    }

    console.log(`✅ Found channel: ${channel.snippet.title}`);
    
    const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;
    console.log(`📋 Uploads playlist ID: ${uploadsPlaylistId}`);
    
    console.log('🎬 Fetching recent videos...');
    const videosResponse = await youtube.playlistItems.list({
      part: ['snippet'],
      playlistId: uploadsPlaylistId,
      maxResults: 5,
    });

    const videos = videosResponse.data.items || [];
    console.log(`✅ Found ${videos.length} recent videos`);
    
    videos.forEach((video, index) => {
      console.log(`${index + 1}. ${video.snippet.title} (${video.snippet.resourceId.videoId})`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ YouTube API test failed:', error);
    return false;
  }
}

async function testYtDlp() {
  console.log('🔍 Testing yt-dlp installation...');
  
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync('yt-dlp --version');
    console.log(`✅ yt-dlp version: ${stdout.trim()}`);
    
    return true;
  } catch (error) {
    console.error('❌ yt-dlp test failed:', error);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Running simple pipeline tests...\n');
  
  const results = {
    youtubeApi: await testYouTubeConnection(),
    ytDlp: await testYtDlp()
  };
  
  console.log('\n📊 Test Results:');
  console.log(`YouTube API: ${results.youtubeApi ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`yt-dlp: ${results.ytDlp ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 All basic tests passed!');
    console.log('The core components are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed.');
    console.log('Please check the configurations.');
  }
}

runTests().catch(console.error); 