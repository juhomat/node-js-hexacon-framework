/**
 * API Route: Get Chat History
 * GET /api/chat/history?chatId=xxx&userId=xxx&page=1&limit=50
 */

import { NextRequest, NextResponse } from 'next/server'
import { getChatApplication } from '@/lib/framework'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get('chatId')
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Validate required fields
    if (!chatId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters: chatId, userId' },
        { status: 400 }
      )
    }

    // Get chat application instance
    const chatApp = getChatApplication()

    // Get chat history using the framework
    const response = await chatApp.getChatHistory({
      chatId,
      userId,
      pagination: { page, limit }
    })

    // Format messages for frontend
    const formattedMessages = response.messages.data.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.createdAt,
      tokens: msg.metadata?.tokenCount,
      cost: msg.metadata?.cost,
      processingTime: msg.metadata?.processingTimeMs
    }))

    // Return the response
    return NextResponse.json({
      success: true,
      data: {
        chat: {
          id: response.chat.id,
          title: response.chat.title,
          model: response.chat.model,
          systemPrompt: response.chat.systemPrompt,
          metadata: response.chat.metadata,
        },
        messages: {
          data: formattedMessages,
          pagination: response.messages.pagination
        }
      }
    })

  } catch (error: any) {
    console.error('Chat history error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to get chat history', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}
