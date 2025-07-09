import { NextRequest, NextResponse } from 'next/server'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  model?: string
  stream?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { messages, model, stream = true } = body

    // Validate required environment variables
    const openRouterApiKey = process.env.OPENROUTER_API_KEY
    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    // Use provided model or default
    const selectedModel = model || process.env.DEFAULT_MODEL || 'mistral/mixtral-8x7b-instruct:nitro'

    // Add system prompt for farming context
    const systemPrompt: ChatMessage = {
      role: 'system',
      content: `You are PasturePilot, an AI assistant specialized in regenerative livestock farming. You help farmers with:
- Sheep health, behavior, and welfare
- Pasture management and rotational grazing
- Regenerative farming practices
- Weather-related farming decisions
- Daily livestock observations and logging

Always be practical, supportive, and focus on sustainable farming practices. Use farming-related emojis when appropriate (🐑 🌱 📝 🌾 🚜). Keep responses concise but helpful.`
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

          function pump(): Promise<void> {
            return reader.read().then(({ done, value }) => {
              if (done) {
                controller.close()
                return
              }
              controller.enqueue(value)
              return pump()
            }).catch((error) => {
              console.error('Stream error:', error)
              controller.error(error)
            })
          }

          return pump()
        }
      })

      return new NextResponse(readableStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
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