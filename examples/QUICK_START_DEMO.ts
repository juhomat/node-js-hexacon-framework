#!/usr/bin/env tsx

/**
 * 🚀 Quick Start Demo - AI Framework Crawling & Processing
 * 
 * This script demonstrates the complete crawling pipeline:
 * 1. Full website crawling with discovery
 * 2. Manual page addition
 * 3. Vector search across crawled content
 * 
 * Run this script to test the complete framework functionality.
 */

import { config } from 'dotenv';
import { Pool } from 'pg';
import * as path from 'path';

// Load environment variables
config({ path: path.resolve(__dirname, '../.env') });

// Framework imports
import { CrawlingPipelineApplication } from '../packages/ai-framework/src/application/CrawlingPipelineApplication';

// Repositories
import {
  PostgreSQLWebsiteRepository,
  PostgreSQLPageRepository,
  PostgreSQLCrawlSessionRepository,
  PostgreSQLChunkRepository
} from '../packages/ai-framework/src/infrastructure/database';

// Services
import {
  PageDiscoveryService,
  HtmlFetcherService,
  ContentExtractionService,
  TextChunkingService,
  EmbeddingService
} from '../packages/ai-framework/src/domain/services';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function quickStartDemo() {
  log('\n🚀 AI Framework - Crawling & Processing Demo', colors.bright + colors.blue);
  log('=' .repeat(60), colors.blue);

  // Initialize database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Test database connection
    log('\n1️⃣ Testing Database Connection...', colors.yellow);
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    log('✅ Database connection successful', colors.green);

    // Initialize repositories
    log('\n2️⃣ Initializing Framework Components...', colors.yellow);
    const websiteRepository = new PostgreSQLWebsiteRepository(pool);
    const pageRepository = new PostgreSQLPageRepository(pool);
    const crawlSessionRepository = new PostgreSQLCrawlSessionRepository(pool);
    const chunkRepository = new PostgreSQLChunkRepository(pool);

    // Initialize services
    const pageDiscoveryService = new PageDiscoveryService();
    const htmlFetcherService = new HtmlFetcherService();
    const contentExtractionService = new ContentExtractionService();
    const textChunkingService = new TextChunkingService();
    const embeddingService = new EmbeddingService();

    // Initialize pipeline application
    const pipelineApp = new CrawlingPipelineApplication(
      websiteRepository,
      pageRepository,
      crawlSessionRepository,
      chunkRepository,
      pageDiscoveryService,
      htmlFetcherService,
      contentExtractionService,
      textChunkingService,
      embeddingService
    );

    log('✅ Framework components initialized', colors.green);

    // Demo 1: Full Website Crawling
    log('\n3️⃣ Demo 1: Full Website Crawling', colors.yellow);
    log('Target: https://example.com (small, fast demo site)', colors.cyan);
    
    const fullCrawlResult = await pipelineApp.executeFullCrawl({
      websiteUrl: 'https://example.com',
      maxPages: 3,
      maxDepth: 1,
      description: 'Demo website for testing'
    });

    if (fullCrawlResult.success) {
      log('✅ Full crawl completed successfully', colors.green);
      log(`📊 Pages processed: ${fullCrawlResult.summary.pagesProcessed}`, colors.cyan);
      log(`📄 Chunks created: ${fullCrawlResult.summary.chunksCreated}`, colors.cyan);
      log(`🧮 Embeddings generated: ${fullCrawlResult.summary.embeddingsGenerated}`, colors.cyan);
      log(`⏱️ Processing time: ${(fullCrawlResult.summary.processingTimeMs / 1000).toFixed(1)}s`, colors.cyan);
      log(`💰 Cost: $${fullCrawlResult.summary.totalCost.toFixed(4)}`, colors.cyan);
      log(`🎯 Average quality: ${fullCrawlResult.summary.averageQuality}%`, colors.cyan);
    } else {
      log(`❌ Full crawl failed: ${fullCrawlResult.error}`, colors.red);
    }

    // Demo 2: Manual Page Addition
    log('\n4️⃣ Demo 2: Manual Page Addition', colors.yellow);
    log('Adding a different page with high priority', colors.cyan);
    
    try {
      const addPageResult = await pipelineApp.executeAddPage({
        websiteUrl: 'https://httpbin.org',
        pageUrl: 'https://httpbin.org/html',
        title: 'HTTPBin HTML Test Page',
        priority: 95
      });

      if (addPageResult.success) {
        log('✅ Page addition completed successfully', colors.green);
        log(`📄 Chunks created: ${addPageResult.summary.chunksCreated}`, colors.cyan);
        log(`🧮 Embeddings generated: ${addPageResult.summary.embeddingsGenerated}`, colors.cyan);
        log(`⏱️ Processing time: ${(addPageResult.summary.processingTimeMs / 1000).toFixed(1)}s`, colors.cyan);
        log(`💰 Cost: $${addPageResult.summary.totalCost.toFixed(4)}`, colors.cyan);
      } else {
        log(`❌ Page addition failed: ${addPageResult.error}`, colors.red);
      }
    } catch (error: any) {
      log(`❌ Page addition error: ${error.message}`, colors.red);
      log('ℹ️ Skipping manual page addition demo', colors.yellow);
    }

    // Demo 3: Vector Search
    log('\n5️⃣ Demo 3: Vector Search Across Crawled Content', colors.yellow);
    
    const searchQuery = "example domain information";
    log(`🔍 Searching for: "${searchQuery}"`, colors.cyan);
    
    // Generate embedding for search query
    const { embedding } = await embeddingService.generateEmbedding(searchQuery);
    
    // Search for similar chunks
    const searchResults = await chunkRepository.searchSimilar(embedding, 3);
    
    if (searchResults.length > 0) {
      log(`✅ Found ${searchResults.length} relevant chunks`, colors.green);
      
      searchResults.forEach((chunk, index) => {
        log(`\n📄 Result ${index + 1}:`, colors.magenta);
        log(`   🎯 Similarity: ${((chunk.similarity || 0) * 100).toFixed(1)}%`, colors.cyan);
        const content = chunk.content || 'No content available';
        log(`   📝 Content: ${content.substring(0, 150)}${content.length > 150 ? '...' : ''}`, colors.reset);
        log(`   🔗 Source: Page ID ${chunk.pageId || 'unknown'}`, colors.cyan);
      });
    } else {
      log('❌ No search results found', colors.red);
    }

    // Demo 4: Database Statistics
    log('\n6️⃣ Demo 4: Database Statistics', colors.yellow);
    
    const websiteStats = await pool.query(`
      SELECT 
        COUNT(DISTINCT w.id) as websites,
        COUNT(DISTINCT p.id) as pages,
        COUNT(DISTINCT c.id) as chunks,
        COALESCE(SUM(c.token_count), 0) as total_tokens
      FROM websites w
      LEFT JOIN pages p ON w.id = p.website_id
      LEFT JOIN chunks c ON p.id = c.page_id
    `);
    
    const stats = websiteStats.rows[0];
    log('📊 Current Database Statistics:', colors.magenta);
    log(`   🌐 Websites: ${stats.websites}`, colors.cyan);
    log(`   📄 Pages: ${stats.pages}`, colors.cyan);
    log(`   🧩 Chunks: ${stats.chunks}`, colors.cyan);
    log(`   📝 Total tokens: ${parseInt(stats.total_tokens).toLocaleString()}`, colors.cyan);

    // Demo 5: Recent Activity
    log('\n7️⃣ Demo 5: Recent Crawling Activity', colors.yellow);
    
    const recentSessions = await pool.query(`
      SELECT 
        cs.id,
        w.domain,
        cs.status,
        cs.pages_discovered,
        cs.pages_completed,
        cs.chunks_created,
        cs.completed_at
      FROM crawl_sessions cs
      JOIN websites w ON cs.website_id = w.id
      ORDER BY cs.created_at DESC
      LIMIT 5
    `);
    
    if (recentSessions.rows.length > 0) {
      log('📈 Recent Crawl Sessions:', colors.magenta);
      recentSessions.rows.forEach((session, index) => {
        const completedAt = session.completed_at ? new Date(session.completed_at).toLocaleString() : 'In progress';
        log(`   ${index + 1}. ${session.domain} - ${session.status}`, colors.cyan);
        log(`      📊 ${session.pages_completed}/${session.pages_discovered} pages, ${session.chunks_created} chunks`, colors.reset);
        log(`      ⏰ ${completedAt}`, colors.reset);
      });
    } else {
      log('📈 No recent crawl sessions found', colors.cyan);
    }

    log('\n🎉 Demo Complete!', colors.bright + colors.green);
    log('=' .repeat(60), colors.green);
    log('\n📚 Next Steps:', colors.yellow);
    log('1. Check the complete documentation: docs/CRAWLING_COMPLETE_GUIDE.md', colors.reset);
    log('2. Try the API endpoints: /api/crawling/full-crawl', colors.reset);
    log('3. Integrate into your application using the framework components', colors.reset);
    log('4. Explore the example scripts in the examples/ directory', colors.reset);

  } catch (error: any) {
    log(`\n❌ Demo failed: ${error.message}`, colors.bright + colors.red);
    log(`Stack trace: ${error.stack}`, colors.red);
  } finally {
    await pool.end();
  }
}

// Run the demo
if (require.main === module) {
  quickStartDemo().catch((error) => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

export { quickStartDemo };
