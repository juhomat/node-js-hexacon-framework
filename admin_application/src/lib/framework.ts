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
  ChatApplication,
  StatelessChatApplication
} from 'ai-framework'

// Database pool singleton
let dbPool: Pool | null = null

// Framework instances
let chatApplication: ChatApplication | null = null
let statelessChatApplication: StatelessChatApplication | null = null

/**
 * Initialize the database pool
 */
function initializeDatabase(): Pool {
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
 * Close database connections
 */
export async function closeDatabaseConnections(): Promise<void> {
  if (dbPool) {
    await dbPool.end()
    dbPool = null
    chatApplication = null
    statelessChatApplication = null
  }
}
