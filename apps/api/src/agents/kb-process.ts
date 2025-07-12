import { execSync } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { generateEmbedding } from '../lib/openai'
import { transcribeAudio } from '../lib/openai'
import { logSummarizer } from './summarizer'
import {
  KBChunk,
  VideoSource,
  TranscriptInput,
  validateTranscriptInput,
  cleanTranscript,
  chunkText,
  createKBChunks,
  getTextStats,
  extractYouTubeId
} from '@pasture-pilot/shared'

export interface KBProcessResult {
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

export interface KBProcessOptions {
  maxChunkWords?: number
  useOpenRouterFallback?: boolean
  tempDir?: string
  keepAudioFile?: boolean
  generateSummary?: boolean
}

/**
 * Main KB processing class for YouTube transcripts
 */
export class KBProcessor {
  private tempDir: string
  private options: Required<KBProcessOptions>

  constructor(options: KBProcessOptions = {}) {
    this.tempDir = options.tempDir || '/tmp/kb-process'
    this.options = {
      maxChunkWords: options.maxChunkWords || 500,
      useOpenRouterFallback: options.useOpenRouterFallback || false,
      tempDir: this.tempDir,
      keepAudioFile: options.keepAudioFile || false,
      generateSummary: options.generateSummary || false
    }
  }

  /**
   * Process YouTube transcript input and return KB chunks
   */
  async processTranscript(input: TranscriptInput): Promise<KBProcessResult> {
    const startTime = Date.now()
    
    try {
      // Validate input
      const validation = validateTranscriptInput(input)
      if (!validation.isValid) {
        return {
          success: false,
          chunks: [],
          metadata: {
            sourceUrl: input.source?.url || '',
            title: input.source?.title || '',
            videoId: input.source.videoId || '',
            processingTime: 0,
            transcriptSource: 'provided',
            stats: { wordCount: 0, charCount: 0, chunkCount: 0, estimatedReadingTime: 0 }
          },
          error: `Input validation failed: ${validation.errors.join(', ')}`
        }
      }

      // Ensure temp directory exists
      await this.ensureTempDirectory()

      let transcript = input.transcript
      let transcriptSource: 'provided' | 'whisper' = 'provided'

      // If transcript is null or indicates transcription needed, use Whisper
      if (!transcript || transcript === 'transcription needed') {
        console.log('Transcript not provided, using Whisper fallback...')
        transcript = await this.downloadAndTranscribe(input.source)
        transcriptSource = 'whisper'
      }

      // Clean the transcript
      const cleanedTranscript = cleanTranscript(transcript)
      
      // Get text statistics
      const textStats = getTextStats(cleanedTranscript)
      
      // Chunk the text
      const textChunks = chunkText(cleanedTranscript, this.options.maxChunkWords)
      
      // Generate embeddings for each chunk
      const embeddings: number[][] = []
      for (const chunk of textChunks) {
        try {
          const embedding = await generateEmbedding(chunk)
          embeddings.push(embedding)
        } catch (error) {
          console.error('Error generating embedding for chunk:', error)
          embeddings.push([]) // Empty embedding as fallback
        }
      }

      // Create KB chunks with metadata
      const kbChunks = createKBChunks(textChunks, input.source, embeddings, {
        processingTime: Date.now() - startTime,
        transcriptSource,
        duration: textStats.estimatedReadingTime
      })

      // Generate summary if requested
      if (this.options.generateSummary && textChunks.length > 0) {
        try {
          // Use existing summarizer for content analysis
          const summaryResult = await logSummarizer.summarizeDaily([{
            id: uuidv4(),
            date: new Date().toISOString(),
            content: cleanedTranscript.substring(0, 1000) + '...', // Truncate for summary
            type: 'other'
          }])
          
          // Add summary to first chunk metadata
          if (kbChunks[0]) {
            kbChunks[0].metadata.summary = summaryResult.dailySummary
            kbChunks[0].metadata.insights = summaryResult.insights
          }
        } catch (error) {
          console.error('Error generating summary:', error)
        }
      }

      const processingTime = Date.now() - startTime

      return {
        success: true,
        chunks: kbChunks,
        metadata: {
          sourceUrl: input.source.url,
          title: input.source.title,
          videoId: input.source.videoId,
          processingTime,
          transcriptSource,
          stats: {
            wordCount: textStats.wordCount,
            charCount: textStats.charCount,
            chunkCount: textChunks.length,
            estimatedReadingTime: textStats.estimatedReadingTime
          }
        }
      }
    } catch (error) {
      console.error('Error processing transcript:', error)
      return {
        success: false,
        chunks: [],
        metadata: {
          sourceUrl: input.source?.url || '',
          title: input.source?.title || '',
          videoId: input.source?.videoId || '',
          processingTime: Date.now() - startTime,
          transcriptSource: 'provided',
          stats: { wordCount: 0, charCount: 0, chunkCount: 0, estimatedReadingTime: 0 }
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Download video audio and transcribe using Whisper
   */
  private async downloadAndTranscribe(source: VideoSource): Promise<string> {
    const audioFilePath = path.join(this.tempDir, `${source.videoId}.mp3`)
    
    try {
      // Download audio using yt-dlp
      console.log(`Downloading audio for video ${source.videoId}...`)
      const ytDlpCommand = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${audioFilePath}" "${source.url}"`
      
      execSync(ytDlpCommand, { 
        stdio: 'inherit',
        timeout: 300000 // 5 minutes timeout
      })

      // Check if file was created
      const exists = await fs.access(audioFilePath).then(() => true).catch(() => false)
      if (!exists) {
        throw new Error('Audio file was not created by yt-dlp')
      }

      // Read the audio file
      const audioBuffer = await fs.readFile(audioFilePath)
      
      // Transcribe using OpenAI Whisper
      console.log(`Transcribing audio for video ${source.videoId}...`)
      const transcriptionResult = await transcribeAudio(audioBuffer, {
        language: 'en', // Default to English, could be made configurable
        temperature: 0.0 // More deterministic results
      })

      // Clean up audio file unless keepAudioFile is true
      if (!this.options.keepAudioFile) {
        await fs.unlink(audioFilePath).catch(console.error)
      }

      return transcriptionResult.text
    } catch (error) {
      // Clean up audio file on error
      await fs.unlink(audioFilePath).catch(() => {})
      
      if (error instanceof Error) {
        if (error.message.includes('yt-dlp')) {
          throw new Error('Failed to download video audio. Please check the video URL and ensure yt-dlp is installed.')
        }
        throw error
      }
      throw new Error('Unknown error during audio download and transcription')
    }
  }

  /**
   * Ensure temporary directory exists
   */
  private async ensureTempDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true })
    } catch (error) {
      console.error('Error creating temp directory:', error)
      throw new Error('Failed to create temporary directory')
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanup(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir)
      await Promise.all(files.map(file => 
        fs.unlink(path.join(this.tempDir, file)).catch(console.error)
      ))
    } catch (error) {
      console.error('Error cleaning up temp files:', error)
    }
  }
}

/**
 * Convenience function to process a single transcript
 */
export async function processYouTubeTranscript(
  input: TranscriptInput,
  options: KBProcessOptions = {}
): Promise<KBProcessResult> {
  const processor = new KBProcessor(options)
  
  try {
    const result = await processor.processTranscript(input)
    return result
  } finally {
    // Always clean up
    await processor.cleanup()
  }
}

/**
 * Test function with mock data
 */
export async function testKBProcessing(): Promise<void> {
  console.log('🧪 Testing KB Processing with mock data...')
  
  const mockInput: TranscriptInput = {
    transcript: null, // This will trigger Whisper fallback
    source: {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll for testing
      title: 'Test Video - Rick Astley - Never Gonna Give You Up',
      videoId: 'dQw4w9WgXcQ'
    }
  }

  try {
    const result = await processYouTubeTranscript(mockInput, {
      maxChunkWords: 100, // Smaller chunks for testing
      generateSummary: true
    })

    console.log('📊 Test Results:', {
      success: result.success,
      chunkCount: result.chunks.length,
      processingTime: result.metadata.processingTime,
      transcriptSource: result.metadata.transcriptSource,
      error: result.error
    })

    if (result.success && result.chunks.length > 0) {
      console.log('✅ First chunk preview:', {
        text: result.chunks[0].chunkText.substring(0, 100) + '...',
        hasEmbedding: result.chunks[0].embedding.length > 0,
        metadata: result.chunks[0].metadata
      })
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Export singleton instance
export const kbProcessor = new KBProcessor()