/**
 * API Route: Quick Chat (Stateless)
 * POST /api/ai/quick-chat
 * 
 * Simple AI responses without database persistence
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStatelessChatApplication } from '@/lib/framework'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, history, systemPrompt, configuration, userId } = body

    // Validate required fields
    if (!message) {
      return NextResponse.json(
        { error: 'Missing required field: message' },
        { status: 400 }
      )
    }

    // Get stateless chat application
    const chatApp = getStatelessChatApplication()

    // Send quick message
    const response = await chatApp.quickChat({
      message,
      history,
      systemPrompt,
      configuration,
      userId
    })

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error: any) {
    console.error('Quick chat error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process message', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}
