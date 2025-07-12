import OpenAI from 'openai'
import { createReadStream } from 'fs'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export { openai }

export interface TranscriptionResult {
  text: string
  confidence: number
  language?: string
  duration?: number
}

export interface ChatResponse {
  content: string
  role: 'assistant'
  tokens_used: number
}

/**
 * Transcribe audio using Whisper API
 */
export async function transcribeAudio(
  audioFilePath: string,
  options: {
    language?: string
    prompt?: string
    temperature?: number
  } = {}
): Promise<TranscriptionResult> {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(audioFilePath),
      model: 'whisper-1',
      language: options.language,
      prompt: options.prompt,
      temperature: options.temperature || 0,
      response_format: 'verbose_json',
    })

    return {
      text: transcription.text,
      confidence: 0.9, // Whisper doesn't provide confidence, use default
      language: transcription.language,
      duration: transcription.duration,
    }
  } catch (error) {
    console.error('Error transcribing audio:', error)
    throw new Error('Failed to transcribe audio')
  }
}

/**
 * Chat completion with farming context
 */
export async function chatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: {
    temperature?: number
    max_tokens?: number
    model?: string
  } = {}
): Promise<ChatResponse> {
  try {
    const completion = await openai.chat.completions.create({
      model: options.model || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert AI assistant for sheep farmers focused on regenerative agriculture. 
You provide practical, actionable advice about sheep health, behavior, grazing management, and sustainable farming practices.
Be concise, helpful, and always prioritize animal welfare and environmental sustainability.
If you're unsure about medical issues, recommend consulting a veterinarian.`
        },
        ...messages
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 500,
    })

    const response = completion.choices[0]?.message
    
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    return {
      content: response.content || '',
      role: 'assistant',
      tokens_used: completion.usage?.total_tokens || 0,
    }
  } catch (error) {
    console.error('Error in chat completion:', error)
    throw new Error('Failed to generate response')
  }
}

/**
 * Analyze image with vision model
 */
export async function analyzeImage(
  imageUrl: string,
  prompt: string = "Analyze this image in the context of sheep farming. What do you observe about the animals, their behavior, health, or environment?"
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    })

    return response.choices[0]?.message?.content || 'Unable to analyze image'
  } catch (error) {
    console.error('Error analyzing image:', error)
    throw new Error('Failed to analyze image')
  }
}

/**
 * Generate embeddings for semantic search
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    })

    return response.data[0]?.embedding || []
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw new Error('Failed to generate embedding')
  }
}