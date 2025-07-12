import { NextRequest, NextResponse } from 'next/server'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  model?: string
  stream?: boolean
  kbChunks?: Array<{
    content: string
    source: string
    title: string
    similarity: number
  }>
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { messages, model, stream = true, kbChunks = [] } = body

    // TODO: Route to agents based on intent
    // e.g., if user says "log this" → call LoggingAgent
    // For now, just stream OpenRouter response

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

    // Add system prompt for farming context with KB sources
    let systemContent = `You are PasturePilot, an AI assistant specialized in regenerative livestock farming. You help farmers with:
- Sheep health, behavior, and welfare
- Pasture management and rotational grazing
- Regenerative farming practices
- Weather-related farming decisions
- Daily livestock observations and logging

Always be practical, supportive, and focus on sustainable farming practices. Use farming-related emojis when appropriate (🐑 🌱 📝 🌾 🚜). Keep responses concise but helpful.`

    // Add KB sources if available
    if (kbChunks.length > 0) {
      systemContent += `\n\nUse these sources to provide more detailed and accurate information:\n`
      kbChunks.forEach((chunk, index) => {
        systemContent += `\nSource ${index + 1} (${chunk.title}): ${chunk.content}\n[Source URL: ${chunk.source}]\n`
      })
      systemContent += `\nWhen referencing these sources, include the source URL in your response for citation.`
    }

    const systemPrompt: ChatMessage = {
      role: 'system',
      content: systemContent
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