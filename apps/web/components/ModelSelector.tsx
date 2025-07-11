'use client'

import React, { useState } from 'react'
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline'
import { AVAILABLE_MODELS } from '@/lib/chat'
import { ModelConfig } from '@/types/chat'

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
  disabled?: boolean
}

export default function ModelSelector({ selectedModel, onModelChange, disabled }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const currentModel = AVAILABLE_MODELS.find(model => model.id === selectedModel) || AVAILABLE_MODELS[0]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center space-x-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pasture-500 focus:border-pasture-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex-1 text-left">
          <div className="font-medium text-gray-900">{currentModel.name}</div>
          <div className="text-xs text-gray-500 truncate max-w-40">
            {currentModel.description}
          </div>
        </div>
        <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-2 py-1 mb-1">
                Available Models
              </div>
              {AVAILABLE_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelChange(model.id)
                    setIsOpen(false)
                  }}
                  className="flex items-center w-full px-3 py-2 text-sm rounded-md hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                >
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900">{model.name}</div>
                    <div className="text-xs text-gray-500">{model.description}</div>
                  </div>
                  {model.id === selectedModel && (
                    <CheckIcon className="w-4 h-4 text-pasture-600" />
                  )}
                </button>
              ))}
            </div>
            
            <div className="border-t border-gray-100 p-2">
              <div className="text-xs text-gray-400 px-2">
                💡 Mistral 7B is recommended for most farming questions
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}