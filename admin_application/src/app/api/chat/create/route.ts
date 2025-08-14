/**
 * API Route: Create New Chat
 * POST /api/chat/create
 */

import { NextRequest, NextResponse } from 'next/server'
import { getChatApplication } from '@/lib/framework'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, title, model, systemPrompt } = body

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      )
    }

    // Get chat application instance
    const chatApp = getChatApplication()

    // Create chat using the framework
    const response = await chatApp.createChat({
      userId,
      title: title || 'New Chat',
      model,
      systemPrompt
    })

    // Return the response
    return NextResponse.json({
      success: true,
      data: {
        chat: {
          id: response.chat.id,
          userId: response.chat.userId,
          title: response.chat.title,
          model: response.chat.model,
          systemPrompt: response.chat.systemPrompt,
          metadata: response.chat.metadata,
          createdAt: response.chat.createdAt,
          updatedAt: response.chat.updatedAt,
        },
        defaultConfiguration: response.defaultConfiguration
      }
    })

  } catch (error: any) {
    console.error('Chat create error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to create chat', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}
