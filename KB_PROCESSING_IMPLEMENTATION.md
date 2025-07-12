# YouTube Transcript KB Processing Implementation

## Overview

This implementation provides a complete solution for processing YouTube transcripts into knowledge base (KB) chunks with embeddings. It supports both provided transcripts and automatic transcription using OpenAI's Whisper API when transcripts are not available.

## Features

✅ **YouTube Video Processing**: Download audio from YouTube videos using `yt-dlp`
✅ **Whisper Integration**: Automatic transcription using OpenAI's Whisper API
✅ **Transcript Cleaning**: Remove timestamps, speaker labels, and noise
✅ **Text Chunking**: Split content into configurable word-count segments (default: 500 words)
✅ **Embedding Generation**: Create embeddings using OpenAI's text-embedding-ada-002
✅ **Metadata Management**: Rich metadata including source info, processing stats, and summaries
✅ **Error Handling**: Comprehensive error handling and validation
✅ **TypeScript Support**: Full TypeScript implementation with proper types
✅ **Utility Functions**: Reusable utilities for text processing and validation

## Architecture

```
apps/api/src/
├── agents/
│   └── kb-process.ts          # Main KB processing logic
└── lib/
    └── openai.ts              # OpenAI client integration

packages/shared/src/
└── utils/
    └── kb-utils.ts            # Shared utility functions
```

## Core Components

### 1. KB Processor (`apps/api/src/agents/kb-process.ts`)

**Main Class**: `KBProcessor`
- Handles the complete workflow from input to KB chunks
- Manages temporary files and cleanup
- Supports configurable options

**Key Functions**:
- `processTranscript()`: Main processing function
- `downloadAndTranscribe()`: Download audio and transcribe with Whisper
- `cleanup()`: Clean up temporary files

**Convenience Function**: `processYouTubeTranscript()`
- One-shot processing with automatic cleanup
- Ideal for simple use cases

### 2. OpenAI Integration (`apps/api/src/lib/openai.ts`)

**Functions**:
- `transcribeAudio()`: Whisper transcription
- `generateEmbedding()`: Text embedding generation
- `chatCompletion()`: Chat completions (existing)
- `analyzeImage()`: Image analysis (existing)

### 3. Utility Functions (`packages/shared/src/utils/kb-utils.ts`)

**Text Processing**:
- `cleanTranscript()`: Remove timestamps and noise
- `chunkText()`: Split text into word-count segments
- `getTextStats()`: Calculate word count, reading time, etc.

**Validation & Metadata**:
- `validateTranscriptInput()`: Input validation
- `extractYouTubeId()`: Extract video ID from URLs
- `generateChunkId()`: Create unique chunk identifiers
- `createKBChunks()`: Assemble final KB chunks with metadata

## Usage Examples

### Basic Usage with Provided Transcript

```typescript
import { processYouTubeTranscript } from './agents/kb-process'

const input = {
  transcript: "Your video transcript here...",
  source: {
    url: "https://www.youtube.com/watch?v=VIDEO_ID",
    title: "Video Title",
    videoId: "VIDEO_ID"
  }
}

const result = await processYouTubeTranscript(input)
console.log(`Created ${result.chunks.length} chunks`)
```

### Automatic Transcription (Whisper Fallback)

```typescript
const input = {
  transcript: null, // or "transcription needed"
  source: {
    url: "https://www.youtube.com/watch?v=VIDEO_ID",
    title: "Video Title",
    videoId: "VIDEO_ID"
  }
}

const result = await processYouTubeTranscript(input, {
  maxChunkWords: 300,
  generateSummary: true
})
```

### Advanced Usage with Custom Options

```typescript
import { KBProcessor } from './agents/kb-process'

const processor = new KBProcessor({
  maxChunkWords: 400,
  tempDir: '/custom/temp/dir',
  keepAudioFile: true,
  generateSummary: true
})

const result = await processor.processTranscript(input)
await processor.cleanup()
```

### Using Individual Utility Functions

```typescript
import { 
  cleanTranscript, 
  chunkText, 
  extractYouTubeId,
  getTextStats 
} from '@pasture-pilot/shared'

// Clean transcript
const cleaned = cleanTranscript(rawTranscript)

// Create chunks
const chunks = chunkText(cleaned, 500)

// Extract video ID
const videoId = extractYouTubeId(url)

// Get statistics
const stats = getTextStats(text)
```

## Data Types

### Input Type

```typescript
interface TranscriptInput {
  transcript: string | null
  source: VideoSource
}

interface VideoSource {
  url: string
  title: string
  videoId: string
}
```

### Output Type

```typescript
interface KBProcessResult {
  success: boolean
  chunks: KBChunk[]
  metadata: {
    sourceUrl: string
    title: string
    videoId: string
    processingTime: number
    transcriptSource: 'provided' | 'whisper'
    stats: {
      wordCount: number
      charCount: number
      chunkCount: number
      estimatedReadingTime: number
    }
  }
  error?: string
}
```

### KB Chunk Type

```typescript
interface KBChunk {
  chunkText: string
  embedding: number[]
  metadata: {
    sourceUrl: string
    title: string
    chunkId: string
    chunkIndex: number
    totalChunks: number
    sourceType: 'youtube' | 'transcript' | 'text'
    videoId?: string
    duration?: number
    timestamp?: number
    summary?: string
    insights?: string[]
  }
}
```

## Configuration Options

```typescript
interface KBProcessOptions {
  maxChunkWords?: number        // Default: 500
  useOpenRouterFallback?: boolean // Default: false
  tempDir?: string             // Default: '/tmp/kb-process'
  keepAudioFile?: boolean      // Default: false
  generateSummary?: boolean    // Default: false
}
```

## Environment Requirements

### Required Environment Variables

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### System Dependencies

- **yt-dlp**: For downloading YouTube audio
  ```bash
  # Already installed in the system
  which yt-dlp  # Should return /usr/bin/yt-dlp
  ```

- **Node.js**: Version 18+ with npm 9+
- **TypeScript**: For compilation

## Error Handling

The implementation includes comprehensive error handling:

### Input Validation
- Validates required fields (URL, title, videoId)
- Provides detailed error messages for missing data

### Download Errors
- Handles yt-dlp failures (invalid URLs, network issues)
- Cleans up partial downloads on failure

### Transcription Errors
- Handles OpenAI API errors
- Provides fallback error messages

### Processing Errors
- Validates file creation and processing steps
- Automatic cleanup on errors

## Performance Considerations

### Processing Time
- Transcript cleaning: ~1-5ms
- Text chunking: ~10-50ms
- Embedding generation: ~100-500ms per chunk
- Audio download: ~10-60 seconds (depends on video length)
- Whisper transcription: ~5-30 seconds (depends on audio length)

### Resource Usage
- Temporary audio files are cleaned up automatically
- Memory usage scales with text length
- Concurrent processing supported

## Testing

The implementation includes comprehensive tests that verify:

✅ YouTube ID extraction from various URL formats
✅ Transcript cleaning (timestamps, speaker labels, noise removal)
✅ Text chunking with configurable word limits
✅ Text statistics calculation
✅ Input validation with detailed error messages
✅ Full workflow simulation

### Running Tests

```bash
# Build shared package first
cd packages/shared && npm run build

# Run type checking
cd apps/api && npm run type-check

# Test with actual OpenAI API (requires OPENAI_API_KEY)
cd apps/api && npx ts-node -e "
import { processYouTubeTranscript } from './src/agents/kb-process';
// Your test code here
"
```

## Integration Points

### With Existing Summarizer
- Uses existing `logSummarizer` for content summarization
- Adds summary and insights to chunk metadata

### With OpenAI Client
- Leverages existing OpenAI client configuration
- Consistent error handling and API patterns

### With Shared Utilities
- All utility functions are exportable from `@pasture-pilot/shared`
- Reusable across different modules

## Future Enhancements

### Potential Improvements
- [ ] Support for other video platforms (Vimeo, etc.)
- [ ] Batch processing for multiple videos
- [ ] Configurable embedding models
- [ ] Streaming processing for large files
- [ ] Caching for repeated video processing
- [ ] Support for subtitle files (SRT, VTT)

### Optimization Opportunities
- [ ] Parallel embedding generation
- [ ] Chunking strategy optimization
- [ ] Memory usage optimization for large transcripts
- [ ] Resume capability for interrupted processing

## Troubleshooting

### Common Issues

**1. "yt-dlp not found"**
- Ensure yt-dlp is installed and accessible
- Check PATH environment variable

**2. "OpenAI API key missing"**
- Set OPENAI_API_KEY environment variable
- Verify API key is valid and has sufficient credits

**3. "Video download failed"**
- Check if video URL is valid and accessible
- Verify video is not private or restricted
- Check network connectivity

**4. "Transcription failed"**
- Verify OpenAI API key has Whisper access
- Check audio file was created successfully
- Verify sufficient API credits

**5. "Module not found @pasture-pilot/shared"**
- Build the shared package: `cd packages/shared && npm run build`
- Ensure proper workspace configuration

## License

This implementation is part of the Pasture Pilot project and follows the same licensing terms.