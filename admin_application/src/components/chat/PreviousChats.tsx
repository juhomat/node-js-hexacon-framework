'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Clock, DollarSign, Hash, Loader2, RefreshCw } from 'lucide-react'

interface Chat {
  id: string
  title: string
  model: string
  messageCount: number
  totalCost: number
  totalTokens: number
  createdAt: string
  updatedAt: string
  isActive: boolean
}

interface PreviousChatsProps {
  userId: string
  onChatSelect: (chatId: string) => void
  selectedChatId?: string
}

export function PreviousChats({ userId, onChatSelect, selectedChatId }: PreviousChatsProps) {
  const [chats, setChats] = useState<Chat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchChats = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/chat/list?userId=${userId}&limit=10`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch chats')
      }

      setChats(data.data.chats)
    } catch (error: any) {
      setError(error.message)
      console.error('Failed to fetch chats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchChats()
  }, [userId])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) {
      return 'Just now'
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 flex items-center">
            <MessageSquare className="h-4 w-4 mr-2" />
            Previous Chats
          </h3>
          <button
            onClick={fetchChats}
            disabled={isLoading}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Loading chats...</span>
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <div className="text-sm text-red-600 mb-2">Failed to load chats</div>
            <div className="text-xs text-gray-500">{error}</div>
            <button
              onClick={fetchChats}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800"
            >
              Try again
            </button>
          </div>
        ) : chats.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No previous chats found
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onChatSelect(chat.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedChatId === chat.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium text-gray-900 text-sm truncate pr-2">
                    {chat.title}
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDate(chat.updatedAt)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center">
                      <Hash className="h-3 w-3 mr-1" />
                      {chat.messageCount} msgs
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-3 w-3 mr-1" />
                      ${chat.totalCost.toFixed(4)}
                    </div>
                  </div>
                  <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {chat.model}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
