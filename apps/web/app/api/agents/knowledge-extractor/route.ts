import { NextRequest, NextResponse } from 'next/server'

interface KnowledgeExtractionRequest {
  text: string
  context?: string
  farmId?: string
  date?: string
}

interface ExtractedKnowledge {
  paddocks: Array<{
    name: string
    mentions: string[]
    activities: string[]
    conditions?: string
  }>
  animals: Array<{
    type: string
    count?: number
    location?: string
    health?: string
    behavior?: string
    notes: string[]
  }>
  activities: Array<{
    type: string
    description: string
    location?: string
    time?: string
    completed: boolean
  }>
  infrastructure: Array<{
    type: string
    name?: string
    location?: string
    condition?: string
    notes: string[]
  }>
  routines: Array<{
    type: string
    description: string
    frequency?: string
    timing?: string
    preferences?: string
  }>
  environment: {
    weather?: string
    conditions?: string
    impact?: string
  }
  business: {
    goals?: string[]
    challenges?: string[]
    methods?: string[]
    philosophy?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: KnowledgeExtractionRequest = await request.json()
    const { text, context, farmId, date } = body

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required for knowledge extraction' },
        { status: 400 }
      )
    }

    // Validate API key
    const openRouterApiKey = process.env.OPENROUTER_API_KEY
    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    // Construct the extraction prompt
    const extractionPrompt = `Extract structured farm knowledge from this natural language update:

"${text}"

${context ? `Context: ${context}` : ''}

Return a JSON object with the following structure:
{
  "paddocks": [{"name": "paddock name", "mentions": ["mention1"], "activities": ["activity1"], "conditions": "condition if mentioned"}],
  "animals": [{"type": "sheep/cattle/etc", "count": number, "location": "where", "health": "status", "behavior": "observed", "notes": ["note1"]}],
  "activities": [{"type": "moving/feeding/checking/etc", "description": "what happened", "location": "where", "time": "when", "completed": true/false}],
  "infrastructure": [{"type": "gate/water/fence/etc", "name": "name if any", "location": "where", "condition": "status", "notes": ["note1"]}],
  "routines": [{"type": "daily/weekly/etc", "description": "what routine", "frequency": "how often", "timing": "when", "preferences": "farmer preference"}],
  "environment": {"weather": "conditions", "conditions": "environmental factors", "impact": "how it affects farming"},
  "business": {"goals": ["goal1"], "challenges": ["challenge1"], "methods": ["method1"], "philosophy": "farming philosophy"}
}

Focus on extracting concrete, actionable information. If information isn't mentioned, omit those fields. Be specific about paddock names, animal counts, and farmer preferences.`

    // Make request to OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'PasturePilot Knowledge Extractor'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a specialized knowledge extraction agent for PasturePilot. Your job is to parse natural language farm updates and extract structured information.

Extract and identify:
1. **Paddock/Field Names**: Any mention of specific grazing areas, fields, or paddocks
2. **Animal Information**: Counts, movements, health observations, behaviors
3. **Farm Activities**: Feeding, moving, checking, treatments, repairs
4. **Infrastructure**: Gates, water troughs, fencing, shelters, equipment
5. **Farmer Routines**: Patterns, preferences, timing, decision-making
6. **Weather/Environmental**: Conditions affecting farming decisions
7. **Business/Mission Elements**: Goals, challenges, methods, philosophy

Always return valid JSON data that can be used to build a comprehensive farm profile. Focus on extracting actionable, memorable information that helps understand the farm operation.`
          },
          {
            role: 'user',
            content: extractionPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('OpenRouter API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to extract knowledge from text' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const extractedText = data.choices?.[0]?.message?.content

    if (!extractedText) {
      return NextResponse.json(
        { error: 'No knowledge extracted from text' },
        { status: 500 }
      )
    }

    // Parse the extracted JSON
    let extractedKnowledge: ExtractedKnowledge
    try {
      extractedKnowledge = JSON.parse(extractedText)
    } catch (parseError) {
      console.error('JSON parsing error:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse extracted knowledge', rawResponse: extractedText },
        { status: 500 }
      )
    }

    // TODO: Save to database (farm profile)
    // await saveFarmKnowledge(farmId, extractedKnowledge, date)

    return NextResponse.json({
      success: true,
      extracted: extractedKnowledge,
      originalText: text,
      timestamp: new Date().toISOString(),
      farmId,
      date
    })

  } catch (error) {
    console.error('Knowledge extraction error:', error)
    return NextResponse.json(
      { error: 'Internal server error during knowledge extraction' },
      { status: 500 }
    )
  }
}

// GET endpoint to check agent status
export async function GET() {
  return NextResponse.json({
    agent: 'KnowledgeExtractor',
    status: 'active',
    description: 'Extracts structured farm data from natural language updates',
    capabilities: ['knowledge_extraction', 'data_structuring', 'farm_profiling', 'entity_recognition'],
    model: 'openai/gpt-4o',
    lastUpdated: new Date().toISOString()
  })
} 