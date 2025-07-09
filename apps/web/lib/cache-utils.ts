/**
 * Cache utilities for clearing browser storage and cached data
 * Useful for resolving issues with outdated model IDs or cached state
 */

import { ChatHistory, ChatLogger } from './chat'

export class CacheUtils {
  /**
   * Clear all cached chat data including conversations and logs
   */
  static clearAllChatData() {
    try {
      ChatHistory.clearAll()
      ChatLogger.clearLogs()
      
      // Clear any other localStorage keys that might have cached model data
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (
          key.includes('model') || 
          key.includes('chat') || 
          key.includes('pasturepilot')
        )) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      console.log('✅ Cleared all cached chat data')
      return true
    } catch (error) {
      console.error('Failed to clear cached data:', error)
      return false
    }
  }

  /**
   * Clear service worker cache
   */
  static async clearServiceWorkerCache() {
    if ('serviceWorker' in navigator && 'caches' in window) {
      try {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        )
        console.log('✅ Cleared service worker cache')
        return true
      } catch (error) {
        console.error('Failed to clear service worker cache:', error)
        return false
      }
    }
    return false
  }

  /**
   * Clear all cached data and reload the page
   */
  static async clearAllAndReload() {
    this.clearAllChatData()
    await this.clearServiceWorkerCache()
    
    // Force reload from server
    window.location.reload()
  }

  /**
   * Check for invalid model IDs in cached conversations
   */
  static checkForInvalidModelIds() {
    try {
      const conversations = ChatHistory.getConversations()
      const logs = ChatLogger.getLogs()
      
      const invalidModelIds = ['mistral/mixtral-8x7b-instruct:nitro']
      let foundInvalid = false

      // Check conversations
      conversations.forEach((conv: any) => {
        conv.messages?.forEach((msg: any) => {
          if (msg.model && invalidModelIds.includes(msg.model)) {
            foundInvalid = true
            console.warn('Found invalid model ID in conversation:', msg.model)
          }
        })
      })

      // Check logs
      logs.forEach((log: any) => {
        if (log.model && invalidModelIds.includes(log.model)) {
          foundInvalid = true
          console.warn('Found invalid model ID in log:', log.model)
        }
      })

      if (foundInvalid) {
        console.log('❌ Found invalid model IDs in cached data')
        console.log('💡 Run CacheUtils.clearAllAndReload() to fix')
      } else {
        console.log('✅ No invalid model IDs found in cached data')
      }

      return foundInvalid
    } catch (error) {
      console.error('Error checking for invalid model IDs:', error)
      return false
    }
  }
}

// Development helper - expose to window in dev mode
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).CacheUtils = CacheUtils
} 