const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');
require('dotenv').config();

async function testWhisperDirect() {
  console.log('🔍 Testing OpenRouter Whisper API directly...');
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not found');
    return;
  }
  
  const audioFile = '/tmp/test-download/Greg Judy shows the growing results of trampling forage onto pastures. [RjGAxTEPuAM].mp3';
  
  if (!fs.existsSync(audioFile)) {
    console.error(`❌ Audio file not found: ${audioFile}`);
    return;
  }
  
  const stats = fs.statSync(audioFile);
  console.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioFile));
    formData.append('model', 'openai/whisper-1');
    formData.append('language', 'en');
    formData.append('response_format', 'verbose_json');
    formData.append('temperature', '0.1');
    formData.append('prompt', 'This is a video about farming, specifically rotational grazing, livestock management, and sustainable agriculture.');
    
    console.log('📡 Sending request to OpenRouter...');
    
    const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://pasturepilot.com',
        'X-Title': 'PasturePilot Video Transcription',
        ...formData.getHeaders()
      },
      body: formData
    });
    
    console.log(`📋 Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API error: ${response.status} ${response.statusText}`);
      console.error(`Error details: ${errorText}`);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Transcription successful!');
    console.log(`📝 Text length: ${result.text?.length || 0} characters`);
    console.log(`🕐 Duration: ${result.duration || 0} seconds`);
    console.log(`📖 Language: ${result.language || 'unknown'}`);
    console.log(`📄 Transcript preview: ${result.text?.substring(0, 200)}...`);
    
    if (result.segments && result.segments.length > 0) {
      console.log(`📊 Segments: ${result.segments.length}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing Whisper API:', error);
  }
}

testWhisperDirect().catch(console.error); 