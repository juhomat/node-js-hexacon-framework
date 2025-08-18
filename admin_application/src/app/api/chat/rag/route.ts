/**
 * RAG-Enhanced Chat API Endpoint
 * 
 * POST /api/chat/rag
 * 
 * Provides chat functionality enhanced with RAG (Retrieval-Augmented Generation).
 * Searches crawled content to provide relevant context before generating AI responses.
 * 
 * Request Body:
 * {
 *   "message": "How do I use the API?",
 *   "chatId": "existing-chat-id",
 *   "websiteIds": ["website-1", "website-2"],
 *   "maxChunks": 5,
 *   "minSimilarity": 0.7,
 *   "useRAG": true
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "userMessage": {...},
 *   "assistantMessage": {...},
 *   "ragSources": [...],
 *   "ragMetrics": {
 *     "searchTime": 150,
 *     "chunksFound": 3,
 *     "avgSimilarity": 0.82
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Framework imports
import { RAGChatApplication } from '../../../../../../packages/ai-framework/src/application/RAGChatApplication';
import { ChatApplication } from '../../../../../../packages/ai-framework/src/application/ChatApplication';
import { RAGSearchService } from '../../../../../../packages/ai-framework/src/domain/services/RAGSearchService';

// Repositories
import {
  PostgreSQLChatRepository,
  PostgreSQLMessageRepository,
  PostgreSQLChunkRepository
} from '../../../../../../packages/ai-framework/src/infrastructure/database';

// Services
import { OpenAIAdapter } from '../../../../../../packages/ai-framework/src/infrastructure/ai';
import { EmbeddingService } from '../../../../../../packages/ai-framework/src/domain/services';

interface RAGChatRequestBody {
  message: string;
  chatId?: string;
  userId?: string;
  websiteIds?: string[];
  maxChunks?: number;
  minSimilarity?: number;
  useRAG?: boolean;
  ragInstructions?: string;
  createNewChat?: boolean;
  chatTitle?: string;
}

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize repositories
const chatRepository = new PostgreSQLChatRepository(pool);
const messageRepository = new PostgreSQLMessageRepository(pool);
const chunkRepository = new PostgreSQLChunkRepository(pool);

// Initialize AI services
const openaiAdapter = new OpenAIAdapter(process.env.OPENAI_API_KEY!, {
  defaultModel: 'gpt-4o'
});
const embeddingService = new EmbeddingService();

// Initialize applications
const chatApplication = new ChatApplication(chatRepository, messageRepository, openaiAdapter);
const ragSearchService = new RAGSearchService(embeddingService, chunkRepository);
const ragChatApplication = new RAGChatApplication(chatApplication, ragSearchService);

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 RAG Chat API endpoint called');
    
    // Parse request body
    const body: RAGChatRequestBody = await request.json();
    
    // Validate required fields
    if (!body.message) {
      return NextResponse.json({
        success: false,
        error: 'message is required',
        message: 'Please provide a message to send'
      }, { status: 400 });
    }

    const userId = body.userId || 'default-user';
    let chatId = body.chatId;

    // Create new chat if needed
    if (body.createNewChat || !chatId) {
      console.log('💬 Creating new chat for RAG conversation');
      
      const chatResponse = await ragChatApplication.createChat({
        userId,
        title: body.chatTitle || 'RAG Chat Session',
        model: 'gpt-4o',
        systemPrompt: 'You are a helpful assistant that uses provided sources to answer questions accurately. Always cite your sources when using information from the provided context.'
      });
      
      chatId = chatResponse.chat.id;
      console.log(`✅ Created new chat: ${chatId}`);
    }

    if (!chatId) {
      return NextResponse.json({
        success: false,
        error: 'chatId is required',
        message: 'Please provide a chatId or set createNewChat: true'
      }, { status: 400 });
    }

    // Prepare RAG request
    const ragRequest = {
      chatId,
      userId,
      content: body.message,
      useRAG: body.useRAG !== false, // Default to true
      websiteIds: body.websiteIds,
      maxChunks: body.maxChunks || 5,
      minSimilarity: body.minSimilarity || 0.7,
      ragInstructions: body.ragInstructions
    };

    console.log(`🔍 Processing RAG chat request:`);
    console.log(`   Message: ${body.message}`);
    console.log(`   Use RAG: ${ragRequest.useRAG}`);
    console.log(`   Website IDs: ${ragRequest.websiteIds?.join(', ') || 'all'}`);
    console.log(`   Max chunks: ${ragRequest.maxChunks}`);

    // Send message with RAG enhancement
    const response = await ragChatApplication.sendMessage(ragRequest);

    console.log(`✅ RAG chat response generated`);
    console.log(`   Response length: ${response.assistantMessage.content.length} chars`);
    
    if (response.ragSources && response.ragSources.length > 0) {
      console.log(`   RAG sources used: ${response.ragSources.length}`);
      console.log(`   Average similarity: ${(response.ragMetrics?.avgSimilarity || 0 * 100).toFixed(1)}%`);
    } else {
      console.log(`   No RAG sources found or used`);
    }

    return NextResponse.json({
      success: true,
      chatId,
      userMessage: response.userMessage,
      assistantMessage: response.assistantMessage,
      ragSources: response.ragSources || [],
      ragMetrics: response.ragMetrics,
      chatMetadata: response.chatMetadata
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ RAG Chat API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'An error occurred while processing your RAG chat request',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/chat/rag',
    method: 'POST',
    description: 'RAG-enhanced chat with retrieval-augmented generation',
    parameters: {
      message: {
        type: 'string',
        required: true,
        description: 'User message to send',
        example: 'How do I use the OpenAI API?'
      },
      chatId: {
        type: 'string',
        required: false,
        description: 'Existing chat ID (will create new if not provided)'
      },
      userId: {
        type: 'string',
        required: false,
        default: 'default-user',
        description: 'User identifier'
      },
      websiteIds: {
        type: 'array',
        required: false,
        description: 'Array of website IDs to search for context',
        example: ['website-1', 'website-2']
      },
      maxChunks: {
        type: 'number',
        required: false,
        default: 5,
        range: '1-20',
        description: 'Maximum number of content chunks to retrieve'
      },
      minSimilarity: {
        type: 'number',
        required: false,
        default: 0.7,
        range: '0.0-1.0',
        description: 'Minimum similarity threshold for chunk relevance'
      },
      useRAG: {
        type: 'boolean',
        required: false,
        default: true,
        description: 'Whether to use RAG enhancement (set false for normal chat)'
      },
      createNewChat: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Create a new chat session'
      },
      chatTitle: {
        type: 'string',
        required: false,
        description: 'Title for new chat session'
      },
      ragInstructions: {
        type: 'string',
        required: false,
        description: 'Custom instructions for how to use RAG context'
      }
    },
    response: {
      success: 'boolean',
      chatId: 'string - Chat session ID',
      userMessage: 'object - User message details',
      assistantMessage: 'object - AI response with metadata',
      ragSources: 'array - Sources used for RAG context',
      ragMetrics: {
        searchTime: 'number - Time to search for relevant content (ms)',
        chunksFound: 'number - Number of relevant chunks found',
        avgSimilarity: 'number - Average similarity score (0-1)'
      },
      chatMetadata: 'object - Chat session metadata'
    },
    examples: {
      basicRAG: {
        message: 'How do I authenticate with the API?',
        createNewChat: true,
        chatTitle: 'API Questions'
      },
      filteredRAG: {
        message: 'What are the rate limits?',
        chatId: 'existing-chat-id',
        websiteIds: ['docs-website-id'],
        maxChunks: 3,
        minSimilarity: 0.8
      },
      standardChat: {
        message: 'Hello, how are you?',
        chatId: 'existing-chat-id',
        useRAG: false
      }
    },
    features: [
      'RAG-enhanced responses with source citations',
      'Fallback to standard chat when no relevant content found',
      'Configurable similarity thresholds and chunk limits',
      'Multi-website content filtering',
      'Conversation history maintained across messages',
      'Real-time search metrics and performance data'
    ]
  });
}
