'use client'

import React, { useState, useEffect } from 'react'
import { 
  ChevronDownIcon, 
  ChevronUpIcon, 
  PlayIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  BoltIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline'
import { AVAILABLE_MODELS } from '@/lib/chat'
import { AgentRegistry, AgentConfig } from '@/lib/agents'

interface AgentCardProps {
  agent: AgentConfig
  onUpdate: (updatedAgent: AgentConfig) => void
  onTest: (agent: AgentConfig, testMessage?: string) => void
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
      onTest(localAgent, testInput.trim())
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
              {agent.description && (
                <p className="text-xs text-gray-400 mt-1">{agent.description}</p>
              )}
              {agent.capabilities && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {agent.capabilities.slice(0, 3).map((capability) => (
                    <span
                      key={capability}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pasture-100 text-pasture-800"
                    >
                      <BoltIcon className="w-3 h-3 mr-1" />
                      {capability.replace('_', ' ')}
                    </span>
                  ))}
                  {agent.capabilities.length > 3 && (
                    <span className="text-xs text-gray-400">
                      +{agent.capabilities.length - 3} more
                    </span>
                  )}
                </div>
              )}
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
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [expandedAgents, setExpandedAgents] = useState<string[]>([])
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [agentStats, setAgentStats] = useState<any>(null)

  // Load real agents from the registry on component mount
  useEffect(() => {
    const discoveredAgents = AgentRegistry.discoverAgents()
    setAgents(discoveredAgents)
    setAgentStats(AgentRegistry.getAgentStats())
  }, [])

  const handleUpdateAgent = (updatedAgent: AgentConfig) => {
    const success = AgentRegistry.updateAgent(updatedAgent.id, updatedAgent)
    if (success) {
      const newAgents = agents.map(agent => 
        agent.id === updatedAgent.id ? updatedAgent : agent
      )
      setAgents(newAgents)
      setLastSaved(new Date())
      setAgentStats(AgentRegistry.getAgentStats())
    }
  }

  const handleTestAgent = async (agent: AgentConfig, testMessage: string = 'Hello, can you help me with my sheep?') => {
    try {
      const testResult = await AgentRegistry.testAgent(agent, testMessage)
      if (testResult.success) {
        console.log(`✅ ${agent.name} test successful:`, testResult.response)
        console.log(`⏱️ Response time: ${testResult.responseTime}ms`)
        alert(`✅ Test successful!\n\nAgent: ${agent.name}\nResponse: ${testResult.response}\nTime: ${testResult.responseTime}ms`)
      } else {
        console.error(`❌ ${agent.name} test failed:`, testResult.error)
        alert(`❌ Test failed!\n\nAgent: ${agent.name}\nError: ${testResult.error}`)
      }
    } catch (error) {
      console.error('Test error:', error)
      alert(`❌ Test error: ${error}`)
    }
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
      const success = AgentRegistry.resetAllAgents()
      if (success) {
        const refreshedAgents = AgentRegistry.discoverAgents()
        setAgents(refreshedAgents)
        setLastSaved(new Date())
        setAgentStats(AgentRegistry.getAgentStats())
      }
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
        <div className="flex items-start space-x-3">
          <CheckCircleIcon className="w-6 h-6 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-800">
              Real Agent Discovery System
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Showing {agentStats?.totalAgents || 0} real agents from your codebase. 
                {agentStats?.activeAgents || 0} are currently active.
              </p>
              {agentStats?.availableCapabilities && (
                <p className="mt-1 text-xs">
                  Available capabilities: {agentStats.availableCapabilities.join(', ')}
                </p>
              )}
              <p className="mt-1 text-xs">
                Changes are saved automatically. New agents will be discovered automatically when added.
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