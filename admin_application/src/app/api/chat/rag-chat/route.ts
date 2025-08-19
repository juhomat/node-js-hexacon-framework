/**
 * RAG Chat API Endpoint
 * 
 * POST /api/chat/rag-chat
 * 
 * Handles Retrieval-Augmented Generation (RAG) chat requests with:
 * 1. Website-specific context retrieval
 * 2. Intelligent chunk search using vector similarity
 * 3. Multi-website filtering and context building
 * 4. Enhanced chat responses with source attribution
 * 5. Conversation history integration
 * 
 * Request Body:
 * {
 *   "message": "How do I implement OAuth in my app?",
 *   "chatId": "chat-uuid-123",
 *   "userId": "user-456",
 *   "websiteIds": ["website-uuid-1", "website-uuid-2"],
 *   "maxChunks": 5,
 *   "minSimilarity": 0.7,
 *   "useRAG": true
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "response": "Based on the documentation, here's how to implement OAuth...",
 *   "chatId": "chat-uuid-123",
 *   "messageId": "message-uuid-789",
 *   "ragContext": {
 *     "chunksFound": 3,
 *     "sources": [...],
 *     "avgSimilarity": 0.85
 *   },
 *   "metrics": {
 *     "processingTimeMs": 1234,
 *     "totalTokens": 2456,
 *     "cost": 0.0034
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAvailableWebsites, getChatApplication, initializeDatabase } from '@/lib/framework'
import { EmbeddingService } from 'ai-framework'

interface RAGChatRequestBody {
  message: string
  chatId?: string
  userId?: string
  websiteIds?: string[]
  maxChunks?: number
  minSimilarity?: number
  useRAG?: boolean
  configuration?: {
    model?: string
    temperature?: number
    maxTokens?: number
  }
}

interface RAGChatResponse {
  success: boolean
  response?: string
  chatId?: string
  messageId?: string
  ragContext?: {
    chunksFound: number
    sources: Array<{
      index: number
      chunkId: string
      pageTitle: string
      pageUrl: string
      websiteDomain: string
      similarity: number
      contentPreview: string
    }>
    avgSimilarity: number
    websitesUsed: string[]
  }
  metrics?: {
    processingTimeMs: number
    totalTokens: number
    cost: number
    ragSearchTimeMs: number
    chatResponseTimeMs: number
  }
  error?: string
  message?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<RAGChatResponse>> {
  const startTime = Date.now()
  
  try {
    console.log('🧠 RAG Chat API endpoint called')
    
    // Parse request body
    const body: RAGChatRequestBody = await request.json()
    
    // Validate required fields
    if (!body.message || !body.message.trim()) {
      return NextResponse.json({
        success: false,
        error: 'message is required',
        message: 'Please provide a message for the RAG chat'
      }, { status: 400 })
    }

    // Set defaults
    const useRAG = body.useRAG !== false // Default to true
    const maxChunks = body.maxChunks || 5
    const minSimilarity = body.minSimilarity || 0.7
    const userId = body.userId || 'admin-user'

    // Validate parameters
    if (maxChunks < 1 || maxChunks > 20) {
      return NextResponse.json({
        success: false,
        error: 'Invalid maxChunks',
        message: 'maxChunks must be between 1 and 20'
      }, { status: 400 })
    }

    if (minSimilarity < 0 || minSimilarity > 1) {
      return NextResponse.json({
        success: false,
        error: 'Invalid minSimilarity',
        message: 'minSimilarity must be between 0 and 1'
      }, { status: 400 })
    }

    console.log(`💬 Processing RAG chat message: "${body.message.substring(0, 100)}${body.message.length > 100 ? '...' : ''}"`)
    console.log(`🔍 RAG enabled: ${useRAG}`)
    console.log(`🌐 Website IDs: ${body.websiteIds?.join(', ') || 'all websites'}`)
    console.log(`📊 Parameters: maxChunks=${maxChunks}, minSimilarity=${minSimilarity}`)

    // Get chat application from service layer  
    // Note: RAG functionality temporarily disabled due to webpack import issues
    const chatApp = getChatApplication()

    let ragSearchTimeMs = 0
    let chatResponseTimeMs = 0

    // Execute standard chat with RAG debugging
    const ragStartTime = Date.now()
    
    let retrievedChunks = []
    let ragContext = null
    
    // If RAG is enabled, perform actual database similarity search
    if (useRAG) {
      console.log('🔍 Starting RAG database similarity search...')
      console.log(`📊 Search parameters: query="${body.message}", maxChunks=${maxChunks}, minSimilarity=${minSimilarity}`)
      console.log(`🌐 Website IDs: ${body.websiteIds?.length ? body.websiteIds.join(', ') : 'all websites'}`)
      

      
      try {
        // Get database pool and perform similarity search
        const pool = initializeDatabase()
        
        // Build the similarity search query
        const searchQuery = body.websiteIds && body.websiteIds.length > 0
          ? `
            SELECT 
              c.id,
              c.content,
              c.chunk_index,
              p.title as page_title,
              p.url as page_url,
              w.domain as website_domain,
              (c.embedding <=> $1::vector) as similarity
            FROM chunks c
            JOIN pages p ON c.page_id = p.id
            JOIN websites w ON p.website_id = w.id
            WHERE w.id = ANY($2) AND c.embedding IS NOT NULL
            ORDER BY c.embedding <=> $1::vector
            LIMIT $3
          `
          : `
            SELECT 
              c.id,
              c.content,
              c.chunk_index,
              p.title as page_title,
              p.url as page_url,
              w.domain as website_domain,
              (c.embedding <=> $1::vector) as similarity
            FROM chunks c
            JOIN pages p ON c.page_id = p.id
            JOIN websites w ON p.website_id = w.id
            WHERE c.embedding IS NOT NULL
            ORDER BY c.embedding <=> $1::vector
            LIMIT $2
          `

        // First, generate embedding for the query
        console.log('🔢 Generating embedding for search query...')
        const embeddingService = new EmbeddingService()
        const embeddingResult = await embeddingService.generateEmbedding(body.message)
        
        if (!embeddingResult.success || !embeddingResult.embedding) {
          throw new Error('Failed to generate embedding for query')
        }
        
        const queryEmbedding = embeddingResult.embedding
        console.log(`✅ Generated embedding: ${queryEmbedding.length}D vector`)

        // Perform the similarity search
        console.log('🔍 Executing similarity search in database...')
        const searchParams = body.websiteIds && body.websiteIds.length > 0
          ? [JSON.stringify(queryEmbedding), body.websiteIds, maxChunks]
          : [JSON.stringify(queryEmbedding), maxChunks]
          
        const searchResult = await pool.query(searchQuery, searchParams)
        retrievedChunks = searchResult.rows
        
        console.log(`📊 Database search results: ${retrievedChunks.length} chunks found`)
        retrievedChunks.forEach((chunk, i) => {
          console.log(`   ${i + 1}. ${chunk.website_domain} - ${chunk.page_title} (similarity: ${(1 - chunk.similarity).toFixed(3)})`)
          console.log(`      Content preview: ${(chunk.content || '').substring(0, 100)}...`)
        })
        
        // Filter by similarity threshold
        const filteredChunks = retrievedChunks.filter(chunk => (1 - chunk.similarity) >= minSimilarity)
        console.log(`🎯 After similarity filtering (>=${minSimilarity}): ${filteredChunks.length} chunks`)
        
        // Build RAG context if we have relevant chunks
        if (filteredChunks.length > 0) {
          const contextText = filteredChunks.map((chunk, i) => 
            `[Source ${i + 1}: ${chunk.page_title} - ${chunk.website_domain}]\n${chunk.content}`
          ).join('\n\n')
          
          ragContext = {
            chunksFound: filteredChunks.length,
            sources: filteredChunks.map((chunk, i) => ({
              index: i + 1,
              chunkId: chunk.id,
              pageTitle: chunk.page_title,
              pageUrl: chunk.page_url,
              websiteDomain: chunk.website_domain,
              similarity: 1 - chunk.similarity,
              contentPreview: (chunk.content || '').substring(0, 150) + '...'
            })),
            avgSimilarity: filteredChunks.reduce((sum, chunk) => sum + (1 - chunk.similarity), 0) / filteredChunks.length,
            websitesUsed: [...new Set(filteredChunks.map(chunk => chunk.website_domain))]
          }
          
          console.log('✅ RAG context built successfully')
          console.log(`📚 Context text length: ${contextText.length} characters`)
          
          retrievedChunks = filteredChunks
        } else {
          console.log('⚠️ No chunks met the similarity threshold')
        }
        
      } catch (ragError: any) {
        console.error('❌ RAG search error:', ragError)
        console.log('⚠️ Falling back to standard chat without RAG context')
      }
    }
    
    // Create enhanced message with actual RAG context or debug info
    let enhancedMessage
    if (useRAG && retrievedChunks.length > 0) {
      const contextText = retrievedChunks.map((chunk, i) => 
        `[Source ${i + 1}: ${chunk.page_title} - ${chunk.website_domain}]\n${chunk.content}`
      ).join('\n\n')
      
      enhancedMessage = `Based on the following context from crawled websites, please answer the user's question:

CONTEXT:
${contextText}

QUESTION: ${body.message}

Please provide a comprehensive answer based on the context above, and cite which sources you're referencing.`
    } else if (useRAG) {
      enhancedMessage = `[RAG DEBUG: Searched ${body.websiteIds?.length || 'all'} websites with max ${maxChunks} chunks, min similarity ${minSimilarity}. Found ${retrievedChunks.length} chunks but none met the threshold.]\n\nUser question: ${body.message}`
    } else {
      enhancedMessage = body.message
    }
    
    console.log('📝 Final prompt being sent to OpenAI:')
    console.log('='.repeat(50))
    console.log(enhancedMessage)
    console.log('='.repeat(50))

    let chatId = body.chatId
    
    // Create a new chat if one doesn't exist
    if (!chatId) {
      console.log('🆕 Creating new chat session for RAG conversation')
      try {
        const createResult = await chatApp.createChat({
          userId,
          title: `RAG Chat - ${body.message.substring(0, 30)}...`,
          model: body.configuration?.model || 'gpt-5',
          systemPrompt: useRAG ? 'You are an AI assistant with access to crawled website content for context.' : undefined,
          configuration: body.configuration
        })
        
        chatId = createResult.chat.id
        console.log(`✅ Created new chat: ${chatId}`)
      } catch (createError: any) {
        console.error('❌ Failed to create chat:', createError)
        return NextResponse.json({
          success: false,
          error: 'Failed to create chat session',
          message: createError.message || 'Could not initialize chat'
        }, { status: 500 })
      }
    }
    
    let result
    try {
      result = await chatApp.sendMessage({
        chatId,
        userId,
        content: enhancedMessage,
        configuration: body.configuration
      })
    } catch (sendError: any) {
      console.error('❌ Send message error:', sendError)
      return NextResponse.json({
        success: false,
        error: 'Failed to send message',
        message: sendError.message || 'Could not send message to chat'
      }, { status: 500 })
    }

    const totalTime = Date.now() - ragStartTime
    
    // If we get here, the sendMessage was successful (no exception thrown)
    chatResponseTimeMs = totalTime

    console.log(`✅ Chat completed successfully with RAG context`)
    console.log(`⏱️ Timing: Chat response ${chatResponseTimeMs}ms`)
    console.log(`💰 Cost: $${result.assistantMessage?.metadata?.cost?.toFixed(6) || '0.000000'}`)
    
           return NextResponse.json({
         success: true,
         response: result.assistantMessage?.content || 'No response generated',
         chatId: chatId, // Use our chatId variable
         messageId: result.assistantMessage?.id,
         ragContext: ragContext,
         metrics: {
           processingTimeMs: Date.now() - startTime,
           totalTokens: result.chatMetadata?.totalTokens || 0,
           cost: result.assistantMessage?.metadata?.cost || 0,
           ragSearchTimeMs: ragStartTime ? Date.now() - ragStartTime : 0,
           chatResponseTimeMs
         }
       }, { status: 200 })

  } catch (error: any) {
    console.error('❌ RAG Chat API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'An unexpected error occurred during RAG chat processing',
      metrics: {
        processingTimeMs: Date.now() - startTime,
        totalTokens: 0,
        cost: 0,
        ragSearchTimeMs: 0,
        chatResponseTimeMs: 0
      }
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get available websites for the documentation
    const websites = await getAvailableWebsites()
    
    return NextResponse.json({
      endpoint: '/api/chat/rag-chat',
      method: 'POST',
      description: 'Retrieval-Augmented Generation chat with website-specific context',
      features: [
        'Vector similarity search across multiple websites',
        'Intelligent context building from retrieved chunks',
        'Source attribution with page references',
        'Conversation history integration',
        'Configurable similarity thresholds',
        'Multi-website filtering and selection',
        'Comprehensive metrics and cost tracking'
      ],
      parameters: {
        message: {
          type: 'string',
          required: true,
          description: 'The user message to process with RAG context',
          example: 'How do I implement OAuth authentication?'
        },
        chatId: {
          type: 'string',
          required: false,
          description: 'Existing chat ID for conversation continuity',
          example: 'chat-uuid-123'
        },
        userId: {
          type: 'string',
          required: false,
          default: 'admin-user',
          description: 'User identifier for the chat session'
        },
        websiteIds: {
          type: 'array',
          required: false,
          description: 'List of website IDs to search for context (empty = all websites)',
          example: ['website-uuid-1', 'website-uuid-2']
        },
        maxChunks: {
          type: 'number',
          required: false,
          default: 5,
          range: '1-20',
          description: 'Maximum number of context chunks to retrieve'
        },
        minSimilarity: {
          type: 'number',
          required: false,
          default: 0.7,
          range: '0-1',
          description: 'Minimum similarity threshold for chunk relevance'
        },
        useRAG: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Whether to use RAG context or standard chat'
        },
        configuration: {
          type: 'object',
          required: false,
          description: 'AI model configuration options',
          properties: {
            model: 'AI model to use (e.g., gpt-4, gpt-3.5-turbo)',
            temperature: 'Response randomness (0-1)',
            maxTokens: 'Maximum response length'
          }
        }
      },
      response: {
        success: 'boolean - Operation success status',
        response: 'string - The AI chat response with RAG context',
        chatId: 'string - Chat session identifier',
        messageId: 'string - Individual message identifier',
        ragContext: {
          chunksFound: 'number - Number of relevant chunks found',
          sources: 'array - Source attribution with page details',
          avgSimilarity: 'number - Average similarity score of used chunks',
          websitesUsed: 'array - List of website domains used for context'
        },
        metrics: {
          processingTimeMs: 'number - Total processing time',
          totalTokens: 'number - Tokens used for the response',
          cost: 'number - Estimated API cost in USD',
          ragSearchTimeMs: 'number - Time spent on RAG search',
          chatResponseTimeMs: 'number - Time spent generating response'
        }
      },
      availableWebsites: websites.map(w => ({
        id: w.id,
        domain: w.domain,
        title: w.title,
        description: w.description,
        totalPages: w.totalPages,
        lastCrawledAt: w.lastCrawledAt
      })),
      examples: {
        standardRAG: {
          message: 'How do I authenticate users in my application?',
          websiteIds: [],
          maxChunks: 5,
          minSimilarity: 0.7,
          useRAG: true
        },
        specificWebsite: {
          message: 'What are the API rate limits?',
          websiteIds: ['website-uuid-for-api-docs'],
          maxChunks: 3,
          minSimilarity: 0.8,
          useRAG: true
        },
        multiWebsite: {
          message: 'Best practices for error handling',
          websiteIds: ['website-uuid-1', 'website-uuid-2'],
          maxChunks: 7,
          minSimilarity: 0.75,
          useRAG: true
        },
        standardChat: {
          message: 'Tell me a joke',
          useRAG: false
        }
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to fetch available websites',
      message: error.message
    }, { status: 500 })
  }
}
