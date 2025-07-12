// Agent Registry - Discovers and manages real agents in the system
import { AVAILABLE_MODELS } from './chat'

export interface AgentConfig {
  id: string
  name: string
  description: string
  model: string
  systemPrompt: string
  capabilities: string[]
  endpoint?: string
  isActive: boolean
  lastUpdated: Date
}

export interface AgentDefinition {
  id: string
  name: string
  description: string
  capabilities: string[]
  defaultModel: string
  systemPrompt: string
  endpoint?: string
}

// Real agent definitions discovered from the codebase
const DISCOVERED_AGENTS: AgentDefinition[] = [
  {
    id: 'kb-retriever',
    name: 'KBRetrieverAgent',
    description: 'Retrieves relevant information from knowledge base for enhanced responses with source citations',
    capabilities: ['knowledge_retrieval', 'source_citation', 'farming_insights', 'contextual_assistance'],
    defaultModel: 'mistralai/mistral-7b-instruct',
    systemPrompt: `You are a specialized farm insights generator that retrieves and synthesizes information from the knowledge base.
Your role:
- Provide detailed farming advice based on ingested knowledge sources
- Always cite sources when referencing specific information
- Combine knowledge base content with general farming expertise
- Focus on practical, actionable insights for sheep farmers
- Include source URLs for verification and further reading

When responding:
- Use retrieved knowledge to provide specific, detailed advice
- Cite sources as: [Source: Title](URL)
- Combine multiple sources when relevant
- Prioritize recent and high-quality sources
- Always verify claims against retrieved content`,
    endpoint: '/api/kb/chat'
  },
  {
    id: 'chat',
    name: 'ChatAgent',
    description: 'Main conversational agent for general farming assistance and guidance',
    capabilities: ['conversation', 'farming_advice', 'real_time_help'],
    defaultModel: 'mistral/mixtral-8x7b-instruct:nitro',
    systemPrompt: `You are PasturePilot, an AI assistant specialized in regenerative livestock farming. You help farmers with:
- Sheep health, behavior, and welfare
- Pasture management and rotational grazing
- Regenerative farming practices
- Weather-related farming decisions
- Daily livestock observations and logging

Always be practical, supportive, and focus on sustainable farming practices. Use farming-related emojis when appropriate (🐑 🌱 📝 🌾 🚜). Keep responses concise but helpful.`,
    endpoint: '/api/chat'
  },
  {
    id: 'summarizer',
    name: 'LogSummarizer',
    description: 'Analyzes daily farming logs and provides actionable insights and recommendations',
    capabilities: ['log_analysis', 'daily_summaries', 'health_pattern_detection', 'recommendations'],
    defaultModel: 'openai/gpt-4-turbo-preview',
    systemPrompt: `You are an expert sheep farming advisor with deep knowledge of regenerative agriculture practices. 
You analyze daily farming logs and provide actionable insights and recommendations.

Guidelines:
- Focus on sheep health, behavior, and grazing patterns
- Identify potential health issues early
- Suggest regenerative farming practices
- Consider weather and seasonal factors
- Provide practical, actionable advice
- Be concise but thorough
- Highlight any urgent concerns as health alerts`,
    endpoint: '/api/agents/summarizer'
  },
  {
    id: 'voice',
    name: 'VoiceAgent',
    description: 'Transcribes voice recordings and processes them for farming context',
    capabilities: ['voice_transcription', 'speech_to_text', 'context_processing'],
    defaultModel: 'openai/whisper-1',
    systemPrompt: 'You process voice recordings from farmers in the field and convert them to structured text for logging and analysis.',
    endpoint: '/api/analyze'
  },
  {
    id: 'vision',
    name: 'VisionAgent',
    description: 'Analyzes images of livestock, pastures, and farm conditions',
    capabilities: ['image_analysis', 'livestock_health', 'pasture_assessment', 'visual_monitoring'],
    defaultModel: 'openai/gpt-4-vision-preview',
    systemPrompt: 'You analyze images related to sheep farming, including livestock health assessment, pasture conditions, and general farm monitoring. Provide practical insights and identify any concerns.',
    endpoint: '/api/analyze'
  }
]

export class AgentRegistry {
  private static STORAGE_KEY = 'pasturepilot_agent_registry'
  
  /**
   * Discover and return all available agents in the system
   */
  static discoverAgents(): AgentConfig[] {
    const savedConfigs = this.loadSavedConfigs()
    
    return DISCOVERED_AGENTS.map(definition => {
      const savedConfig = savedConfigs.find(config => config.id === definition.id)
      
      return {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        model: savedConfig?.model || definition.defaultModel,
        systemPrompt: savedConfig?.systemPrompt || definition.systemPrompt,
        capabilities: definition.capabilities,
        endpoint: definition.endpoint,
        isActive: savedConfig?.isActive ?? true,
        lastUpdated: savedConfig?.lastUpdated || new Date()
      }
    })
  }

  /**
   * Get a specific agent configuration
   */
  static getAgent(agentId: string): AgentConfig | null {
    const agents = this.discoverAgents()
    return agents.find(agent => agent.id === agentId) || null
  }

  /**
   * Update an agent's configuration
   */
  static updateAgent(agentId: string, updates: Partial<AgentConfig>): boolean {
    try {
      const savedConfigs = this.loadSavedConfigs()
      const existingIndex = savedConfigs.findIndex(config => config.id === agentId)
      
      const updatedConfig = {
        id: agentId,
        ...updates,
        lastUpdated: new Date()
      }

      if (existingIndex >= 0) {
        savedConfigs[existingIndex] = { ...savedConfigs[existingIndex], ...updatedConfig }
      } else {
        savedConfigs.push(updatedConfig as AgentConfig)
      }

      this.saveConfigs(savedConfigs)
      return true
    } catch (error) {
      console.error('Failed to update agent:', error)
      return false
    }
  }

  /**
   * Reset an agent to its default configuration
   */
  static resetAgent(agentId: string): boolean {
    try {
      const definition = DISCOVERED_AGENTS.find(def => def.id === agentId)
      if (!definition) return false

      return this.updateAgent(agentId, {
        model: definition.defaultModel,
        systemPrompt: definition.systemPrompt,
        isActive: true
      })
    } catch (error) {
      console.error('Failed to reset agent:', error)
      return false
    }
  }

  /**
   * Reset all agents to default configurations
   */
  static resetAllAgents(): boolean {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
      return true
    } catch (error) {
      console.error('Failed to reset all agents:', error)
      return false
    }
  }

  /**
   * Test an agent with a sample message
   */
  static async testAgent(agentConfig: AgentConfig, testMessage: string): Promise<{
    success: boolean
    response?: string
    error?: string
    responseTime?: number
  }> {
    const startTime = Date.now()
    
    try {
      if (!agentConfig.endpoint) {
        throw new Error('Agent endpoint not configured')
      }

      let response: Response

      if (agentConfig.id === 'chat') {
        // Use chat endpoint
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'user', content: testMessage }
            ],
            model: agentConfig.model,
            stream: false
          })
        })
      } else if (agentConfig.id === 'summarizer') {
        // Use dedicated summarizer endpoint
        response = await fetch('/api/agents/summarizer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'user', content: testMessage }
            ],
            model: agentConfig.model,
            context: `Testing ${agentConfig.name} with: ${testMessage}`
          })
        })
      } else {
        // Use analyze endpoint for voice/vision agents
        response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: agentConfig.id === 'voice' ? 'voice' : 'image',
            data: testMessage,
            context: `Testing ${agentConfig.name} with: ${testMessage}`
          })
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Test request failed')
      }

      const data = await response.json()
      const responseTime = Date.now() - startTime

      return {
        success: true,
        response: data.message || data.analysis || data.choices?.[0]?.message?.content || 'Test completed successfully',
        responseTime
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        responseTime: Date.now() - startTime
      }
    }
  }

  /**
   * Get agent statistics and health status
   */
  static getAgentStats(): {
    totalAgents: number
    activeAgents: number
    lastUpdated: Date | null
    availableCapabilities: string[]
  } {
    const agents = this.discoverAgents()
    const activeAgents = agents.filter(agent => agent.isActive)
    const allCapabilities = agents.flatMap(agent => agent.capabilities)
    const uniqueCapabilities = Array.from(new Set(allCapabilities))
    
    const lastUpdated = agents.reduce((latest, agent) => {
      return !latest || agent.lastUpdated > latest ? agent.lastUpdated : latest
    }, null as Date | null)

    return {
      totalAgents: agents.length,
      activeAgents: activeAgents.length,
      lastUpdated,
      availableCapabilities: uniqueCapabilities
    }
  }

  /**
   * Load saved configurations from localStorage
   */
  private static loadSavedConfigs(): Partial<AgentConfig>[] {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error('Failed to load saved agent configs:', error)
      return []
    }
  }

  /**
   * Save configurations to localStorage
   */
  private static saveConfigs(configs: Partial<AgentConfig>[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs))
      console.log('Agent configurations saved successfully')
      // TODO: Future Supabase sync
      // await this.syncToDatabase(configs)
    } catch (error) {
      console.error('Failed to save agent configs:', error)
    }
  }

  /**
   * Check if new agents have been added (for auto-discovery)
   */
  static checkForNewAgents(): { newAgents: AgentDefinition[], hasNewAgents: boolean } {
    const currentAgents = this.discoverAgents()
    const currentIds = new Set(currentAgents.map(agent => agent.id))
    const newAgents = DISCOVERED_AGENTS.filter(def => !currentIds.has(def.id))
    
    return {
      newAgents,
      hasNewAgents: newAgents.length > 0
    }
  }
}

// Export singleton instance for convenience
export const agentRegistry = AgentRegistry 