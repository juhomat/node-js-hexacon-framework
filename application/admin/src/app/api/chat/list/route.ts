/**
 * API Route: Get User's Chat List
 * GET /api/chat/list?userId=xxx&page=1&limit=10
 */

import { NextRequest, NextResponse } from 'next/server'
import { getChatApplication } from '@/lib/framework'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      )
    }

    // Get chat application instance
    const chatApp = getChatApplication()

    // Get user's chats using the framework
    const chats = await chatApp.getChatsByUser({
      userId,
      pagination: { page, limit }
    })

    // Format chats for frontend
    const formattedChats = chats.map(chat => ({
      id: chat.id,
      title: chat.title,
      model: chat.model,
      messageCount: chat.metadata.messageCount,
      totalCost: chat.metadata.totalCost,
      totalTokens: chat.metadata.totalTokens,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      isActive: chat.isActive
    }))

    return NextResponse.json({
      success: true,
      data: {
        chats: formattedChats,
        pagination: {
          page,
          limit,
          total: formattedChats.length
        }
      }
    })

  } catch (error: any) {
    console.error('Chat list error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to get chat list', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}
