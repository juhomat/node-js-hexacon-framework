/**
 * API Route: Send Chat Message
 * POST /api/chat/send
 */

import { NextRequest, NextResponse } from 'next/server'
import { getChatApplication } from '@/lib/framework'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chatId, userId, content, configuration } = body

    // Validate required fields
    if (!chatId || !userId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: chatId, userId, content' },
        { status: 400 }
      )
    }

    // Get chat application instance
    const chatApp = getChatApplication()

    // Send message using the framework
    const response = await chatApp.sendMessage({
      chatId,
      userId,
      content,
      configuration
    })

    // Return the response
    return NextResponse.json({
      success: true,
      data: {
        userMessage: {
          id: response.userMessage.id,
          role: response.userMessage.role,
          content: response.userMessage.content,
          timestamp: response.userMessage.createdAt,
        },
        assistantMessage: {
          id: response.assistantMessage.id,
          role: response.assistantMessage.role,
          content: response.assistantMessage.content,
          timestamp: response.assistantMessage.createdAt,
          tokens: response.assistantMessage.metadata.tokenCount,
          cost: response.assistantMessage.metadata.cost,
          processingTime: response.assistantMessage.metadata.processingTimeMs,
        },
        chatMetadata: response.chatMetadata
      }
    })

  } catch (error: any) {
    console.error('Chat send error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to send message', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}
