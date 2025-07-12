'use client'

import React, { useState } from 'react'
import { ArrowLeftIcon, ChatBubbleLeftIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import DailyUpdateWorkflow from '@/components/DailyUpdateWorkflow'
import FarmInsightsDashboard from '@/components/FarmInsightsDashboard'
import { FarmProfileManager } from '@/lib/farm-profile'

export default function FarmPage() {
  const [activeTab, setActiveTab] = useState<'updates' | 'insights'>('updates')
  const [farmId] = useState('default') // For MVP, use a default farm ID
  const [dashboardKey, setDashboardKey] = useState(0) // Force dashboard refresh

  const handleUpdate = async (update: string) => {
    // First extract knowledge from the update
    try {
      console.log('🔄 Starting update process for:', update)
      
      const knowledgeResponse = await fetch('/api/agents/knowledge-extractor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: update,
          farmId,
          date: new Date().toISOString()
        })
      })

      let extractedKnowledge = null
      if (knowledgeResponse.ok) {
        const knowledgeData = await knowledgeResponse.json()
        console.log('📊 Knowledge extraction response:', knowledgeData)
        
        if (knowledgeData.success) {
          extractedKnowledge = knowledgeData.extracted
          
          // Update farm profile on client side
          try {
            FarmProfileManager.updateWithKnowledge(farmId, extractedKnowledge, update)
            console.log('✅ Farm profile updated with extracted knowledge')
          } catch (profileError) {
            console.warn('⚠️ Farm profile update failed:', profileError)
            // Don't fail the whole process if profile update fails
          }
        }
      } else {
        console.warn('⚠️ Knowledge extraction failed:', knowledgeResponse.status)
      }

      // Send update to chat API for AI response
      console.log('💬 Sending to chat API...')
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: update }
          ],
          farmId,
          stream: false
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Chat API response received')
        
        // Refresh the dashboard to show new data
        setDashboardKey(prev => prev + 1)
        
        // Show success message
        let knowledgeCount = 0
        if (extractedKnowledge) {
          Object.keys(extractedKnowledge).forEach(key => {
            const value = extractedKnowledge[key]
            if (Array.isArray(value) && value.length > 0) {
              knowledgeCount++
            } else if (value && typeof value === 'object' && Object.keys(value).length > 0) {
              knowledgeCount++
            } else if (value && typeof value === 'string' && value.trim().length > 0) {
              knowledgeCount++
            }
          })
        }
        
        const successMessage = knowledgeCount > 0
          ? `✅ Update logged and ${knowledgeCount} knowledge areas updated!`
          : `✅ Update logged successfully!`
        alert(successMessage)
      } else {
        const errorText = await response.text()
        console.error('❌ Chat API error:', response.status, errorText)
        throw new Error(`Chat API failed: ${response.status}`)
      }
    } catch (error) {
      console.error('❌ Error processing update:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`❌ Failed to process update: ${errorMessage}. Please check the console for details.`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link
                href="/"
                className="flex items-center text-gray-500 hover:text-gray-700 mr-4"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Back to Chat
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-pasture-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">🐑</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Farm Management</h1>
                  <p className="text-sm text-gray-500">Daily updates & insights</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('updates')}
              className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'updates'
                  ? 'border-pasture-500 text-pasture-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ChatBubbleLeftIcon className="w-5 h-5 mr-2" />
              Daily Updates
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'insights'
                  ? 'border-pasture-500 text-pasture-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ChartBarIcon className="w-5 h-5 mr-2" />
              Farm Insights
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'updates' && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Daily Updates</h2>
              <p className="text-gray-600">
                Log your daily sheep movements and activities. The AI will automatically 
                extract and learn from your updates to build a comprehensive farm profile.
              </p>
            </div>
            
            <DailyUpdateWorkflow 
              onUpdate={handleUpdate} 
              farmId={farmId} 
            />
            
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">💡 How it works:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use quick templates for common activities like sheep movements</li>
                <li>• Or write custom updates in natural language</li>
                <li>• AI automatically extracts paddock names, animal counts, and activities</li>
                <li>• Your farm profile builds knowledge over time</li>
                <li>• Get personalized insights and recommendations</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Farm Insights</h2>
              <p className="text-gray-600">
                See what PasturePilot has learned about your farm, animals, and routines.
              </p>
            </div>
            
            <FarmInsightsDashboard key={dashboardKey} farmId={farmId} />
          </div>
        )}
      </div>
    </div>
  )
} 