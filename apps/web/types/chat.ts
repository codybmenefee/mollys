export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  type?: 'text' | 'voice' | 'image'
  model?: string
  metadata?: {
    responseTime?: number
    tokens?: number
    error?: string
  }
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  timestamp: string
  messageCount: number
  model?: string
}

export interface ModelConfig {
  id: string
  name: string
  description: string
  maxTokens?: number
  costPer1kTokens?: number
}

export interface ChatConfig {
  model: string
  temperature?: number
  maxTokens?: number
  streaming?: boolean
}

export interface AnalyzeRequest {
  type: 'voice' | 'image'
  data: string | File
  context?: string
  timestamp?: Date
}

export interface AnalyzeResponse {
  success: boolean
  type: 'voice' | 'image'
  transcription?: string
  analysis: string
  insights?: string[]
  confidence?: number
  metadata?: Record<string, any>
}

export type ChatError = {
  message: string
  code?: string
  details?: any
}