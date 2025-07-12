'use client'

import React from 'react'
import { ChatMessage } from '@/types/chat'

interface MessageRendererProps {
  message: ChatMessage
  isStreaming?: boolean
}

// Simple markdown parser for basic formatting
function parseMarkdown(text: string): string {
  let html = text
  
  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre class="bg-gray-900 text-gray-100 p-3 rounded-md overflow-x-auto my-2"><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`
  })
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
  
  // Links (including source citations)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-pasture-600 hover:text-pasture-700 underline" target="_blank" rel="noopener noreferrer">$1</a>')
  
  // Source citations with special styling
  html = html.replace(/\[Source: ([^\]]+)\]\(([^)]+)\)/g, '<div class="inline-block bg-pasture-50 text-pasture-800 px-2 py-1 rounded-md text-xs font-medium border border-pasture-200 ml-1"><a href="$2" class="hover:underline" target="_blank" rel="noopener noreferrer">📚 $1</a></div>')
  
  // Line breaks
  html = html.replace(/\n/g, '<br>')
  
  // Lists
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4">• $1</li>')
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4">$1. $2</li>')
  
  return html
}

// Add emoji enhancement for farming content
function enhanceWithEmojis(text: string): string {
  const emojiMap: Record<string, string> = {
    'sheep': '🐑',
    'cow': '🐄',
    'cattle': '🐄',
    'pig': '🐷',
    'chicken': '🐔',
    'farm': '🚜',
    'pasture': '🌾',
    'grass': '🌱',
    'water': '💧',
    'sun': '☀️',
    'rain': '🌧️',
    'weather': '🌤️',
    'health': '🏥',
    'feeding': '🥬',
    'grazing': '🌾',
    'breeding': '🤱',
    'vaccination': '💉',
    'medicine': '💊',
    'vet': '👨‍⚕️',
    'veterinarian': '👨‍⚕️',
    'observation': '👁️',
    'record': '📝',
    'log': '📋',
    'daily': '📅',
    'warning': '⚠️',
    'alert': '🚨',
    'success': '✅',
    'problem': '❌',
    'question': '❓',
    'tip': '💡',
    'recommendation': '💡'
  }

  let enhanced = text
  Object.entries(emojiMap).forEach(([word, emoji]) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    if (regex.test(enhanced) && !enhanced.includes(emoji)) {
      enhanced = enhanced.replace(regex, (match) => `${match} ${emoji}`)
    }
  })

  return enhanced
}

export default function MessageRenderer({ message, isStreaming }: MessageRendererProps) {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }

  const processedContent = enhanceWithEmojis(parseMarkdown(message.content))

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`${
        message.role === 'user' 
          ? 'chat-bubble-user' 
          : 'chat-bubble-ai border border-gray-200'
      } relative`}>
        <div 
          className="text-sm prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />
        
        <div className={`flex items-center justify-between mt-2 text-xs ${
          message.role === 'user' ? 'text-pasture-100' : 'text-gray-500'
        }`}>
          <span>{formatTime(message.timestamp)}</span>
          {message.model && message.role === 'assistant' && (
            <span className="ml-2 opacity-75">
              {message.model.split('/').pop()?.split(':')[0] || message.model}
            </span>
          )}
        </div>
        
        {isStreaming && (
          <div className="absolute bottom-1 right-1">
            <div className="w-2 h-2 bg-pasture-600 rounded-full animate-pulse"></div>
          </div>
        )}
        
        {message.metadata?.error && (
          <div className="mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
            Error: {message.metadata.error}
          </div>
        )}
      </div>
    </div>
  )
}