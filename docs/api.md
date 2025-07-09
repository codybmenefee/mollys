# PasturePilot API Documentation

## Overview

The PasturePilot API provides endpoints for managing farming logs, AI-powered insights, and conversational interactions for regenerative livestock producers.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-app.vercel.app/api`

## Authentication

All API endpoints require authentication using Supabase Auth. Include the JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Chat & Conversations

#### POST /api/chat

Start or continue a conversation with the AI farming assistant.

**Request:**
```json
{
  "message": "My sheep seem restless today, what should I look for?",
  "context": {
    "recent_logs": [],
    "farm_info": {},
    "current_weather": {}
  }
}
```

**Response:**
```json
{
  "message": "Restless behavior in sheep can indicate several things...",
  "suggestions": ["Check for predators", "Monitor water supply"],
  "follow_up_questions": ["How long have they been restless?"],
  "confidence": 0.85
}
```

### Daily Logs

#### GET /api/logs

Retrieve farming logs with optional filtering.

**Query Parameters:**
- `date`: Filter by specific date (YYYY-MM-DD)
- `type`: Filter by log type (observation, health, weather, etc.)
- `limit`: Number of logs to return (default: 50)
- `offset`: Pagination offset

**Response:**
```json
{
  "logs": [
    {
      "id": "123",
      "date": "2024-01-15",
      "content": "Sheep grazing well in south pasture",
      "type": "observation",
      "weather": "sunny",
      "temperature": 72,
      "ai_insights": ["Good grazing conditions"]
    }
  ],
  "total": 150,
  "has_more": true
}
```

#### POST /api/logs

Create a new farming log entry.

**Request:**
```json
{
  "content": "Found one ewe limping slightly",
  "type": "health",
  "images": ["base64_image_data"],
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  }
}
```

**Response:**
```json
{
  "success": true,
  "log": {
    "id": "124",
    "date": "2024-01-15T14:30:00Z",
    "content": "Found one ewe limping slightly",
    "type": "health",
    "ai_insights": ["Monitor for signs of foot rot", "Consider veterinary check"]
  }
}
```

### Voice Transcription

#### POST /api/voice/transcribe

Transcribe voice recordings using Whisper API.

**Request:**
```json
{
  "audio_data": "base64_encoded_audio",
  "language": "en",
  "context": "sheep farming observation"
}
```

**Response:**
```json
{
  "transcript": "The sheep in the north field are...",
  "confidence": 0.92,
  "language": "en",
  "duration": 15.3
}
```

### Image Analysis

#### POST /api/images/analyze

Analyze images using GPT-4 Vision for livestock and farm insights.

**Request:**
```json
{
  "image_data": "base64_encoded_image",
  "prompt": "Analyze sheep health and behavior",
  "context": "daily health check"
}
```

**Response:**
```json
{
  "analysis": "The sheep appear healthy with good body condition...",
  "insights": [
    "Body condition appears good",
    "No visible signs of distress",
    "Wool quality looks healthy"
  ],
  "health_concerns": [],
  "confidence": 0.88
}
```

### Daily Summaries

#### GET /api/summaries/daily/:date

Get AI-generated daily summary for a specific date.

**Response:**
```json
{
  "id": "summary_123",
  "date": "2024-01-15",
  "summary": "Today's observations show healthy sheep behavior...",
  "insights": [
    "Sheep are adapting well to new pasture",
    "Water consumption is normal"
  ],
  "recommendations": [
    "Continue current grazing rotation",
    "Monitor weather changes"
  ],
  "health_alerts": [],
  "confidence_score": 0.89
}
```

#### POST /api/summaries/generate

Generate a new daily summary from today's logs.

**Response:**
```json
{
  "success": true,
  "summary": {
    "date": "2024-01-15",
    "summary": "Generated summary...",
    "insights": [],
    "recommendations": []
  }
}
```

### Weather Integration

#### GET /api/weather/current

Get current weather conditions for the farm location.

**Response:**
```json
{
  "temperature": 72,
  "humidity": 65,
  "precipitation": 0,
  "wind_speed": 8,
  "conditions": "partly cloudy",
  "forecast": "Clear skies expected"
}
```

### Health Monitoring

#### GET /api/health/patterns

Analyze health patterns from recent logs.

**Query Parameters:**
- `days`: Number of days to analyze (default: 30)

**Response:**
```json
{
  "patterns": [
    "Increased water consumption in hot weather",
    "Normal grazing behavior across all fields"
  ],
  "alerts": [],
  "recommendations": [
    "Ensure adequate shade during peak hours"
  ]
}
```

## Error Handling

All endpoints return errors in this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

- `AUTH_REQUIRED`: Authentication token missing or invalid
- `INVALID_INPUT`: Request validation failed
- `AI_SERVICE_ERROR`: OpenAI API error
- `DATABASE_ERROR`: Supabase database error
- `RATE_LIMIT_EXCEEDED`: Too many requests

## Rate Limits

- **Chat**: 100 requests per hour
- **Voice Transcription**: 50 requests per hour
- **Image Analysis**: 25 requests per hour
- **Other endpoints**: 1000 requests per hour

## Webhooks

### Daily Summary Generated

Triggered when a daily summary is automatically generated.

```json
{
  "event": "daily_summary_generated",
  "data": {
    "farm_id": "farm_123",
    "date": "2024-01-15",
    "summary_id": "summary_456",
    "health_alerts": []
  }
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { PasturePilotAPI } from '@pasture-pilot/sdk'

const api = new PasturePilotAPI({
  apiKey: 'your_api_key',
  baseUrl: 'https://your-app.vercel.app/api'
})

// Chat with AI
const response = await api.chat({
  message: "How are my sheep doing today?",
  context: { recent_logs: logs }
})

// Create log entry
const log = await api.logs.create({
  content: "Sheep looking healthy",
  type: "observation"
})

// Transcribe voice
const transcript = await api.voice.transcribe({
  audio_data: audioBlob,
  language: "en"
})
```

### Python

```python
from pasture_pilot import PasturePilotAPI

api = PasturePilotAPI(
    api_key="your_api_key",
    base_url="https://your-app.vercel.app/api"
)

# Chat with AI
response = api.chat(
    message="How are my sheep doing today?",
    context={"recent_logs": logs}
)

# Create log entry
log = api.logs.create(
    content="Sheep looking healthy",
    type="observation"
)
```

## Testing

Use the `/api/test` endpoint to verify your integration:

```bash
curl -X GET "https://your-app.vercel.app/api/test" \
  -H "Authorization: Bearer your_token"
```

## Support

For API support, contact [support@pasturepilot.com](mailto:support@pasturepilot.com) or visit our [documentation](https://docs.pasturepilot.com).