'use client'

import { useState } from 'react'
import { Send, Zap, Clock, DollarSign } from 'lucide-react'

interface QuickChatResponse {
  content: string
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  cost: number
  processingTimeMs: number
}

export default function QuickChatTest() {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState<QuickChatResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return

    setIsLoading(true)
    setError(null)
    setResponse(null)

    try {
      const res = await fetch('/api/ai/quick-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          systemPrompt: 'You are a helpful AI assistant for testing the stateless chat feature.',
          configuration: {
            model: 'gpt-5',
            maxTokens: 4000
          }
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      setResponse(data.data)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStreamMessage = async () => {
    if (!message.trim() || isLoading) return

    setIsLoading(true)
    setIsStreaming(true)
    setError(null)
    setResponse(null)
    setStreamingContent('')

    try {
      const res = await fetch('/api/ai/quick-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          systemPrompt: 'You are a helpful AI assistant for testing the stateless streaming chat feature.',
          configuration: {
            model: 'gpt-5',
            maxTokens: 4000
          }
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to start stream')
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'chunk' && data.delta) {
                setStreamingContent(prev => prev + data.delta)
              } else if (data.type === 'complete') {
                setResponse({
                  content: streamingContent,
                  model: 'gpt-5',
                  usage: data.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                  cost: data.cost || 0,
                  processingTimeMs: 0
                })
              } else if (data.type === 'error') {
                throw new Error(data.error || 'Streaming error')
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line)
            }
          }
        }
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Quick Chat Test (Stateless)
        </h1>
        <p className="text-gray-600">
          Test the stateless AI chat feature - no database persistence, just direct AI responses.
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col space-y-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
          
          <div className="flex space-x-3">
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !message.trim()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Send size={16} />
              <span>Send (Non-streaming)</span>
            </button>
            
            <button
              onClick={handleStreamMessage}
              disabled={isLoading || !message.trim()}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Zap size={16} />
              <span>Send (Streaming)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">
              {isStreaming ? 'Streaming response...' : 'Generating response...'}
            </span>
          </div>
        </div>
      )}

      {/* Streaming Content */}
      {isStreaming && streamingContent && (
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">AI Response (Streaming):</h3>
          <div className="text-gray-800 whitespace-pre-wrap">
            {streamingContent}
            <span className="animate-pulse">|</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-red-800">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Response */}
      {response && !isStreaming && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">AI Response:</h3>
          
          <div className="bg-white rounded border p-4 mb-4">
            <div className="text-gray-800 whitespace-pre-wrap">
              {response.content}
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Zap size={16} />
              <span>Model: {response.model}</span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock size={16} />
              <span>{response.processingTimeMs}ms</span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <DollarSign size={16} />
              <span>${response.cost.toFixed(6)}</span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>📊 {response.usage.totalTokens} tokens</span>
            </div>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="font-semibold text-green-900 mb-2">✅ Stateless Chat Features:</h3>
        <ul className="text-green-800 space-y-1">
          <li>• <strong>No Database</strong> - No chat history stored</li>
          <li>• <strong>Direct AI</strong> - Straight to OpenAI API</li>
          <li>• <strong>Fast Setup</strong> - No chat session creation needed</li>
          <li>• <strong>Token Tracking</strong> - Still get usage and cost info</li>
          <li>• <strong>Streaming Support</strong> - Real-time responses available</li>
          <li>• <strong>Perfect for APIs</strong> - One-off responses, embeddings, etc.</li>
        </ul>
      </div>
    </div>
  )
}
