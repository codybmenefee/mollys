'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  MicrophoneIcon, 
  PaperAirplaneIcon, 
  CameraIcon,
  SunIcon,
  CloudIcon,
} from '@heroicons/react/24/outline'
import { MicrophoneIcon as MicrophoneIconSolid } from '@heroicons/react/24/solid'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type?: 'text' | 'voice' | 'image'
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI farming assistant. How can I help you with your sheep today? You can tell me about their behavior, health, grazing conditions, or anything else on your mind.',
      timestamp: new Date(),
      type: 'text'
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(scrollToBottom, [messages])

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
      type: 'text'
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you mentioned "${inputText.trim()}". That's a great observation about your sheep! Based on what you've shared, I'd recommend monitoring their behavior over the next few days and ensuring they have access to fresh water and quality pasture. Would you like me to help you create a daily log entry for this observation?`,
        timestamp: new Date(),
        type: 'text'
      }

      setMessages(prev => [...prev, aiResponse])
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const toggleRecording = () => {
    setIsRecording(!isRecording)
    // TODO: Implement voice recording with Whisper API
    if (!isRecording) {
      // Start recording
      console.log('Starting voice recording...')
    } else {
      // Stop recording and process
      console.log('Stopping voice recording...')
    }
  }

  const handleImageUpload = () => {
    // TODO: Implement image upload and analysis
    console.log('Opening camera/image picker...')
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }

  return (
    <main className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-pasture-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">🐑</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">PasturePilot</h1>
              <p className="text-sm text-gray-500">Your AI Farming Assistant</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <SunIcon className="w-4 h-4" />
            <span>72°F</span>
            <CloudIcon className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`${
              message.role === 'user' 
                ? 'chat-bubble-user' 
                : 'chat-bubble-ai border border-gray-200'
            }`}>
              <p className="text-sm">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-pasture-100' : 'text-gray-500'
              }`}>
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="chat-bubble-ai border border-gray-200">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 p-4 safe-bottom">
        <div className="flex items-end space-x-2">
          <button
            onClick={handleImageUpload}
            className="flex-shrink-0 p-2 text-gray-500 hover:text-pasture-600 transition-colors duration-200"
            aria-label="Upload image"
          >
            <CameraIcon className="w-6 h-6" />
          </button>
          
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tell me about your sheep or ask a question..."
              className="input-field resize-none min-h-[44px] max-h-32 pr-12"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              className="absolute right-2 top-2 p-2 text-pasture-600 hover:text-pasture-700 disabled:text-gray-300 transition-colors duration-200"
              aria-label="Send message"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
          
          <button
            onClick={toggleRecording}
            className={`flex-shrink-0 p-3 rounded-full transition-all duration-200 ${
              isRecording 
                ? 'bg-red-600 text-white recording-pulse' 
                : 'bg-pasture-600 text-white hover:bg-pasture-700'
            }`}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? (
              <MicrophoneIconSolid className="w-6 h-6" />
            ) : (
              <MicrophoneIcon className="w-6 h-6" />
            )}
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500 text-center">
          Tap the mic to record voice notes • Take photos to analyze livestock
        </div>
      </div>
    </main>
  )
}