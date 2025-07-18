import { NextRequest, NextResponse } from 'next/server'

// Simple hash-based embedding generation as fallback
function generateSimpleEmbedding(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/)
  const embedding = new Array(384).fill(0) // Standard embedding size
  
  // Create a simple hash-based embedding
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    for (let j = 0; j < word.length; j++) {
      const charCode = word.charCodeAt(j)
      const index = (charCode * (i + 1) * (j + 1)) % embedding.length
      embedding[index] += 1 / (words.length + 1)
    }
  }
  
  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude
    }
  }
  
  return embedding
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    // Use OpenRouter for embeddings
    const openRouterApiKey = process.env.OPENROUTER_API_KEY
    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    // Try OpenAI directly for embeddings, fallback to simple hash if not available
    const openaiApiKey = process.env.OPENAI_API_KEY
    
    if (openaiApiKey) {
      // Use OpenAI directly for embeddings
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text
        })
      })

      if (response.ok) {
        const data = await response.json()
        const embedding = data.data?.[0]?.embedding
        
        if (embedding) {
          return NextResponse.json({ embedding })
        }
      }
    }
    
    // Fallback: Generate a simple hash-based embedding for basic similarity
    console.log('Using fallback embedding generation for text:', text.substring(0, 50) + '...')
    const embedding = generateSimpleEmbedding(text)
    return NextResponse.json({ embedding })

  } catch (error) {
    console.error('Embedding API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}