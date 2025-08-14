'use client'

import { BarChart3, Clock, DollarSign, Hash } from 'lucide-react'

interface ChatStats {
  totalTokens: number
  totalCost: number
  messageCount: number
  averageResponseTime: number
}

interface TokenUsageDisplayProps {
  stats: ChatStats
}

export function TokenUsageDisplay({ stats }: TokenUsageDisplayProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 flex items-center">
          <BarChart3 className="h-4 w-4 mr-2" />
          Usage Statistics
        </h3>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Total Tokens */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Hash className="h-4 w-4 text-blue-500 mr-2" />
            <span className="text-sm text-gray-600">Total Tokens</span>
          </div>
          <span className="text-sm font-medium text-gray-900">
            {stats.totalTokens.toLocaleString()}
          </span>
        </div>

        {/* Total Cost */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 text-green-500 mr-2" />
            <span className="text-sm text-gray-600">Total Cost</span>
          </div>
          <span className="text-sm font-medium text-gray-900">
            ${stats.totalCost.toFixed(4)}
          </span>
        </div>

        {/* Message Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <BarChart3 className="h-4 w-4 text-purple-500 mr-2" />
            <span className="text-sm text-gray-600">Messages</span>
          </div>
          <span className="text-sm font-medium text-gray-900">
            {stats.messageCount}
          </span>
        </div>

        {/* Average Response Time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-orange-500 mr-2" />
            <span className="text-sm text-gray-600">Avg Response</span>
          </div>
          <span className="text-sm font-medium text-gray-900">
            {stats.averageResponseTime > 0 
              ? `${(stats.averageResponseTime / 1000).toFixed(1)}s` 
              : '—'}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200"></div>

        {/* Derived Stats */}
        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>Avg tokens/message:</span>
            <span>
              {stats.messageCount > 0 
                ? Math.round(stats.totalTokens / stats.messageCount) 
                : 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Cost per message:</span>
            <span>
              ${stats.messageCount > 0 
                ? (stats.totalCost / stats.messageCount).toFixed(4) 
                : '0.0000'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Cost per 1K tokens:</span>
            <span>
              ${stats.totalTokens > 0 
                ? ((stats.totalCost / stats.totalTokens) * 1000).toFixed(4) 
                : '0.0000'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
