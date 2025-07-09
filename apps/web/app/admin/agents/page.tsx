'use client'

import React, { useState, useEffect } from 'react'
import { 
  ChevronDownIcon, 
  ChevronUpIcon, 
  PlayIcon,
  CheckIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline'
import { AVAILABLE_MODELS } from '@/lib/chat'

// Agent configuration types
export interface AgentConfig {
  id: string
  name: string
  model: string
  systemPrompt: string
}

// Default agent configurations
const defaultAgents: AgentConfig[] = [
  {
    id: 'chat',
    name: 'ChatAgent',
    model: 'mistral/mixtral-8x7b-instruct:nitro',
    systemPrompt: 'You are a friendly farming assistant who answers questions and supports grazing decisions.'
  },
  {
    id: 'log',
    name: 'LoggingAgent',
    model: 'openai/gpt-3.5-turbo',
    systemPrompt: 'You turn short observations into structured farm log entries.'
  },
  {
    id: 'media',
    name: 'MediaAgent',
    model: 'openai/gpt-4-vision-preview',
    systemPrompt: 'You analyze sheep health and pasture quality from images.'
  },
]

interface AgentCardProps {
  agent: AgentConfig
  onUpdate: (updatedAgent: AgentConfig) => void
  onTest: (agent: AgentConfig) => void
  isExpanded: boolean
  onToggleExpand: () => void
}

function AgentCard({ agent, onUpdate, onTest, isExpanded, onToggleExpand }: AgentCardProps) {
  const [localAgent, setLocalAgent] = useState<AgentConfig>(agent)
  const [hasChanges, setHasChanges] = useState(false)
  const [testInput, setTestInput] = useState('')
  const [showTestModal, setShowTestModal] = useState(false)

  // Check for changes when local agent updates
  useEffect(() => {
    const changes = 
      localAgent.model !== agent.model || 
      localAgent.systemPrompt !== agent.systemPrompt
    setHasChanges(changes)
  }, [localAgent, agent])

  const handleSave = () => {
    onUpdate(localAgent)
    setHasChanges(false)
  }

  const handleModelChange = (modelId: string) => {
    setLocalAgent(prev => ({ ...prev, model: modelId }))
  }

  const handleSystemPromptChange = (prompt: string) => {
    setLocalAgent(prev => ({ ...prev, systemPrompt: prompt }))
  }

  const handleTest = () => {
    if (testInput.trim()) {
      onTest({ ...localAgent, id: agent.id + '_test', name: agent.name + ' Test' })
      setShowTestModal(false)
      setTestInput('')
    }
  }

  const selectedModel = AVAILABLE_MODELS.find(m => m.id === localAgent.model)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div 
        className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-pasture-100 rounded-lg flex items-center justify-center">
              <span className="text-pasture-600 font-bold text-lg">
                {agent.name.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
              <p className="text-sm text-gray-500">
                Model: {selectedModel?.name || agent.model}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {hasChanges && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                Unsaved changes
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowTestModal(true)
              }}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <PlayIcon className="w-4 h-4 mr-1" />
              Test
            </button>
            {isExpanded ? (
              <ChevronUpIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 py-4 space-y-6">
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model
            </label>
            <select
              value={localAgent.model}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pasture-500 focus:border-pasture-500"
            >
              {AVAILABLE_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} - {model.description}
                </option>
              ))}
            </select>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              System Prompt
            </label>
            <textarea
              value={localAgent.systemPrompt}
              onChange={(e) => handleSystemPromptChange(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pasture-500 focus:border-pasture-500 resize-vertical"
              placeholder="Enter the system prompt for this agent..."
            />
          </div>

          {/* Save Button */}
          {hasChanges && (
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-pasture-600 hover:bg-pasture-700 focus:ring-2 focus:ring-offset-2 focus:ring-pasture-500 transition-colors"
              >
                <CheckIcon className="w-4 h-4 mr-1" />
                Save Changes
              </button>
            </div>
          )}
        </div>
      )}

      {/* Test Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Test {agent.name}
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Message
                </label>
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pasture-500 focus:border-pasture-500"
                  placeholder="Enter a test message..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTest}
                  disabled={!testInput.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-pasture-600 hover:bg-pasture-700 disabled:bg-gray-300 rounded-md transition-colors"
                >
                  Test Agent
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentConfig[]>(defaultAgents)
  const [expandedAgents, setExpandedAgents] = useState<string[]>([])
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Load agents from localStorage on component mount
  useEffect(() => {
    const savedAgents = localStorage.getItem('pasturepilot_agent_configs')
    if (savedAgents) {
      try {
        const parsed = JSON.parse(savedAgents)
        setAgents(parsed)
      } catch (error) {
        console.error('Failed to load agent configs:', error)
      }
    }
  }, [])

  // Save agents to localStorage whenever agents change
  const saveAgents = (updatedAgents: AgentConfig[]) => {
    try {
      localStorage.setItem('pasturepilot_agent_configs', JSON.stringify(updatedAgents))
      setLastSaved(new Date())
      console.log('Agent configurations saved to localStorage')
      // TODO: In the future, this is where we'd save to Supabase
      // await supabase.from('agent_configs').upsert(updatedAgents)
    } catch (error) {
      console.error('Failed to save agent configs:', error)
    }
  }

  const handleUpdateAgent = (updatedAgent: AgentConfig) => {
    const newAgents = agents.map(agent => 
      agent.id === updatedAgent.id ? updatedAgent : agent
    )
    setAgents(newAgents)
    saveAgents(newAgents)
  }

  const handleTestAgent = async (agent: AgentConfig) => {
    console.log('Testing agent:', agent)
    console.log('This would send a test message to:', agent.model)
    console.log('With system prompt:', agent.systemPrompt)
    
    // TODO: Implement actual test functionality
    // try {
    //   const testMessage = { role: 'user', content: testInput }
    //   const response = await sendChatMessage([testMessage], agent.model)
    //   console.log('Test response:', response)
    // } catch (error) {
    //   console.error('Test failed:', error)
    // }
  }

  const toggleAgentExpanded = (agentId: string) => {
    setExpandedAgents(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    )
  }

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all agents to their default configurations? This cannot be undone.')) {
      setAgents(defaultAgents)
      saveAgents(defaultAgents)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agent Management</h1>
          <p className="mt-2 text-gray-600">
            Configure the behavior and models for your PasturePilot agents
          </p>
          {lastSaved && (
            <p className="mt-1 text-sm text-green-600">
              Last saved: {lastSaved.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={resetToDefaults}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Reset to Defaults
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Local Configuration
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Agent configurations are currently stored locally in your browser. 
                Changes are saved automatically and will persist across sessions.
              </p>
              <p className="mt-1 text-xs">
                {/* TODO: Future database integration comment */}
                Future update: Will sync with Supabase for persistent storage across devices.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Cards */}
      <div className="space-y-4">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onUpdate={handleUpdateAgent}
            onTest={handleTestAgent}
            isExpanded={expandedAgents.includes(agent.id)}
            onToggleExpand={() => toggleAgentExpanded(agent.id)}
          />
        ))}
      </div>
    </div>
  )
}