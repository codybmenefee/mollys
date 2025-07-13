'use client'

import React from 'react'
import { PlayIcon, DocumentIcon, BookOpenIcon, GlobeAltIcon } from '@heroicons/react/24/outline'

interface SourceCitation {
  url: string
  title: string
  type: 'youtube' | 'article' | 'document' | 'manual'
  channelTitle?: string
  publishDate?: string
  relevanceScore?: number
}

interface SourceCitationsProps {
  sources: SourceCitation[]
}

export default function SourceCitations({ sources }: SourceCitationsProps) {
  if (!sources || sources.length === 0) {
    return null
  }

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'youtube':
        return <PlayIcon className="w-3.5 h-3.5 text-red-500" />
      case 'document':
        return <DocumentIcon className="w-3.5 h-3.5 text-blue-500" />
      case 'manual':
        return <BookOpenIcon className="w-3.5 h-3.5 text-green-500" />
      default:
        return <GlobeAltIcon className="w-3.5 h-3.5 text-gray-500" />
    }
  }

  const getSourceTypeColor = (type: string) => {
    switch (type) {
      case 'youtube':
        return 'bg-red-50 text-red-700 border-red-100'
      case 'document':
        return 'bg-blue-50 text-blue-700 border-blue-100'
      case 'manual':
        return 'bg-green-50 text-green-700 border-green-100'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100'
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.getFullYear()
    } catch {
      return null
    }
  }

  const formatYouTubeUrl = (url: string) => {
    // Extract video ID and ensure it's a proper YouTube URL
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
    if (videoIdMatch) {
      return `https://www.youtube.com/watch?v=${videoIdMatch[1]}`
    }
    return url
  }

  const truncateTitle = (title: string, maxLength: number = 80) => {
    if (title.length <= maxLength) return title
    return title.slice(0, maxLength) + '...'
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-3">
      <div className="text-xs font-medium text-gray-600 mb-3 flex items-center gap-1">
        <span>Sources</span>
        <span className="text-gray-400">({sources.length})</span>
      </div>
      
      <div className="space-y-2">
        {sources.map((source, index) => (
          <div key={index} className="group">
            <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all duration-200">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                  {index + 1}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  {getSourceIcon(source.type)}
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getSourceTypeColor(source.type)}`}>
                    {source.type === 'youtube' ? 'Video' : source.type.charAt(0).toUpperCase() + source.type.slice(1)}
                  </span>
                  {source.relevanceScore && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {Math.round(source.relevanceScore * 100)}% match
                    </span>
                  )}
                </div>
                
                <a 
                  href={source.type === 'youtube' ? formatYouTubeUrl(source.url) : source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors duration-200 block group-hover:underline"
                  title={source.title}
                >
                  {truncateTitle(source.title)}
                </a>
                
                {(source.channelTitle || source.publishDate) && (
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    {source.channelTitle && (
                      <span className="truncate max-w-[150px]" title={source.channelTitle}>
                        {source.channelTitle}
                      </span>
                    )}
                    {source.channelTitle && source.publishDate && (
                      <span className="text-gray-400">•</span>
                    )}
                    {source.publishDate && (
                      <span>{formatDate(source.publishDate)}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 