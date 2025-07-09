import React from 'react'
import Link from 'next/link'
import { CogIcon, ChatBubbleLeftIcon, ChartBarIcon } from '@heroicons/react/24/outline'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-pasture-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">🐑</span>
                </div>
                <span className="text-xl font-bold text-gray-900">PasturePilot Admin</span>
              </Link>
            </div>
            <nav className="flex space-x-6">
              <Link 
                href="/admin/agents" 
                className="flex items-center space-x-2 text-gray-600 hover:text-pasture-600 transition-colors"
              >
                <CogIcon className="w-5 h-5" />
                <span>Agents</span>
              </Link>
              <Link 
                href="/" 
                className="flex items-center space-x-2 text-gray-600 hover:text-pasture-600 transition-colors"
              >
                <ChatBubbleLeftIcon className="w-5 h-5" />
                <span>Back to Chat</span>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}