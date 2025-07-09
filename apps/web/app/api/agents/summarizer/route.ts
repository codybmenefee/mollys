import { NextRequest, NextResponse } from 'next/server'

// LogSummarizer Agent API endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, model, context } = body

    // Validate required environment variables
    const openRouterApiKey = process.env.OPENROUTER_API_KEY
    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    const selectedModel = model || 'openai/gpt-4-turbo-preview'

    // System prompt for LogSummarizer agent
    const systemPrompt = {
      role: 'system',
      content: `You are an expert sheep farming advisor with deep knowledge of regenerative agriculture practices. 
You analyze daily farming logs and provide actionable insights and recommendations.

Guidelines:
- Focus on sheep health, behavior, and grazing patterns
- Identify potential health issues early
- Suggest regenerative farming practices
- Consider weather and seasonal factors
- Provide practical, actionable advice
- Be concise but thorough
- Highlight any urgent concerns as health alerts`
    }

    // If this is a test, create a farming log context
    let fullMessages
    if (context && context.includes('Testing')) {
      const testMessage = messages?.[0]?.content || 'How are my sheep doing?'
      fullMessages = [
        systemPrompt,
        {
          role: 'user',
          content: `Analyze this farming observation and provide insights: "${testMessage}"`
        }
      ]
    } else {
      fullMessages = [systemPrompt, ...(messages || [])]
    }

    // Make request to OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'PasturePilot LogSummarizer'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: fullMessages,
        temperature: 0.3,
        max_tokens: 800,
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`OpenRouter API error: ${response.status} ${errorData}`)
    }

    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      message: data.choices?.[0]?.message?.content || 'Analysis completed',
      agent: 'LogSummarizer',
      model: selectedModel,
      usage: data.usage
    })

  } catch (error) {
    console.error('LogSummarizer API error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to process request',
        agent: 'LogSummarizer'
      },
      { status: 500 }
    )
  }
} 