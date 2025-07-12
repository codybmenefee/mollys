import { NextRequest, NextResponse } from 'next/server'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  model?: string
  stream?: boolean
  farmId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { messages, model, stream = true, farmId = 'default' } = body

    // Extract knowledge from user messages automatically (but don't update profile server-side)
    let extractedKnowledge = null
    const lastUserMessage = messages[messages.length - 1]
    if (lastUserMessage && lastUserMessage.role === 'user') {
      extractedKnowledge = await extractKnowledge(lastUserMessage.content, farmId)
    }

    // Validate required environment variables
    const openRouterApiKey = process.env.OPENROUTER_API_KEY
    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    // Use provided model or default
    const selectedModel = model || process.env.DEFAULT_MODEL || 'mistralai/mistral-7b-instruct'

    // Get farm context for personalized responses
    const farmSummary = extractedKnowledge 
      ? `Recent farm activity detected: ${JSON.stringify(extractedKnowledge)}`
      : 'No farm profile available - will build from conversations'
    
    // Add system prompt for farming context with farm-specific information
    const systemPrompt: ChatMessage = {
      role: 'system',
      content: `You are PasturePilot, an AI assistant specialized in regenerative livestock farming. You help farmers with:
- Sheep health, behavior, and welfare
- Pasture management and rotational grazing
- Regenerative farming practices
- Weather-related farming decisions
- Daily livestock observations and logging

FARM CONTEXT:
${farmSummary}

Use this context to provide personalized, relevant advice. Reference specific paddocks, animals, and patterns when helpful. Always be practical, supportive, and focus on sustainable farming practices. Use farming-related emojis when appropriate (🐑 🌱 📝 🌾 🚜). Keep responses concise but helpful.`
    }

    // Prepare messages with system prompt
    const fullMessages = [systemPrompt, ...messages]

    // Make request to OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'PasturePilot'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: fullMessages,
        stream,
        temperature: 0.7,
        max_tokens: 1000,
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('OpenRouter API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to get response from AI model' },
        { status: response.status }
      )
    }

    if (stream) {
      // Return streaming response
      if (!response.body) {
        return NextResponse.json(
          { error: 'No response body from AI model' },
          { status: 500 }
        )
      }

      const readableStream = new ReadableStream({
        start(controller) {
          const reader = response.body!.getReader()
          let isControllerClosed = false

          async function pump(): Promise<void> {
            try {
              while (!isControllerClosed) {
                const { done, value } = await reader.read()
                
                if (done) {
                  if (!isControllerClosed) {
                    try {
                      controller.close()
                    } catch (e) {
                      // Controller might already be closed
                    }
                    isControllerClosed = true
                  }
                  break
                }

                if (!isControllerClosed && value) {
                  try {
                    controller.enqueue(value)
                  } catch (e) {
                    // Controller is closed, stop pumping
                    isControllerClosed = true
                    break
                  }
                }
              }
            } catch (error) {
              if (!isControllerClosed) {
                try {
                  controller.error(error)
                } catch (e) {
                  // Controller might already be closed
                }
                isControllerClosed = true
              }
            } finally {
              try {
                reader.releaseLock()
              } catch (e) {
                // Reader might already be released
              }
            }
          }

          pump().catch((error) => {
            console.error('Stream pump error:', error)
          })
        },
        cancel() {
          console.log('Stream cancelled by client')
        }
      })

      return new NextResponse(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      })
    } else {
      // Return complete response
      const data = await response.json()
      return NextResponse.json(data)
    }

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to extract knowledge from user messages (server-side only)
async function extractKnowledge(text: string, farmId: string): Promise<any> {
  try {
    // Only extract knowledge if the message contains farming-related content
    const farmingKeywords = ['sheep', 'paddock', 'pasture', 'move', 'graze', 'feed', 'water', 'fence', 'gate', 'trough', 'health', 'count', 'ewes', 'rams', 'lambs']
    const containsFarmingContent = farmingKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    )
    
    if (!containsFarmingContent) {
      return null // Skip knowledge extraction for non-farming messages
    }

    // Call knowledge extraction agent
    const extractResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/agents/knowledge-extractor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        farmId,
        date: new Date().toISOString()
      })
    })

    if (extractResponse.ok) {
      const extractedData = await extractResponse.json()
      if (extractedData.success) {
        console.log('Knowledge extracted successfully')
        return extractedData.extracted
      }
    }
    return null
  } catch (error) {
    console.error('Knowledge extraction failed:', error)
    return null
  }
}