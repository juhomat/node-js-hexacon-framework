'use client'

/**
 * RAG Chat Interface
 * 
 * Complete UI for RAG (Retrieval-Augmented Generation) chat functionality
 * with website selection, real-time responses, and source attribution.
 */

import { useState, useEffect, useRef } from 'react'

interface Website {
  id: string
  domain: string
  title: string
  description: string | null
  totalPages: number
  lastCrawledAt: string | null
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  ragContext?: {
    chunksFound: number
    sources: Array<{
      index: number
      chunkId: string
      pageTitle: string
      pageUrl: string
      websiteDomain: string
      similarity: number
      contentPreview: string
    }>
    avgSimilarity: number
    websitesUsed: string[]
  }
  metrics?: {
    processingTimeMs: number
    totalTokens: number
    cost: number
    ragSearchTimeMs: number
    chatResponseTimeMs: number
  }
}

interface RAGChatRequest {
  message: string
  chatId?: string
  userId?: string
  websiteIds?: string[]
  maxChunks?: number
  minSimilarity?: number
  useRAG?: boolean
}

interface RAGChatResponse {
  success: boolean
  response?: string
  chatId?: string
  messageId?: string
  ragContext?: {
    chunksFound: number
    sources: Array<{
      index: number
      chunkId: string
      pageTitle: string
      pageUrl: string
      websiteDomain: string
      similarity: number
      contentPreview: string
    }>
    avgSimilarity: number
    websitesUsed: string[]
  }
  metrics?: {
    processingTimeMs: number
    totalTokens: number
    cost: number
    ragSearchTimeMs: number
    chatResponseTimeMs: number
  }
  error?: string
  message?: string
}

export default function RAGChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatId, setChatId] = useState<string>()
  const [websites, setWebsites] = useState<Website[]>([])
  const [selectedWebsiteIds, setSelectedWebsiteIds] = useState<string[]>([])
  const [useRAG, setUseRAG] = useState(true)
  const [maxChunks, setMaxChunks] = useState(5)
  const [minSimilarity, setMinSimilarity] = useState(0.7)
  const [showSettings, setShowSettings] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load available websites on component mount
  useEffect(() => {
    loadAvailableWebsites()
  }, [])

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadAvailableWebsites = async () => {
    try {
      const response = await fetch('/api/chat/rag-chat')
      const data = await response.json()
      
      if (response.ok && data.availableWebsites) {
        setWebsites(data.availableWebsites)
        // Auto-select all websites by default
        setSelectedWebsiteIds(data.availableWebsites.map((w: Website) => w.id))
      } else {
        console.error('Failed to load websites:', data.error)
      }
    } catch (error) {
      console.error('Error loading websites:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentMessage.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: currentMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setCurrentMessage('')
    setIsLoading(true)
    setError(null)

    try {
      const request: RAGChatRequest = {
        message: currentMessage,
        chatId,
        userId: 'admin-user',
        websiteIds: selectedWebsiteIds.length > 0 ? selectedWebsiteIds : undefined,
        maxChunks,
        minSimilarity,
        useRAG
      }

      console.log('🚀 Sending RAG chat request:', request)

      const response = await fetch('/api/chat/rag-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      const data: RAGChatResponse = await response.json()

      if (response.ok && data.success) {
        // Set chat ID for conversation continuity
        if (data.chatId && !chatId) {
          setChatId(data.chatId)
        }

        const assistantMessage: ChatMessage = {
          id: data.messageId || `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.response || 'No response received',
          timestamp: new Date(),
          ragContext: data.ragContext,
          metrics: data.metrics
        }

        setMessages(prev => [...prev, assistantMessage])
        console.log('✅ RAG chat response received:', data)
      } else {
        console.error('❌ RAG chat failed:', data)
        setError(data.error || data.message || 'Failed to get response')
      }
    } catch (err: any) {
      console.error('❌ Network error:', err)
      setError(`Network error: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([])
    setChatId(undefined)
    setError(null)
  }

  const toggleWebsiteSelection = (websiteId: string) => {
    setSelectedWebsiteIds(prev => 
      prev.includes(websiteId)
        ? prev.filter(id => id !== websiteId)
        : [...prev, websiteId]
    )
  }

  const selectAllWebsites = () => {
    setSelectedWebsiteIds(websites.map(w => w.id))
  }

  const deselectAllWebsites = () => {
    setSelectedWebsiteIds([])
  }

  return (
    <div className="max-w-6xl mx-auto p-6 h-screen flex flex-col">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🧠 RAG Chat System
        </h1>
        <p className="text-gray-600">
          Chat with AI using context from your crawled websites
        </p>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Sidebar - Website Selection & Settings */}
        <div className="w-80 bg-white shadow rounded-lg p-4 overflow-y-auto">
          <div className="space-y-4">
            {/* RAG Toggle */}
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={useRAG}
                  onChange={(e) => setUseRAG(e.target.checked)}
                  className="rounded"
                />
                <span className="font-medium">Enable RAG Context</span>
              </label>
            </div>

            {/* Website Selection */}
            {useRAG && (
              <>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-900">Website Sources</h3>
                    <div className="text-xs space-x-2">
                      <button
                        onClick={selectAllWebsites}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        All
                      </button>
                      <button
                        onClick={deselectAllWebsites}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  
                  {websites.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-4">
                      No websites found. Use the Web Scraping feature to add websites first.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {websites.map((website) => (
                        <label key={website.id} className="flex items-start space-x-2 p-2 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            checked={selectedWebsiteIds.includes(website.id)}
                            onChange={() => toggleWebsiteSelection(website.id)}
                            className="mt-1 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {website.title || website.domain}
                            </div>
                            <div className="text-xs text-gray-500">
                              {website.domain} • {website.totalPages} pages
                            </div>
                            {website.description && (
                              <div className="text-xs text-gray-400 truncate">
                                {website.description}
                              </div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Advanced Settings */}
                <div>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {showSettings ? '▼' : '▶'} Advanced Settings
                  </button>
                  
                  {showSettings && (
                    <div className="mt-2 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Max Chunks: {maxChunks}
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={maxChunks}
                          onChange={(e) => setMaxChunks(parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Min Similarity: {minSimilarity.toFixed(2)}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={minSimilarity}
                          onChange={(e) => setMinSimilarity(parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Chat Actions */}
            <div className="pt-4 border-t">
              <button
                onClick={clearChat}
                className="w-full bg-gray-100 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-200 text-sm"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 bg-white shadow rounded-lg flex flex-col min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <div className="text-4xl mb-4">💬</div>
                <p>Start a conversation with RAG-enhanced AI!</p>
                <p className="text-sm mt-2">
                  {useRAG 
                    ? `Using context from ${selectedWebsiteIds.length} selected website${selectedWebsiteIds.length !== 1 ? 's' : ''}`
                    : 'RAG context disabled - using standard chat'
                  }
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3xl rounded-lg p-4 ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    
                    {/* RAG Context Info */}
                    {message.ragContext && (
                      <div className="mt-3 pt-3 border-t border-gray-300 text-xs">
                        <div className="font-medium mb-2">
                          📚 Context: {message.ragContext.chunksFound} chunks from {message.ragContext.websitesUsed.length} websites
                          (avg similarity: {(message.ragContext.avgSimilarity * 100).toFixed(1)}%)
                        </div>
                        <div className="space-y-1">
                          {message.ragContext.sources.slice(0, 3).map((source) => (
                            <div key={source.chunkId} className="text-gray-600">
                              <a 
                                href={source.pageUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:text-blue-600"
                              >
                                📄 {source.pageTitle} ({(source.similarity * 100).toFixed(1)}%)
                              </a>
                            </div>
                          ))}
                          {message.ragContext.sources.length > 3 && (
                            <div className="text-gray-500">
                              ... and {message.ragContext.sources.length - 3} more sources
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Metrics */}
                    {message.metrics && (
                      <div className="mt-2 text-xs text-gray-500">
                        ⏱️ {message.metrics.processingTimeMs}ms • 
                        🪙 {message.metrics.totalTokens} tokens • 
                        💰 ${message.metrics.cost.toFixed(6)}
                      </div>
                    )}
                    
                    <div className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-gray-600">
                      {useRAG ? 'Searching context and generating response...' : 'Generating response...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Error Display */}
          {error && (
            <div className="mx-4 mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex">
                <div className="text-red-400 mr-2">❌</div>
                <div className="text-red-700 text-sm">{error}</div>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="border-t p-4">
            <form onSubmit={sendMessage} className="flex space-x-2">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder={useRAG 
                  ? "Ask a question about your crawled content..." 
                  : "Ask any question..."
                }
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !currentMessage.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Send'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
