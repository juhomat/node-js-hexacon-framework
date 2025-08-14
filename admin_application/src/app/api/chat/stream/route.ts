/**
 * API Route: Stream Chat Message
 * POST /api/chat/stream
 */

import { NextRequest } from 'next/server'
import { getChatApplication } from '@/lib/framework'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chatId, userId, content, configuration } = body

    // Validate required fields
    if (!chatId || !userId || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: chatId, userId, content' }),
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
          // Get chat application instance
          const chatApp = getChatApplication()

          // Stream message using the framework
          for await (const chunk of chatApp.streamMessage({
            chatId,
            userId,
            content,
            configuration
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
          console.error('Streaming error:', error)
          
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
    console.error('Stream setup error:', error)
    
    return new Response(
      JSON.stringify({ error: 'Failed to setup stream', details: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
