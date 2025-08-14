/**
 * API Client for Chat Operations
 */

interface SendMessageRequest {
  chatId: string
  userId: string
  content: string
  configuration?: any
}

interface CreateChatRequest {
  userId: string
  title?: string
  model?: string
  systemPrompt?: string
}

interface ChatHistoryRequest {
  chatId: string
  userId: string
  page?: number
  limit?: number
}

export class ChatAPI {
  /**
   * Send a message (non-streaming)
   */
  static async sendMessage(request: SendMessageRequest) {
    const response = await fetch('/api/chat/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to send message')
    }

    return response.json()
  }

  /**
   * Send a streaming message
   */
  static async* streamMessage(request: SendMessageRequest) {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to start stream')
    }

    if (!response.body) {
      throw new Error('No response body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              yield data
            } catch (e) {
              console.warn('Failed to parse SSE data:', line)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Create a new chat
   */
  static async createChat(request: CreateChatRequest) {
    const response = await fetch('/api/chat/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create chat')
    }

    return response.json()
  }

  /**
   * Get chat history
   */
  static async getChatHistory(request: ChatHistoryRequest) {
    const params = new URLSearchParams({
      chatId: request.chatId,
      userId: request.userId,
      page: (request.page || 1).toString(),
      limit: (request.limit || 50).toString(),
    })

    const response = await fetch(`/api/chat/history?${params}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get chat history')
    }

    return response.json()
  }
}
