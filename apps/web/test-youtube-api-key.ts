#!/usr/bin/env ts-node
import { google } from 'googleapis';
import { testConnection } from './lib/mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testYouTubeAPI() {
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

    // Test with a simple channel request
    const response = await youtube.channels.list({
      part: ['snippet'],
      id: ['UCi8jM5w49UezskDWBGyKq5g'], // Greg Judy's channel ID
    });

    const channel = response.data.items?.[0];
    if (channel) {
      console.log('✅ YouTube API connection successful');
      console.log(`📺 Channel: ${channel.snippet?.title}`);
      console.log(`📊 Subscriber Count: ${channel.statistics?.subscriberCount || 'N/A'}`);
    } else {
      console.log('❌ No channel data returned');
    }

    return true;
  } catch (error) {
    console.error('❌ YouTube API test failed:', error);
    return false;
  }
}

async function testMongoDBConnection() {
  console.log('🔍 Testing MongoDB connection...');
  
  try {
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('✅ MongoDB connection successful');
    } else {
      console.log('❌ MongoDB connection failed');
    }
    
    return isConnected;
  } catch (error) {
    console.error('❌ MongoDB connection test failed:', error);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Running connection tests...\n');
  
  const results = {
    youtube: await testYouTubeAPI(),
    mongodb: await testMongoDBConnection(),
  };
  
  console.log('\n📊 Test Results:');
  console.log(`YouTube API: ${results.youtube ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`MongoDB: ${results.mongodb ? '✅ PASS' : '❌ FAIL'}`);
  
  if (results.youtube && results.mongodb) {
    console.log('\n🎉 All tests passed! Your system is ready for YouTube ingestion.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check your configuration.');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(console.error); 