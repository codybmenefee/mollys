const YTDlpWrapModule = require('yt-dlp-wrap');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

async function testDirectDownload() {
  console.log('🔍 Testing direct yt-dlp audio download...');
  
  const tempDir = path.join(os.tmpdir(), 'test-audio-download');
  const videoUrl = 'https://www.youtube.com/watch?v=RjGAxTEPuAM';
  const outputFile = path.join(tempDir, 'test-audio');
  
  try {
    // Ensure temp directory exists
    await fs.mkdir(tempDir, { recursive: true });
    console.log(`📁 Created temp directory: ${tempDir}`);
    
    const YTDlpWrap = YTDlpWrapModule.default || YTDlpWrapModule;
    const ytDlp = new YTDlpWrap();
    
    console.log('📡 Starting download...');
    const result = await ytDlp.exec([
      videoUrl,
      '--extract-audio',
      '--audio-format', 'mp3',
      '--output', `${outputFile}.%(ext)s`,
      '--no-playlist',
      '--verbose'  // Enable verbose for debugging
    ]);
    
    console.log('✅ Download completed');
    console.log('Result:', result);
    
    // List files in temp directory
    const files = await fs.readdir(tempDir);
    console.log('📋 Files in temp directory:', files);
    
    // Find the mp3 file
    const mp3File = files.find(f => f.endsWith('.mp3'));
    if (mp3File) {
      const fullPath = path.join(tempDir, mp3File);
      const stats = await fs.stat(fullPath);
      console.log(`✅ Found audio file: ${mp3File}`);
      console.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      
      // Cleanup
      await fs.unlink(fullPath);
      console.log('🧹 Cleaned up test file');
    } else {
      console.log('❌ No MP3 file found');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Download failed:', error);
    return false;
  }
}

async function run() {
  console.log('🚀 Testing Audio Download\n');
  
  const success = await testDirectDownload();
  
  if (success) {
    console.log('\n🎉 Audio download test successful!');
  } else {
    console.log('\n❌ Audio download test failed');
    console.log('\n🔧 Try running this command manually:');
    console.log('yt-dlp --extract-audio --audio-format mp3 "https://www.youtube.com/watch?v=RjGAxTEPuAM"');
  }
}

run().catch(console.error); 