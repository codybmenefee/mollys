/**
 * Knowledge Base utility functions for processing text chunks and metadata
 */

export interface KBChunk {
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
  }
}

export interface VideoSource {
  url: string
  title: string
  videoId: string
}

export interface TranscriptInput {
  transcript: string | null
  source: VideoSource
}

/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  const match = url.match(regex)
  return match ? match[1] : null
}

/**
 * Clean transcript text by removing timestamps and noise
 */
export function cleanTranscript(rawTranscript: string): string {
  return rawTranscript
    // Remove timestamps like [00:00:00]
    .replace(/\[\d{2}:\d{2}:\d{2}\]/g, '')
    // Remove speaker labels like "Speaker 1:"
    .replace(/Speaker \d+:/g, '')
    // Remove music/sound indicators
    .replace(/\[Music\]/g, '')
    .replace(/\[Applause\]/g, '')
    .replace(/\[Laughter\]/g, '')
    // Remove multiple spaces and normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove empty lines
    .replace(/\n\s*\n/g, '\n')
    .trim()
}

/**
 * Split text into chunks of approximately target word count
 */
export function chunkText(text: string, targetWords: number = 500): string[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const chunks: string[] = []
  let currentChunk = ''
  let currentWordCount = 0

  for (const sentence of sentences) {
    const sentenceWords = sentence.trim().split(/\s+/).length
    
    // If adding this sentence would exceed target, start new chunk
    if (currentWordCount + sentenceWords > targetWords && currentChunk.trim()) {
      chunks.push(currentChunk.trim())
      currentChunk = sentence.trim()
      currentWordCount = sentenceWords
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence.trim()
      currentWordCount += sentenceWords
    }
  }

  // Add the last chunk if it has content
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks.filter(chunk => chunk.length > 0)
}

/**
 * Generate unique chunk ID
 */
export function generateChunkId(sourceUrl: string, chunkIndex: number): string {
  const timestamp = Date.now().toString(36)
  const urlHash = sourceUrl.split('').reduce((hash, char) => {
    return ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff
  }, 0)
  return `chunk_${Math.abs(urlHash).toString(36)}_${chunkIndex}_${timestamp}`
}

/**
 * Validate transcript input
 */
export function validateTranscriptInput(input: TranscriptInput): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!input.source) {
    errors.push('Source information is required')
  } else {
    if (!input.source.url) {
      errors.push('Source URL is required')
    }
    if (!input.source.title) {
      errors.push('Source title is required')
    }
    if (!input.source.videoId) {
      errors.push('Video ID is required')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Create chunks with metadata
 */
export function createKBChunks(
  chunks: string[],
  source: VideoSource,
  embeddings: number[][],
  additionalMetadata: Record<string, any> = {}
): KBChunk[] {
  return chunks.map((chunkText, index) => ({
    chunkText,
    embedding: embeddings[index] || [],
    metadata: {
      sourceUrl: source.url,
      title: source.title,
      chunkId: generateChunkId(source.url, index),
      chunkIndex: index,
      totalChunks: chunks.length,
      sourceType: 'youtube' as const,
      videoId: source.videoId,
      ...additionalMetadata
    }
  }))
}

/**
 * Calculate text statistics
 */
export function getTextStats(text: string): {
  wordCount: number
  charCount: number
  sentenceCount: number
  estimatedReadingTime: number
} {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  
  return {
    wordCount: words.length,
    charCount: text.length,
    sentenceCount: sentences.length,
    estimatedReadingTime: Math.ceil(words.length / 200) // ~200 words per minute
  }
}