import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface LogEntry {
  id: string
  date: string
  content: string
  type: 'observation' | 'health' | 'weather' | 'feeding' | 'other'
  images?: string[]
  weather?: string
  temperature?: number
}

export interface SummaryResult {
  dailySummary: string
  insights: string[]
  recommendations: string[]
  healthAlerts: string[]
  confidence: number
}

export class LogSummarizer {
  private readonly systemPrompt = `
You are an expert sheep farming advisor with deep knowledge of regenerative agriculture practices. 
You analyze daily farming logs and provide actionable insights and recommendations.

Guidelines:
- Focus on sheep health, behavior, and grazing patterns
- Identify potential health issues early
- Suggest regenerative farming practices
- Consider weather and seasonal factors
- Provide practical, actionable advice
- Be concise but thorough
- Highlight any urgent concerns as health alerts
`

  async summarizeDaily(logs: LogEntry[]): Promise<SummaryResult> {
    try {
      const logsText = logs.map(log => 
        `[${log.date}] ${log.type.toUpperCase()}: ${log.content}` +
        (log.weather ? ` (Weather: ${log.weather}, ${log.temperature}°F)` : '')
      ).join('\n')

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: this.systemPrompt },
          { 
            role: 'user', 
            content: `Analyze these daily farming logs and provide a summary with insights and recommendations:\n\n${logsText}` 
          }
        ],
        temperature: 0.3,
        max_tokens: 800,
      })

      const response = completion.choices[0]?.message?.content || ''
      
      // Parse the structured response
      return this.parseResponse(response)
    } catch (error) {
      console.error('Error in AI summarization:', error)
      return {
        dailySummary: 'Unable to generate summary due to an error.',
        insights: ['Error occurred during analysis'],
        recommendations: ['Please try again or contact support'],
        healthAlerts: [],
        confidence: 0,
      }
    }
  }

  async summarizeWeekly(dailySummaries: string[]): Promise<SummaryResult> {
    try {
      const summariesText = dailySummaries.join('\n\n')

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: this.systemPrompt },
          { 
            role: 'user', 
            content: `Analyze these daily summaries from the past week and provide a comprehensive weekly overview:\n\n${summariesText}` 
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      })

      const response = completion.choices[0]?.message?.content || ''
      
      return this.parseResponse(response)
    } catch (error) {
      console.error('Error in weekly summarization:', error)
      return {
        dailySummary: 'Unable to generate weekly summary due to an error.',
        insights: ['Error occurred during analysis'],
        recommendations: ['Please try again or contact support'],
        healthAlerts: [],
        confidence: 0,
      }
    }
  }

  async analyzeHealthPatterns(logs: LogEntry[]): Promise<string[]> {
    try {
      const healthLogs = logs.filter(log => 
        log.type === 'health' || 
        log.content.toLowerCase().includes('health') ||
        log.content.toLowerCase().includes('sick') ||
        log.content.toLowerCase().includes('behavior')
      )

      if (healthLogs.length === 0) {
        return ['No specific health observations found in recent logs.']
      }

      const healthText = healthLogs.map(log => 
        `[${log.date}] ${log.content}`
      ).join('\n')

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { 
            role: 'system', 
            content: 'You are a sheep health expert. Analyze health-related observations and identify patterns or concerns.' 
          },
          { 
            role: 'user', 
            content: `Analyze these health observations and identify any patterns or concerns:\n\n${healthText}` 
          }
        ],
        temperature: 0.2,
        max_tokens: 500,
      })

      const response = completion.choices[0]?.message?.content || ''
      
      // Return as array of insights
      return response.split('\n').filter(line => line.trim().length > 0)
    } catch (error) {
      console.error('Error in health pattern analysis:', error)
      return ['Unable to analyze health patterns due to an error.']
    }
  }

  private parseResponse(response: string): SummaryResult {
    // Basic parsing - in production, you might want more sophisticated parsing
    const lines = response.split('\n').filter(line => line.trim().length > 0)
    
    let dailySummary = ''
    const insights: string[] = []
    const recommendations: string[] = []
    const healthAlerts: string[] = []

    let currentSection = ''
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase()
      
      if (lowerLine.includes('summary') || lowerLine.includes('overview')) {
        currentSection = 'summary'
        if (!dailySummary) dailySummary = line.replace(/^[#*\-\s]+/, '')
      } else if (lowerLine.includes('insight') || lowerLine.includes('observation')) {
        currentSection = 'insights'
      } else if (lowerLine.includes('recommend') || lowerLine.includes('suggest')) {
        currentSection = 'recommendations'
      } else if (lowerLine.includes('alert') || lowerLine.includes('concern') || lowerLine.includes('urgent')) {
        currentSection = 'alerts'
      } else {
        // Add content to current section
        const cleanLine = line.replace(/^[#*\-\s]+/, '').trim()
        if (cleanLine.length > 0) {
          switch (currentSection) {
            case 'summary':
              if (!dailySummary) dailySummary = cleanLine
              break
            case 'insights':
              insights.push(cleanLine)
              break
            case 'recommendations':
              recommendations.push(cleanLine)
              break
            case 'alerts':
              healthAlerts.push(cleanLine)
              break
            default:
              if (!dailySummary) dailySummary = cleanLine
          }
        }
      }
    }

    return {
      dailySummary: dailySummary || 'No summary available',
      insights: insights.length > 0 ? insights : ['No specific insights identified'],
      recommendations: recommendations.length > 0 ? recommendations : ['Continue monitoring'],
      healthAlerts: healthAlerts,
      confidence: healthAlerts.length === 0 ? 0.8 : 0.6, // Lower confidence if there are alerts
    }
  }
}

// Export singleton instance
export const logSummarizer = new LogSummarizer()