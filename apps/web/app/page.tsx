'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  MicrophoneIcon, 
  PaperAirplaneIcon, 
  CameraIcon,
  SunIcon,
  CloudIcon,
  CogIcon,
} from '@heroicons/react/24/outline'
import { MicrophoneIcon as MicrophoneIconSolid } from '@heroicons/react/24/solid'
import { sendChatMessage, ChatHistory, ChatLogger, AVAILABLE_MODELS } from '@/lib/chat'
import { ChatMessage } from '@/types/chat'
import ModelSelector from '@/components/ModelSelector'
import MessageRenderer from '@/components/MessageRenderer'

interface Message extends ChatMessage {
  // Extending ChatMessage for local use
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m PasturePilot, your AI farming assistant. 🐑 How can I help you with your livestock today? You can ask about sheep behavior, health, grazing conditions, or anything else on your mind.',
      timestamp: new Date(),
      type: 'text'
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id)
  const [showSettings, setShowSettings] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
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

    const currentInput = inputText.trim()
    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)
    setStreamingMessage('')

    // Add a placeholder AI message for streaming
    const aiMessageId = (Date.now() + 1).toString()
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: 'text',
      model: selectedModel
    }
    setMessages(prev => [...prev, aiMessage])

    const startTime = Date.now()

    try {
      const chatResponse = await sendChatMessage(
        [...messages, userMessage],
        selectedModel,
        (streamResponse) => {
          if (streamResponse.isComplete) {
            setMessages((prev: Message[]) => 
              prev.map((msg: Message) => 
                msg.id === aiMessageId 
                  ? { 
                      ...msg, 
                      content: streamResponse.message,
                      metadata: {
                        ...msg.metadata,
                        sources: (streamResponse as any).sources
                      }
                    }
                  : msg
              )
            )
            setStreamingMessage('')
            setIsLoading(false)

            // Log the interaction
            const responseTime = Date.now() - startTime
            ChatLogger.logInteraction({
              userMessage: currentInput,
              aiResponse: streamResponse.message,
              model: selectedModel,
              timestamp: new Date(),
              responseTime
            })

            // Save conversation
            ChatHistory.saveConversation([...messages, userMessage, {
              ...aiMessage,
              content: streamResponse.message,
              metadata: {
                ...aiMessage.metadata,
                sources: (streamResponse as any).sources
              }
            }])
          } else {
            setStreamingMessage(streamResponse.message)
            setMessages((prev: Message[]) => 
              prev.map((msg: Message) => 
                msg.id === aiMessageId 
                  ? { ...msg, content: streamResponse.message }
                  : msg
              )
            )
          }
        }
      )
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
      
      setMessages((prev: Message[]) => 
        prev.map((msg: Message) => 
          msg.id === aiMessageId 
            ? { 
                ...msg, 
                content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
                metadata: { error: errorMessage }
              }
            : msg
        )
      )
      setIsLoading(false)
      setStreamingMessage('')
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
          <div className="flex items-center space-x-3">
            <ModelSelector 
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              disabled={isLoading}
            />
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <SunIcon className="w-4 h-4" />
              <span>72°F</span>
              <CloudIcon className="w-4 h-4" />
            </div>
            <button
              onClick={() => window.location.href = '/farm'}
              className="p-2 text-gray-500 hover:text-pasture-600 transition-colors duration-200"
              aria-label="Farm management"
              title="Farm Management"
            >
              <span className="text-lg">🚜</span>
            </button>
            <button
              onClick={() => window.location.href = '/admin/agents'}
              className="p-2 text-gray-500 hover:text-pasture-600 transition-colors duration-200"
              aria-label="Admin settings"
            >
              <CogIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageRenderer
            key={message.id}
            message={message}
            isStreaming={isLoading && message.id === messages[messages.length - 1]?.id}
          />
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