'use client'

import React, { useState } from 'react'
import { MapPinIcon, CheckCircleIcon, ClockIcon, PlusIcon } from '@heroicons/react/24/outline'

interface DailyUpdateWorkflowProps {
  onUpdate: (update: string) => void
  farmId?: string
}

interface QuickTemplate {
  id: string
  name: string
  icon: React.ReactNode
  template: string
  placeholders: string[]
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: 'sheep_move',
    name: 'Sheep Movement',
    icon: <MapPinIcon className="w-5 h-5" />,
    template: 'Moved {count} sheep from {from} to {to}. {notes}',
    placeholders: ['count', 'from', 'to', 'notes']
  },
  {
    id: 'pasture_check',
    name: 'Pasture Check',
    icon: <CheckCircleIcon className="w-5 h-5" />,
    template: 'Checked {paddock} paddock. Grass condition: {condition}. Water: {water}. {notes}',
    placeholders: ['paddock', 'condition', 'water', 'notes']
  },
  {
    id: 'health_check',
    name: 'Health Check',
    icon: <ClockIcon className="w-5 h-5" />,
    template: 'Health check on {count} sheep in {location}. {observations}. {actions}',
    placeholders: ['count', 'location', 'observations', 'actions']
  },
  {
    id: 'feeding',
    name: 'Feeding',
    icon: <PlusIcon className="w-5 h-5" />,
    template: 'Fed {count} sheep in {location} with {feed}. {notes}',
    placeholders: ['count', 'location', 'feed', 'notes']
  }
]

export default function DailyUpdateWorkflow({ onUpdate, farmId }: DailyUpdateWorkflowProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<QuickTemplate | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [customUpdate, setCustomUpdate] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleTemplateSelect = (template: QuickTemplate) => {
    setSelectedTemplate(template)
    setFormData({})
  }

  const handleInputChange = (placeholder: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [placeholder]: value
    }))
  }

  const generateUpdate = () => {
    if (!selectedTemplate) return ''
    
    let update = selectedTemplate.template
    selectedTemplate.placeholders.forEach(placeholder => {
      const value = formData[placeholder] || ''
      update = update.replace(`{${placeholder}}`, value)
    })
    
    return update
  }

  const handleSubmitTemplate = async () => {
    const update = generateUpdate()
    if (update.trim()) {
      setIsLoading(true)
      try {
        await onUpdate(update)
        setSelectedTemplate(null)
        setFormData({})
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleSubmitCustom = async () => {
    if (customUpdate.trim()) {
      setIsLoading(true)
      try {
        await onUpdate(customUpdate)
        setCustomUpdate('')
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleBackToTemplates = () => {
    setSelectedTemplate(null)
    setFormData({})
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Daily Update 📝</h3>
        <span className="text-sm text-gray-500">
          {new Date().toLocaleDateString()}
        </span>
      </div>

      {!selectedTemplate ? (
        <>
          {/* Quick Templates */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Templates</h4>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-pasture-50 hover:border-pasture-300 transition-colors text-left"
                >
                  <div className="text-pasture-600 mr-3">
                    {template.icon}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">
                      {template.name}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Update */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Custom Update</h4>
            <div className="space-y-3">
              <textarea
                value={customUpdate}
                onChange={(e) => setCustomUpdate(e.target.value)}
                placeholder="Describe what happened today with your sheep... (e.g., 'Moved 45 ewes from south paddock to north paddock. Grass looking good, water trough full.')"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pasture-500 focus:border-pasture-500"
              />
              <button
                onClick={handleSubmitCustom}
                disabled={!customUpdate.trim() || isLoading}
                className="w-full bg-pasture-600 text-white py-2 px-4 rounded-md hover:bg-pasture-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Processing...' : 'Submit Update'}
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Template Form */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700 flex items-center">
              <span className="text-pasture-600 mr-2">
                {selectedTemplate.icon}
              </span>
              {selectedTemplate.name}
            </h4>
            <button
              onClick={handleBackToTemplates}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
          </div>

          <div className="space-y-3">
            {selectedTemplate.placeholders.map((placeholder) => (
              <div key={placeholder}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {placeholder.charAt(0).toUpperCase() + placeholder.slice(1)}
                </label>
                <input
                  type="text"
                  value={formData[placeholder] || ''}
                  onChange={(e) => handleInputChange(placeholder, e.target.value)}
                  placeholder={`Enter ${placeholder}...`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pasture-500 focus:border-pasture-500"
                />
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm text-gray-600 mb-1">Preview:</p>
            <p className="text-sm text-gray-900 font-medium">
              {generateUpdate() || 'Fill in the fields above to see preview...'}
            </p>
          </div>

          <button
            onClick={handleSubmitTemplate}
            disabled={!generateUpdate().trim() || isLoading}
            className="w-full bg-pasture-600 text-white py-2 px-4 rounded-md hover:bg-pasture-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Processing...' : 'Submit Update'}
          </button>
        </div>
      )}
    </div>
  )
} 