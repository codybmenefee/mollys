import { ChatMessage } from '@/types/chat'
import { KnowledgeBaseStore } from './kb-store'

export interface StreamResponse {
  message: string
  isComplete: boolean
  error?: string
}

export interface ChatResponse {
  message: string
  model: string
  timestamp: Date
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// Available models for the dropdown
export const AVAILABLE_MODELS = [
  {
    id: 'mistralai/mistral-7b-instruct',
    name: 'Mistral 7B (Fast)',
    description: 'Fast and efficient for general farming advice'
  },
  {
    id: 'anthropic/claude-3-haiku',
    name: 'Claude 3 Haiku',
    description: 'Quick responses with good reasoning'
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Reliable general-purpose assistant'
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    description: 'Most capable with vision support'
  }
]

export async function sendChatMessage(
  messages: ChatMessage[],
  model?: string,
  onStream?: (response: StreamResponse) => void
): Promise<ChatResponse> {
  try {
    // Get the last user message for KB retrieval
    const lastUserMessage = messages.filter(msg => msg.role === 'user').pop()
    let kbChunks: any[] = []
    
    if (lastUserMessage) {
      // Query knowledge base for relevant chunks
      const kbResult = await KnowledgeBaseStore.query(lastUserMessage.content, 3)
      kbChunks = kbResult.chunks
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        model,
        stream: !!onStream,
        kbChunks: kbChunks.map(chunk => ({
          content: chunk.content,
          source: chunk.metadata.sourceUrl,
          title: chunk.metadata.title,
          similarity: chunk.similarity
        }))
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to send message')
    }

    if (onStream) {
      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      let fullMessage = ''
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                onStream({
                  message: fullMessage,
                  isComplete: true
                })
                return {
                  message: fullMessage,
                  model: model || 'unknown',
                  timestamp: new Date()
                }
              }

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content || ''
                if (content) {
                  fullMessage += content
                  onStream({
                    message: fullMessage,
                    isComplete: false
                  })
                }
              } catch (e) {
                // Skip invalid JSON chunks
                continue
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      return {
        message: fullMessage,
        model: model || 'unknown',
        timestamp: new Date()
      }
    } else {
      // Handle non-streaming response
      const data = await response.json()
      const message = data.choices?.[0]?.message?.content || 'No response received'
      
      return {
        message,
        model: data.model || model || 'unknown',
        timestamp: new Date(),
        usage: data.usage
      }
    }
  } catch (error) {
    console.error('Chat API error:', error)
    throw error
  }
}

// Chat history management
export class ChatHistory {
  private static STORAGE_KEY = 'pasturepilot_chat_history'
  private static MAX_CONVERSATIONS = 50

  static saveConversation(messages: ChatMessage[], title?: string) {
    try {
      const conversations = this.getConversations()
      const newConversation = {
        id: Date.now().toString(),
        title: title || this.generateTitle(messages),
        messages,
        timestamp: new Date().toISOString(),
        messageCount: messages.length
      }

      conversations.unshift(newConversation)
      
      // Keep only the most recent conversations
      if (conversations.length > this.MAX_CONVERSATIONS) {
        conversations.splice(this.MAX_CONVERSATIONS)
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(conversations))
      return newConversation.id
    } catch (error) {
      console.error('Failed to save conversation:', error)
      return null
    }
  }

  static getConversations() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load conversations:', error)
      return []
    }
  }

  static getConversation(id: string) {
    const conversations = this.getConversations()
    return conversations.find((conv: any) => conv.id === id)
  }

  static deleteConversation(id: string) {
    try {
      const conversations = this.getConversations()
      const filtered = conversations.filter((conv: any) => conv.id !== id)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
      return true
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      return false
    }
  }

  static clearAll() {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
      return true
    } catch (error) {
      console.error('Failed to clear conversations:', error)
      return false
    }
  }

  private static generateTitle(messages: ChatMessage[]): string {
    const userMessage = messages.find(msg => msg.role === 'user')
    if (userMessage) {
      const content = userMessage.content
      if (content.length > 50) {
        return content.substring(0, 47) + '...'
      }
      return content
    }
    return 'New Conversation'
  }
}

// Logging functionality
export class ChatLogger {
  private static STORAGE_KEY = 'pasturepilot_chat_logs'

  static logInteraction(request: {
    userMessage: string
    aiResponse: string
    model: string
    timestamp: Date
    responseTime?: number
  }) {
    try {
      const logs = this.getLogs()
      const logEntry = {
        id: Date.now().toString(),
        ...request,
        timestamp: request.timestamp.toISOString()
      }

      logs.unshift(logEntry)
      
      // Keep only the last 1000 log entries
      if (logs.length > 1000) {
        logs.splice(1000)
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs))
    } catch (error) {
      console.error('Failed to log interaction:', error)
    }
  }

  static getLogs() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load logs:', error)
      return []
    }
  }

  static exportLogs() {
    const logs = this.getLogs()
    const dataStr = JSON.stringify(logs, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `pasturepilot-logs-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    
    URL.revokeObjectURL(url)
  }

  static clearLogs() {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
      return true
    } catch (error) {
      console.error('Failed to clear logs:', error)
      return false
    }
  }
}