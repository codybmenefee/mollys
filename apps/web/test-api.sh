#!/bin/bash

echo "🧪 Testing YouTube KB Ingestion API..."
echo "======================================"

# Test the POST endpoint
echo "📡 Making POST request to /api/kb/ingest..."
echo ""

curl -X POST \
  -H "Content-Type: application/json" \
  -w "HTTP Status: %{http_code}\nTotal time: %{time_total}s\n" \
  http://localhost:3000/api/kb/ingest \
  -s | jq '.'

echo ""
echo "✅ API test completed!"
echo ""
echo "💡 Note: Make sure to:"
echo "1. Set YOUTUBE_API_KEY environment variable"
echo "2. Start the Next.js development server with: npm run dev"
echo "3. Install jq for pretty JSON output: sudo apt-get install jq"