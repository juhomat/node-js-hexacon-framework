'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { TokenUsageDisplay } from '@/components/chat/TokenUsageDisplay'

interface ChatConfiguration {
  model: string
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  stream: boolean
}

export default function AIChatTestPage() {
  const [configuration, setConfiguration] = useState<ChatConfiguration>({
    model: 'gpt-5',
    temperature: 1, // GPT-5 only supports temperature=1
    maxTokens: 2000,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stream: true
  })

  const [chatStats, setChatStats] = useState({
    totalTokens: 0,
    totalCost: 0,
    messageCount: 0,
    averageResponseTime: 0
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="inline-flex items-center text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Admin
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <MessageSquare className="h-8 w-8 mr-3 text-blue-600" />
              AI Chat Testing
            </h1>
            <p className="text-gray-600 mt-1">
              Test OpenAI chat functionality with streaming support and multiple models
            </p>
          </div>
        </div>
        

      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface - Main Column */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Chat Interface
              </h2>
            </div>
            
            <ChatInterface 
              configuration={configuration}
              onStatsUpdate={setChatStats}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Token Usage Display */}
          <TokenUsageDisplay stats={chatStats} />
        </div>
      </div>
    </div>
  )
}
