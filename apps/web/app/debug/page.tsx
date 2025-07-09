'use client'

import React, { useState } from 'react'
import { CacheUtils } from '@/lib/cache-utils'
import { AVAILABLE_MODELS } from '@/lib/chat'

export default function DebugPage() {
  const [status, setStatus] = useState('')

  const handleClearCache = async () => {
    setStatus('Clearing cached data...')
    const success = CacheUtils.clearAllChatData()
    if (success) {
      setStatus('✅ Cached data cleared successfully')
    } else {
      setStatus('❌ Failed to clear cached data')
    }
  }

  const handleClearServiceWorker = async () => {
    setStatus('Clearing service worker cache...')
    const success = await CacheUtils.clearServiceWorkerCache()
    if (success) {
      setStatus('✅ Service worker cache cleared')
    } else {
      setStatus('❌ Failed to clear service worker cache')
    }
  }

  const handleCheckInvalidModels = () => {
    setStatus('Checking for invalid model IDs...')
    const foundInvalid = CacheUtils.checkForInvalidModelIds()
    if (foundInvalid) {
      setStatus('❌ Found invalid model IDs in cached data')
    } else {
      setStatus('✅ No invalid model IDs found')
    }
  }

  const handleClearAllAndReload = async () => {
    setStatus('Clearing all data and reloading...')
    await CacheUtils.clearAllAndReload()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">🔧 PasturePilot Debug Console</h1>
          
          <div className="space-y-6">
            {/* Current Configuration */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-900 mb-3">Current Configuration</h2>
              <div className="space-y-2 text-sm">
                <div><strong>Available Models:</strong></div>
                <ul className="list-disc ml-6 space-y-1">
                  {AVAILABLE_MODELS.map(model => (
                    <li key={model.id}>
                      <code className="bg-gray-100 px-1 rounded">{model.id}</code> - {model.name}
                    </li>
                  ))}
                </ul>
                <div><strong>Default Model:</strong> <code className="bg-gray-100 px-1 rounded">{AVAILABLE_MODELS[0].id}</code></div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Debug Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={handleCheckInvalidModels}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Check for Invalid Model IDs
                </button>
                
                <button
                  onClick={handleClearCache}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Clear Chat Cache
                </button>
                
                <button
                  onClick={handleClearServiceWorker}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Clear Service Worker Cache
                </button>
                
                <button
                  onClick={handleClearAllAndReload}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Clear All & Reload
                </button>
              </div>
            </div>

            {/* Status */}
            {status && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-green-900 mb-2">Status</h2>
                <p className="text-green-800">{status}</p>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-yellow-900 mb-3">🚨 Troubleshooting</h2>
              <div className="space-y-2 text-sm text-yellow-800">
                <p><strong>If you're seeing "invalid model ID" errors:</strong></p>
                <ol className="list-decimal ml-6 space-y-1">
                  <li>Click "Check for Invalid Model IDs" to identify cached issues</li>
                  <li>Click "Clear All & Reload" to reset everything</li>
                  <li>If issues persist, check the browser console for errors</li>
                </ol>
                
                <p className="mt-3"><strong>For streaming issues:</strong></p>
                <ol className="list-decimal ml-6 space-y-1">
                  <li>Clear Service Worker Cache</li>
                  <li>Check network tab for failed requests</li>
                  <li>Verify OpenRouter API key is set correctly</li>
                </ol>
              </div>
            </div>

            {/* Navigation */}
            <div className="text-center">
              <a 
                href="/" 
                className="text-blue-600 hover:text-blue-800 underline"
              >
                ← Back to Chat
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 