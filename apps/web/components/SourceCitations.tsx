'use client'

import React from 'react'
import { LinkIcon, PlayIcon, DocumentIcon, BookOpenIcon } from '@heroicons/react/24/outline'

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
        return <PlayIcon className="w-4 h-4" />
      case 'document':
        return <DocumentIcon className="w-4 h-4" />
      case 'manual':
        return <BookOpenIcon className="w-4 h-4" />
      default:
        return <LinkIcon className="w-4 h-4" />
    }
  }

  const getSourceTypeLabel = (type: string) => {
    switch (type) {
      case 'youtube':
        return 'Video'
      case 'document':
        return 'Document'
      case 'manual':
        return 'Manual'
      default:
        return 'Article'
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).getFullYear()
    } catch {
      return null
    }
  }

  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      <div className="text-xs text-gray-500 mb-2 font-medium">
        📚 Sources used in this response:
      </div>
      <div className="space-y-2">
        {sources.map((source, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0 mt-0.5 text-gray-500">
                {getSourceIcon(source.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {getSourceTypeLabel(source.type)}
                  </span>
                  {source.relevanceScore && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {(source.relevanceScore * 100).toFixed(0)}% relevant
                    </span>
                  )}
                </div>
                <a 
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors line-clamp-2 mt-1 block"
                >
                  {source.title}
                </a>
                {source.channelTitle && (
                  <div className="text-xs text-gray-500 mt-1">
                    by {source.channelTitle}
                    {source.publishDate && ` • ${formatDate(source.publishDate)}`}
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