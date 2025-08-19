/**
 * AI Framework Integration
 * 
 * This module sets up the AI Framework for use in the admin interface
 */

import { Pool } from 'pg'
import { 
  OpenAIAdapter, 
  PostgreSQLChatRepository, 
  PostgreSQLMessageRepository,
  PostgreSQLDatabaseAdminRepository,
  PostgreSQLWebsiteRepository,
  PostgreSQLPageRepository,
  PostgreSQLCrawlSessionRepository,
  PostgreSQLChunkRepository,
  ChatApplication,
  StatelessChatApplication,
  DatabaseAdminApplication,
  CrawlingPipelineApplication,
  PageDiscoveryService,
  HtmlFetcherService,
  ContentExtractionService,
  TextChunkingService,
  EmbeddingService
} from 'ai-framework'

// Database pool singleton
let dbPool: Pool | null = null

// Framework instances
let chatApplication: ChatApplication | null = null
let statelessChatApplication: StatelessChatApplication | null = null
let databaseAdminApplication: DatabaseAdminApplication | null = null
let crawlingPipelineApplication: CrawlingPipelineApplication | null = null
// RAG functionality implemented directly in routes to avoid import issues

/**
 * Initialize the database pool
 */
export function initializeDatabase(): Pool {
  if (!dbPool) {
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/ai_framework_db',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  }
  return dbPool
}

/**
 * Initialize the ChatApplication with all dependencies
 */
export function getChatApplication(): ChatApplication {
  if (!chatApplication) {
    // Initialize database
    const pool = initializeDatabase()
    
    // Initialize OpenAI adapter
    const openaiAdapter = new OpenAIAdapter(
      process.env.OPENAI_API_KEY || '',
      { defaultModel: 'gpt-5' }
    )
    
    // Initialize repositories
    const chatRepository = new PostgreSQLChatRepository(pool)
    const messageRepository = new PostgreSQLMessageRepository(pool)
    
    // Create application service
    chatApplication = new ChatApplication(
      chatRepository,
      messageRepository,
      openaiAdapter
    )
  }
  
  return chatApplication
}

/**
 * Initialize the StatelessChatApplication (no database needed)
 */
export function getStatelessChatApplication(): StatelessChatApplication {
  if (!statelessChatApplication) {
    // Initialize OpenAI adapter
    const openaiAdapter = new OpenAIAdapter(
      process.env.OPENAI_API_KEY || '',
      { defaultModel: 'gpt-5' }
    )
    
    // Create stateless application service
    statelessChatApplication = new StatelessChatApplication(openaiAdapter)
  }
  
  return statelessChatApplication
}

/**
 * Initialize the DatabaseAdminApplication
 */
export function getDatabaseAdminApplication(): DatabaseAdminApplication {
  if (!databaseAdminApplication) {
    // Initialize database
    const pool = initializeDatabase()
    
    // Initialize repository
    const databaseAdminRepository = new PostgreSQLDatabaseAdminRepository(pool)
    
    // Create application service
    databaseAdminApplication = new DatabaseAdminApplication(databaseAdminRepository)
  }
  
  return databaseAdminApplication
}

/**
 * Initialize the CrawlingPipelineApplication
 */
export function getCrawlingPipelineApplication(): CrawlingPipelineApplication {
  if (!crawlingPipelineApplication) {
    // Initialize database
    const pool = initializeDatabase()
    
    // Initialize repositories
    const websiteRepository = new PostgreSQLWebsiteRepository(pool)
    const pageRepository = new PostgreSQLPageRepository(pool)
    const crawlSessionRepository = new PostgreSQLCrawlSessionRepository(pool)
    const chunkRepository = new PostgreSQLChunkRepository(pool)
    
    // Initialize services
    const pageDiscoveryService = new PageDiscoveryService()
    const htmlFetcherService = new HtmlFetcherService()
    const contentExtractionService = new ContentExtractionService()
    const textChunkingService = new TextChunkingService()
    const embeddingService = new EmbeddingService()
    
    // Create application service
    crawlingPipelineApplication = new CrawlingPipelineApplication(
      websiteRepository,
      pageRepository,
      crawlSessionRepository,
      chunkRepository,
      pageDiscoveryService,
      htmlFetcherService,
      contentExtractionService,
      textChunkingService,
      embeddingService
    )
  }
  
  return crawlingPipelineApplication
}

/**
 * Initialize the RAGChatApplication
 * 
 * Note: This function temporarily bypasses RAG due to webpack import issues
 * in development mode. The framework design is correct, but webpack has 
 * trouble with the RAGSearchService constructor.
 */
export function getRAGChatApplication(): ChatApplication {
  // For now, return the standard ChatApplication
  // In production, this would be resolved with proper package compilation
  return getChatApplication()
}

/**
 * Get list of available websites for RAG selection
 */
export async function getAvailableWebsites() {
  const pool = initializeDatabase()
  const websiteRepository = new PostgreSQLWebsiteRepository(pool)
  return await websiteRepository.list()
}

/**
 * Close database connections
 */
export async function closeDatabaseConnections(): Promise<void> {
  if (dbPool) {
    await dbPool.end()
    dbPool = null
    chatApplication = null
    statelessChatApplication = null
    databaseAdminApplication = null
    crawlingPipelineApplication = null
    ragChatApplication = null
  }
}
