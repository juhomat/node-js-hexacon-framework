/**
 * API Route: Quick Stream Chat (Stateless)
 * POST /api/ai/quick-stream
 * 
 * Streaming AI responses without database persistence
 */

import { NextRequest } from 'next/server'
import { getStatelessChatApplication } from '@/lib/framework'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, history, systemPrompt, configuration, userId } = body

    // Validate required fields
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: message' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Create SSE response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Get stateless chat application
          const chatApp = getStatelessChatApplication()

          // Stream quick message
          for await (const chunk of chatApp.quickStreamChat({
            message,
            history,
            systemPrompt,
            configuration: { ...configuration, stream: true },
            userId
          })) {
            // Send each chunk as SSE event
            const data = JSON.stringify(chunk)
            const sseEvent = `data: ${data}\n\n`
            controller.enqueue(encoder.encode(sseEvent))

            // If complete or error, close the stream
            if (chunk.type === 'complete' || chunk.type === 'error') {
              break
            }
          }
        } catch (error: any) {
          console.error('Quick streaming error:', error)
          
          const errorChunk = {
            type: 'error' as const,
            error: error.message || 'Unknown streaming error'
          }
          
          const data = JSON.stringify(errorChunk)
          const sseEvent = `data: ${data}\n\n`
          controller.enqueue(encoder.encode(sseEvent))
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error: any) {
    console.error('Quick stream setup error:', error)
    
    return new Response(
      JSON.stringify({ error: 'Failed to setup stream', details: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
