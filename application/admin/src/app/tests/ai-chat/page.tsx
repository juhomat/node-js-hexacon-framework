'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Settings, Zap, MessageSquare, BarChart3 } from 'lucide-react'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { ModelSelector } from '@/components/chat/ModelSelector'
import { ConfigurationPanel } from '@/components/chat/ConfigurationPanel'
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
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stream: true
  })

  const [showConfiguration, setShowConfiguration] = useState(false)
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
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowConfiguration(!showConfiguration)}
            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium ${
              showConfiguration 
                ? 'bg-gray-100 text-gray-900' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat Interface - Main Column */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Chat Interface
                </h2>
                <div className="flex items-center space-x-4">
                  <ModelSelector 
                    selectedModel={configuration.model}
                    onModelChange={(model) => 
                      setConfiguration(prev => ({ ...prev, model }))
                    }
                  />
                  <div className="flex items-center text-sm text-gray-500">
                    <Zap className="h-4 w-4 mr-1" />
                    {configuration.stream ? 'Streaming' : 'Standard'}
                  </div>
                </div>
              </div>
            </div>
            
            <ChatInterface 
              configuration={configuration}
              onStatsUpdate={setChatStats}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Configuration Panel */}
          {showConfiguration && (
            <ConfigurationPanel 
              configuration={configuration}
              onChange={setConfiguration}
            />
          )}

          {/* Token Usage Display */}
          <TokenUsageDisplay stats={chatStats} />

          {/* Test Scenarios */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Quick Test Scenarios
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-sm">
                <div className="font-medium text-gray-900">Code Explanation</div>
                <div className="text-gray-500">Explain this TypeScript code...</div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-sm">
                <div className="font-medium text-gray-900">Creative Writing</div>
                <div className="text-gray-500">Write a short story about AI...</div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-sm">
                <div className="font-medium text-gray-900">Problem Solving</div>
                <div className="text-gray-500">How can I optimize this algorithm...</div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-sm">
                <div className="font-medium text-gray-900">Long Form</div>
                <div className="text-gray-500">Write a detailed essay about...</div>
              </button>
            </div>
          </div>

          {/* Model Information */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">
                Model Information
              </h3>
            </div>
            <div className="p-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Current Model:</span>
                  <span className="font-medium">{configuration.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Temperature:</span>
                  <span className="font-medium">{configuration.temperature}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Max Tokens:</span>
                  <span className="font-medium">{configuration.maxTokens}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Streaming:</span>
                  <span className="font-medium">
                    {configuration.stream ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
