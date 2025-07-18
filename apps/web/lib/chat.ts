import { ChatMessage } from '@/types/chat'

export interface StreamResponse {
  message: string
  isComplete: boolean
  error?: string
  sources?: Array<{
    url: string
    title: string
    type: 'youtube' | 'article' | 'document' | 'manual'
    channelTitle?: string
    publishDate?: string
    relevanceScore?: number
  }>
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
  sources?: Array<{
    url: string
    title: string
    type: 'youtube' | 'article' | 'document' | 'manual'
    channelTitle?: string
    publishDate?: string
    relevanceScore?: number
  }>
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

// Function to determine topK based on query complexity
function determineTopK(query: string): number {
  // Convert to lowercase for analysis
  const lowerQuery = query.toLowerCase()
  
  // Base topK
  let topK = 3
  
  // Increase topK for complex queries
  const complexityIndicators = [
    'compare', 'comparison', 'different', 'alternatives', 'options',
    'various', 'multiple', 'several', 'many', 'all', 'comprehensive',
    'detailed', 'thorough', 'complete', 'extensive', 'in-depth',
    'explain', 'describe', 'tell me about', 'what are', 'how do',
    'research', 'studies', 'examples', 'cases', 'methods', 'techniques',
    'approaches', 'strategies', 'practices', 'systems', 'types',
    'kinds', 'varieties', 'breeds', 'species'
  ]
  
  const questionWords = ['what', 'how', 'why', 'when', 'where', 'which', 'who']
  const hasQuestionWord = questionWords.some(word => lowerQuery.includes(word))
  
  // Count complexity indicators
  const complexityScore = complexityIndicators.reduce((score, indicator) => {
    return score + (lowerQuery.includes(indicator) ? 1 : 0)
  }, 0)
  
  // Adjust topK based on complexity
  if (complexityScore >= 3 || (hasQuestionWord && complexityScore >= 2)) {
    topK = 10 // High complexity - comprehensive answer needed
  } else if (complexityScore >= 2 || (hasQuestionWord && complexityScore >= 1)) {
    topK = 6 // Medium complexity
  } else if (complexityScore >= 1 || hasQuestionWord) {
    topK = 5 // Some complexity
  }
  
  // Adjust for query length (longer queries often need more sources)
  const wordCount = query.split(' ').length
  if (wordCount > 15) {
    topK = Math.min(topK + 2, 12)
  } else if (wordCount > 10) {
    topK = Math.min(topK + 1, 10)
  }
  
  // Ensure minimum and maximum bounds
  return Math.max(3, Math.min(topK, 15))
}

export async function sendChatMessage(
  messages: ChatMessage[],
  model?: string,
  onStream?: (response: StreamResponse) => void
): Promise<ChatResponse> {
  try {
    // Get the last user message for KB retrieval
    const lastUserMessage = messages.filter(msg => msg.role === 'user').pop()
    let kbChunks: any[] = []
    let kbSources: any[] = []
    
    if (lastUserMessage) {
      // Query enhanced knowledge base for relevant chunks (including video transcripts)
      try {
        // Determine topK dynamically based on query complexity
        const topK = determineTopK(lastUserMessage.content)
        
        const kbResponse = await fetch('/api/kb/enhanced-query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: lastUserMessage.content,
            topK
          })
        })
        
        if (kbResponse.ok) {
          const kbResult = await kbResponse.json()
          kbChunks = kbResult.chunks
          
          // Store source information for citation display with deduplication
          if (kbChunks.length > 0) {
            // Create a Map to deduplicate sources by URL
            const sourceMap = new Map<string, any>()
            
            kbChunks.forEach((chunk: any) => {
              const sourceUrl = chunk.metadata.sourceUrl
              
              // Only add if we haven't seen this source URL before
              if (!sourceMap.has(sourceUrl)) {
                sourceMap.set(sourceUrl, {
                  url: sourceUrl,
                  title: chunk.metadata.title,
                  type: chunk.sourceType,
                  channelTitle: chunk.channelTitle,
                  publishDate: chunk.publishDate,
                  relevanceScore: chunk.relevanceScore || chunk.similarity
                })
              } else {
                // If we've seen this source before, update relevance score if this chunk has a higher score
                const existing = sourceMap.get(sourceUrl)
                const currentScore = chunk.relevanceScore || chunk.similarity || 0
                if (currentScore > (existing.relevanceScore || 0)) {
                  existing.relevanceScore = currentScore
                }
              }
            })
            
            // Convert Map to array and sort by relevance score
            kbSources = Array.from(sourceMap.values())
              .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
          }
        }
      } catch (error) {
        console.error('Failed to query enhanced KB:', error)
        // Continue without KB chunks if the query fails
      }
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
        kbChunks: kbChunks.map((chunk: any) => ({
          content: chunk.content,
          source: chunk.metadata.sourceUrl,
          title: chunk.metadata.title,
          similarity: chunk.similarity,
          sourceType: chunk.sourceType,
          videoId: chunk.videoId,
          channelTitle: chunk.channelTitle,
          publishDate: chunk.publishDate,
          relevanceScore: chunk.relevanceScore
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
      let currentChunk = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = new TextDecoder().decode(value)
          currentChunk += chunk

          // Process complete JSON objects
          const lines = currentChunk.split('\n')
          currentChunk = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                // Stream complete - send final response with sources
                onStream({
                  message: fullMessage,
                  isComplete: true,
                  sources: kbSources // Pass the sources here
                })
                return { 
                  message: fullMessage, 
                  model: model || 'unknown',
                  timestamp: new Date(),
                  sources: kbSources 
                }
              }

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices[0]?.delta?.content
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

      // Fallback if stream ended without [DONE]
      onStream({
        message: fullMessage,
        isComplete: true,
        sources: kbSources
      })
      return { 
        message: fullMessage, 
        model: model || 'unknown',
        timestamp: new Date(),
        sources: kbSources 
      }
    } else {
      // Handle non-streaming response
      const data = await response.json()
      const message = data.choices?.[0]?.message?.content || 'No response received'
      
      return {
        message,
        model: data.model || model || 'unknown',
        timestamp: new Date(),
        usage: data.usage,
        sources: (messages as any).kbSources || []
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