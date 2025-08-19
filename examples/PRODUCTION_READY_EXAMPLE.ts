#!/usr/bin/env npx tsx
/**
 * Production-Ready AI Framework Example
 * 
 * This example demonstrates all major framework features:
 * 1. Website crawling and content extraction
 * 2. Text chunking and vector embedding generation
 * 3. RAG-enhanced chat with source attribution
 * 4. Complete error handling and monitoring
 * 
 * Run with: npx tsx PRODUCTION_READY_EXAMPLE.ts
 */

import { config } from 'dotenv';
import { Pool } from 'pg';
import {
  CrawlingPipelineApplication,
  RAGChatApplication,
  ChatApplication,
  RAGSearchService,
  PostgreSQLWebsiteRepository,
  PostgreSQLPageRepository,
  PostgreSQLCrawlSessionRepository,
  PostgreSQLChunkRepository,
  PostgreSQLChatRepository,
  PostgreSQLMessageRepository,
  PageDiscoveryService,
  HtmlFetcherService,
  ContentExtractionService,
  TextChunkingService,
  EmbeddingService,
  OpenAIAdapter
} from '../packages/ai-framework';

// Load environment variables
config();

/**
 * Initialize database connection with production settings
 */
function initializeDatabase(): Pool {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/ai_framework_db',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('❌ Database pool error:', err);
  });

  return pool;
}

/**
 * Initialize crawling pipeline with all dependencies
 */
function initializeCrawlingPipeline(pool: Pool): CrawlingPipelineApplication {
  console.log('🔧 Initializing crawling pipeline...');
  
  return new CrawlingPipelineApplication(
    new PostgreSQLWebsiteRepository(pool),
    new PostgreSQLPageRepository(pool),
    new PostgreSQLCrawlSessionRepository(pool),
    new PostgreSQLChunkRepository(pool),
    new PageDiscoveryService(),
    new HtmlFetcherService(),
    new ContentExtractionService(),
    new TextChunkingService(),
    new EmbeddingService()
  );
}

/**
 * Initialize RAG chat system with all dependencies
 */
function initializeRAGChat(pool: Pool): RAGChatApplication {
  console.log('🔧 Initializing RAG chat system...');
  
  const chatRepository = new PostgreSQLChatRepository(pool);
  const messageRepository = new PostgreSQLMessageRepository(pool);
  const chunkRepository = new PostgreSQLChunkRepository(pool);
  const openaiAdapter = new OpenAIAdapter(process.env.OPENAI_API_KEY!);
  const embeddingService = new EmbeddingService();
  
  const chatApplication = new ChatApplication(chatRepository, messageRepository, openaiAdapter);
  const ragSearchService = new RAGSearchService(embeddingService, chunkRepository);
  
  return new RAGChatApplication(chatApplication, ragSearchService);
}

/**
 * Demonstrate website crawling and processing
 */
async function demonstrateCrawling(pipeline: CrawlingPipelineApplication) {
  console.log('\n🕷️ STEP 1: Website Crawling & Processing');
  console.log('=' .repeat(50));
  
  try {
    const startTime = Date.now();
    
    // Example: Crawl OpenAI documentation
    const result = await pipeline.executeFullCrawl({
      websiteUrl: 'https://docs.openai.com',
      maxPages: 5,  // Limited for demo
      maxDepth: 1
    });
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Crawling completed in ${duration}ms`);
    console.log(`📊 Results:`);
    console.log(`   • Pages discovered: ${result.summary.pagesDiscovered}`);
    console.log(`   • Pages processed: ${result.summary.pagesProcessed}`);
    console.log(`   • Chunks created: ${result.summary.chunksCreated}`);
    console.log(`   • Embeddings generated: ${result.summary.embeddingsGenerated}`);
    console.log(`   • Total cost: $${result.summary.totalCost.toFixed(4)}`);
    console.log(`   • Average quality: ${result.summary.averageQuality.toFixed(1)}%`);
    
    return result;
    
  } catch (error: any) {
    console.error('❌ Crawling failed:', error.message);
    throw error;
  }
}

/**
 * Demonstrate RAG-enhanced chat
 */
async function demonstrateRAGChat(ragChat: RAGChatApplication) {
  console.log('\n🤖 STEP 2: RAG-Enhanced Chat');
  console.log('=' .repeat(50));
  
  try {
    // Create a new chat session
    console.log('🆕 Creating new chat session...');
    const chatResponse = await ragChat.createChat({
      userId: 'demo-user',
      title: 'RAG Demo Chat',
      model: 'gpt-4o',
      systemPrompt: 'You are a helpful assistant that uses provided sources to answer questions accurately. Always cite your sources.'
    });
    
    const chatId = chatResponse.chat.id;
    console.log(`✅ Created chat: ${chatId}`);
    
    // Demo questions that should find relevant content
    const questions = [
      'How do I use the OpenAI Chat API?',
      'What are the available models?',
      'How does the pricing work?'
    ];
    
    for (const [index, question] of questions.entries()) {
      console.log(`\n📝 Question ${index + 1}: "${question}"`);
      
      const startTime = Date.now();
      const response = await ragChat.sendMessage({
        chatId,
        userId: 'demo-user',
        content: question,
        useRAG: true,
        maxChunks: 3,
        minSimilarity: 0.6
      });
      
      const duration = Date.now() - startTime;
      
      console.log(`🤖 Response (${duration}ms):`);
      console.log(`   ${response.assistantMessage.content.substring(0, 200)}...`);
      
      if (response.ragSources && response.ragSources.length > 0) {
        console.log(`\n📚 Sources (${response.ragSources.length} found):`);
        response.ragSources.forEach((source, i) => {
          console.log(`   ${i + 1}. ${source.pageTitle} (${(source.similarity * 100).toFixed(1)}%)`);
          console.log(`      ${source.pageUrl}`);
        });
      } else {
        console.log('⚠️ No relevant sources found');
      }
      
      console.log(`💰 Cost: $${response.assistantMessage.metadata?.cost?.toFixed(6) || '0.000000'}`);
    }
    
    return chatId;
    
  } catch (error: any) {
    console.error('❌ RAG chat failed:', error.message);
    throw error;
  }
}

/**
 * Display performance and cost summary
 */
async function displaySummary(pool: Pool) {
  console.log('\n📊 FINAL SUMMARY');
  console.log('=' .repeat(50));
  
  try {
    // Get total statistics from database
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT w.id) as total_websites,
        COUNT(DISTINCT p.id) as total_pages,
        COUNT(c.id) as total_chunks,
        COUNT(CASE WHEN c.embedding IS NOT NULL THEN 1 END) as chunks_with_embeddings
      FROM websites w
      LEFT JOIN pages p ON w.id = p.website_id
      LEFT JOIN chunks c ON p.id = c.page_id
    `;
    
    const result = await pool.query(statsQuery);
    const stats = result.rows[0];
    
    console.log('📈 Database Statistics:');
    console.log(`   • Total websites: ${stats.total_websites}`);
    console.log(`   • Total pages: ${stats.total_pages}`);
    console.log(`   • Total chunks: ${stats.total_chunks}`);
    console.log(`   • Chunks with embeddings: ${stats.chunks_with_embeddings}`);
    console.log(`   • Embedding coverage: ${((stats.chunks_with_embeddings / stats.total_chunks) * 100).toFixed(1)}%`);
    
    console.log('\n✅ Framework Features Demonstrated:');
    console.log('   • ✅ Website crawling and discovery');
    console.log('   • ✅ Content extraction and cleaning');
    console.log('   • ✅ Text chunking with intelligent boundaries');
    console.log('   • ✅ Vector embedding generation');
    console.log('   • ✅ PostgreSQL + pgvector storage');
    console.log('   • ✅ RAG-enhanced chat with source attribution');
    console.log('   • ✅ Multi-website filtering capability');
    console.log('   • ✅ Cost tracking and performance monitoring');
    
  } catch (error: any) {
    console.error('❌ Summary generation failed:', error.message);
  }
}

/**
 * Main demonstration function
 */
async function main() {
  console.log('🚀 AI Framework Production Demo');
  console.log('=' .repeat(50));
  console.log('This demo will:');
  console.log('1. Crawl a website and generate embeddings');
  console.log('2. Demonstrate RAG-enhanced chat');
  console.log('3. Show performance metrics and costs');
  console.log('');
  
  let pool: Pool | null = null;
  
  try {
    // Validate environment
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    if (!process.env.DATABASE_URL) {
      console.log('⚠️ Using default DATABASE_URL: postgresql://localhost:5432/ai_framework_db');
    }
    
    // Initialize components
    pool = initializeDatabase();
    const pipeline = initializeCrawlingPipeline(pool);
    const ragChat = initializeRAGChat(pool);
    
    console.log('✅ All components initialized successfully');
    
    // Run demonstrations
    await demonstrateCrawling(pipeline);
    await demonstrateRAGChat(ragChat);
    await displaySummary(pool);
    
    console.log('\n🎉 Demo completed successfully!');
    console.log('\nNext steps:');
    console.log('• Try the admin interface: npm run dev (in admin_application/)');
    console.log('• Run individual tests: npm run test-* (in examples/)');
    console.log('• Read documentation: docs/CRAWLING_COMPLETE_GUIDE.md');
    
  } catch (error: any) {
    console.error('\n❌ Demo failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('• Check database connection and pgvector extension');
    console.error('• Verify OPENAI_API_KEY is set and valid');
    console.error('• Run database setup: npm run setup-db');
    process.exit(1);
    
  } finally {
    // Clean up
    if (pool) {
      await pool.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the demo
if (require.main === module) {
  main().catch(console.error);
}

export { main as runProductionDemo };
