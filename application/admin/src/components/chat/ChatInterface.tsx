'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, User, Bot, Loader2, AlertCircle, Copy, Check } from 'lucide-react'
import { ChatAPI } from '@/lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  tokens?: number
  cost?: number
  processingTime?: number
}

interface ChatConfiguration {
  model: string
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  stream: boolean
}

interface ChatStats {
  totalTokens: number
  totalCost: number
  messageCount: number
  averageResponseTime: number
}

interface ChatInterfaceProps {
  configuration: ChatConfiguration
  onStatsUpdate: (stats: ChatStats) => void
}

export function ChatInterface({ configuration, onStatsUpdate }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Create a chat when component mounts
  useEffect(() => {
    createNewChat()
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const createNewChat = async () => {
    try {
      const response = await ChatAPI.createChat({
        userId: 'demo_user_123', // Demo user ID
        title: 'AI Chat Test',
        model: configuration.model,
        systemPrompt: 'You are a helpful AI assistant for testing the AI Framework.'
      })

      if (response.success) {
        setCurrentChatId(response.data.chat.id)
        setMessages([]) // Clear existing messages
        setError(null)
      }
    } catch (error) {
      console.error('Failed to create chat:', error)
      setError('Failed to create chat session')
    }
  }

  const sendMessage = async (content: string): Promise<Message> => {
    if (!currentChatId) {
      throw new Error('No active chat session')
    }

    const response = await ChatAPI.sendMessage({
      chatId: currentChatId,
      userId: 'demo_user_123',
      content,
      configuration
    })

    if (!response.success) {
      throw new Error(response.error || 'Failed to send message')
    }

    return {
      id: response.data.assistantMessage.id,
      role: 'assistant',
      content: response.data.assistantMessage.content,
      timestamp: new Date(response.data.assistantMessage.timestamp),
      tokens: response.data.assistantMessage.tokens,
      cost: response.data.assistantMessage.cost,
      processingTime: response.data.assistantMessage.processingTime
    }
  }

  const sendStreamingMessage = async (content: string) => {
    if (!currentChatId) {
      throw new Error('No active chat session')
    }

    const startTime = Date.now()
    let currentContent = ''
    let finalTokens = 0
    let finalCost = 0
    
    // Create initial assistant message
    const assistantMessage: Message = {
      id: `temp_${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, assistantMessage])
    
    try {
      // Use real streaming API
      for await (const chunk of ChatAPI.streamMessage({
        chatId: currentChatId,
        userId: 'demo_user_123',
        content,
        configuration: { ...configuration, stream: true }
      })) {
        if (chunk.type === 'start') {
          // User message was created, we can continue with streaming
          continue
        } else if (chunk.type === 'chunk' && chunk.delta) {
          currentContent += chunk.delta
          
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, content: currentContent }
                : msg
            )
          )
        } else if (chunk.type === 'complete') {
          const processingTime = Date.now() - startTime
          finalTokens = chunk.chatMetadata?.totalTokens || 0
          finalCost = chunk.chatMetadata?.totalCost || 0
          
          // Update with final metadata and real message ID
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { 
                    ...msg,
                    id: chunk.assistantMessage?.id || msg.id,
                    tokens: chunk.assistantMessage?.metadata?.tokenCount || finalTokens,
                    cost: chunk.assistantMessage?.metadata?.cost || finalCost,
                    processingTime
                  }
                : msg
            )
          )
          break
        } else if (chunk.type === 'error') {
          throw new Error(chunk.error || 'Streaming error')
        }
      }
    } catch (error) {
      // Remove the partial message on error
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessage.id))
      throw error
    }
    
    return { 
      tokens: finalTokens, 
      cost: finalCost, 
      processingTime: Date.now() - startTime 
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setError(null)

    try {
      if (configuration.stream) {
        const result = await sendStreamingMessage(userMessage.content)
        updateStats(result.tokens, result.cost, result.processingTime)
      } else {
        const assistantMessage = await sendMessage(userMessage.content)
        setMessages(prev => [...prev, assistantMessage])
        updateStats(assistantMessage.tokens!, assistantMessage.cost!, assistantMessage.processingTime!)
      }
    } catch (error) {
      setError('Failed to send message. Please try again.')
      console.error('Chat error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateStats = (tokens: number, cost: number, processingTime: number) => {
    const newMessageCount = messages.filter(m => m.role === 'assistant').length + 1
    const totalTokens = messages.reduce((sum, m) => sum + (m.tokens || 0), 0) + tokens
    const totalCost = messages.reduce((sum, m) => sum + (m.cost || 0), 0) + cost
    const totalProcessingTime = messages.reduce((sum, m) => sum + (m.processingTime || 0), 0) + processingTime
    
    onStatsUpdate({
      totalTokens,
      totalCost,
      messageCount: newMessageCount,
      averageResponseTime: totalProcessingTime / newMessageCount
    })
  }

  const copyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (error) {
      console.error('Failed to copy message:', error)
    }
  }

  const clearChat = async () => {
    setMessages([])
    onStatsUpdate({
      totalTokens: 0,
      totalCost: 0,
      messageCount: 0,
      averageResponseTime: 0
    })
    // Create a new chat session
    await createNewChat()
  }

  return (
    <div className="flex flex-col h-96">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
            <p className="text-sm">Send a message to test the AI chat functionality</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-4xl ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 ${message.role === 'user' ? 'ml-3' : 'mr-3'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
              </div>
              
              <div className={`group relative ${message.role === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block p-3 rounded-lg max-w-full ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {message.role === 'assistant' && (message.tokens || message.cost || message.processingTime) && (
                    <div className="mt-2 text-xs opacity-70 border-t border-gray-300 pt-2">
                      {message.tokens && <span>Tokens: {message.tokens}</span>}
                      {message.cost && <span className="ml-3">Cost: ${message.cost.toFixed(4)}</span>}
                      {message.processingTime && <span className="ml-3">Time: {(message.processingTime / 1000).toFixed(1)}s</span>}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => copyMessage(message.content, message.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                  title="Copy message"
                >
                  {copiedMessageId === message.id ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3 text-gray-500" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex mr-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <Bot className="h-4 w-4 text-gray-600" />
              </div>
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <div className="flex items-center text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-gray-500">
            Using {configuration.model} • {configuration.stream ? 'Streaming' : 'Standard'} mode
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear chat
            </button>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder="Type your message... (Shift+Enter for new line)"
            className="flex-1 min-h-0 resize-none border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
