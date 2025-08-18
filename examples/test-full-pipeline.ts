/**
 * Full Pipeline Test Script
 * 
 * Tests the complete end-to-end pipeline directly using framework components
 * without needing the web API. This is the core framework test.
 * 
 * Usage:
 * npx tsx test-full-pipeline.ts --url https://example.com --max-pages 5 --max-depth 1
 * npx tsx test-full-pipeline.ts --add-page --website https://example.com --page https://example.com/docs
 */

import { config } from 'dotenv';
import { Pool } from 'pg';
import { resolve } from 'path';

// Load .env from project root
config({ path: resolve(__dirname, '../.env') });

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

import { PipelineProgress } from '../packages/ai-framework/src/application/CrawlingPipelineApplication';

interface CliArgs {
  url?: string;
  addPage?: boolean;
  website?: string;
  page?: string;
  maxPages?: number;
  maxDepth?: number;
  priority?: number;
  help?: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: CliArgs = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--help': case '-h': 
        parsed.help = true; 
        break;
      case '--url': case '-u': 
        parsed.url = nextArg; 
        i++; 
        break;
      case '--add-page':
        parsed.addPage = true;
        break;
      case '--website': case '-w': 
        parsed.website = nextArg; 
        i++; 
        break;
      case '--page': case '-p': 
        parsed.page = nextArg; 
        i++; 
        break;
      case '--max-pages': 
        parsed.maxPages = parseInt(nextArg); 
        i++; 
        break;
      case '--max-depth': 
        parsed.maxDepth = parseInt(nextArg); 
        i++; 
        break;
      case '--priority': 
        parsed.priority = parseInt(nextArg); 
        i++; 
        break;
    }
  }
  
  return parsed;
}

function showHelp() {
  console.log(`
🚀 AI Framework - Full Pipeline Test Script

Tests the complete crawling pipeline directly using framework components.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 USAGE

  # Full website crawling pipeline
  npx tsx test-full-pipeline.ts --url <website-url> [options]
  
  # Manual page addition pipeline
  npx tsx test-full-pipeline.ts --add-page --website <website-url> --page <page-url> [options]

📊 OPTIONS

  --url, -u <url>          Website URL for full crawling
                           Example: https://docs.openai.com
                           
  --add-page               Switch to manual page addition mode
  
  --website, -w <url>      Website URL for page addition mode
                           Example: https://docs.openai.com
                           
  --page, -p <url>         Specific page URL to add
                           Example: https://docs.openai.com/api-reference/chat
                           
  --max-pages <number>     Maximum pages to crawl (default: 10)
                           Only for full crawling mode
                           
  --max-depth <number>     Maximum crawling depth (default: 1)
                           Only for full crawling mode
                           
  --priority <number>      Page priority 0-100 (default: 80)
                           Only for page addition mode
                           
  --help, -h              Show this help message

🚀 EXAMPLES

  # Test full website crawling (your requested test)
  npx tsx test-full-pipeline.ts --url https://www.advanceb2b.com --max-pages 50 --max-depth 3

  # Test with smaller scope for faster testing
  npx tsx test-full-pipeline.ts --url https://example.com --max-pages 5 --max-depth 1

  # Test manual page addition
  npx tsx test-full-pipeline.ts --add-page --website https://docs.openai.com --page https://docs.openai.com/api-reference/chat

💡 PIPELINE STAGES

  Full Crawling:
    1. 🔍 Website Discovery - Sitemap parsing and intelligent page prioritization
    2. 📄 Content Extraction - HTML fetching and main content extraction
    3. ✂️  Text Chunking - Smart 300-400 token chunks with 15-20% overlap
    4. 🔢 Embedding Generation - OpenAI text-embedding-3-small (1536D vectors)
    5. 💾 Database Storage - PostgreSQL with pgvector for similarity search

  Page Addition:
    1. 📝 Page Addition - Add specific page to website/session
    2. 📄 Content Extraction - Extract content from the page
    3. ✂️  Text Chunking - Smart chunking with overlap
    4. 🔢 Embedding Generation - OpenAI embeddings
    5. 💾 Database Storage - Ready for RAG queries

🔧 PREREQUISITES

  Environment Variables:
    OPENAI_API_KEY    Required for embedding generation
    DATABASE_URL      Required for PostgreSQL operations
  
  Database:
    PostgreSQL with crawling schema installed
    pgvector extension enabled

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 This script tests the core framework without needing the web UI.
   Perfect for validating the complete pipeline functionality.
`);
}

async function testFullPipeline() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  console.log('🚀 Full Pipeline Test - Core Framework');
  console.log('============================================');

  // Validate arguments
  if (!args.addPage && !args.url) {
    console.error('❌ URL is required for full crawling mode');
    console.log('💡 Example: npx tsx test-full-pipeline.ts --url https://example.com');
    process.exit(1);
  }

  if (args.addPage && (!args.website || !args.page)) {
    console.error('❌ Both website and page URLs are required for add-page mode');
    console.log('💡 Example: npx tsx test-full-pipeline.ts --add-page --website https://example.com --page https://example.com/docs');
    process.exit(1);
  }

  // Initialize database connection
  console.log('🔍 Initializing database connection...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    console.error('💡 Make sure DATABASE_URL is set and PostgreSQL is running');
    process.exit(1);
  }

  // Initialize services and repositories
  console.log('🛠️  Initializing framework components...');
  
  const websiteRepository = new PostgreSQLWebsiteRepository(pool);
  const pageRepository = new PostgreSQLPageRepository(pool);
  const crawlSessionRepository = new PostgreSQLCrawlSessionRepository(pool);
  const chunkRepository = new PostgreSQLChunkRepository(pool);

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

  console.log('✅ Framework components initialized');
  console.log();

  // Progress callback for real-time updates
  const progressCallback = (progress: PipelineProgress) => {
    const progressBar = '█'.repeat(Math.floor(progress.progress / 5)) + '░'.repeat(20 - Math.floor(progress.progress / 5));
    console.log(`📊 [${progressBar}] ${progress.progress.toFixed(1)}% - ${progress.stage}: ${progress.message}`);
    
    if (progress.details.pagesDiscovered) {
      console.log(`   📄 Pages: ${progress.details.pagesProcessed || 0}/${progress.details.pagesDiscovered} processed`);
    }
    if (progress.details.chunksCreated) {
      console.log(`   🧮 Chunks: ${progress.details.chunksCreated}, Embeddings: ${progress.details.embeddingsGenerated || 0}`);
    }
    if (progress.details.totalCost) {
      console.log(`   💰 Cost: $${progress.details.totalCost.toFixed(4)}`);
    }
    console.log();
  };

  try {
    if (args.addPage) {
      // Manual page addition mode
      console.log('📝 Starting Manual Page Addition Pipeline');
      console.log('============================================');
      console.log(`🌐 Website: ${args.website}`);
      console.log(`📄 Page: ${args.page}`);
      console.log(`🎯 Priority: ${args.priority || 80}`);
      console.log();

      const result = await pipelineApp.executeAddPage({
        websiteUrl: args.website!,
        pageUrl: args.page!,
        title: 'Test Page from Full Pipeline Script',
        description: 'Page added via full pipeline test script',
        priority: args.priority || 80
      }, progressCallback);

      if (result.success) {
        console.log('✅ Page Addition Pipeline Completed Successfully!');
        console.log('============================================');
        console.log(`🌐 Website: ${result.website.domain}`);
        console.log(`📄 Page: ${result.pages[0]?.title}`);
        console.log(`🧮 Chunks Created: ${result.summary.chunksCreated}`);
        console.log(`🔢 Embeddings Generated: ${result.summary.embeddingsGenerated}`);
        console.log(`⏱️  Duration: ${result.summary.processingTimeMs}ms`);
        console.log(`💰 Total Cost: $${result.summary.totalCost.toFixed(4)}`);
        console.log(`📈 Quality: ${result.summary.averageQuality.toFixed(1)}/100`);
        console.log();
        console.log(`💬 ${result.message}`);
        
      } else {
        console.error('❌ Page Addition Pipeline Failed');
        console.error('============================================');
        console.error(`🚨 Error: ${result.error}`);
        console.error(`💬 Message: ${result.message}`);
      }

    } else {
      // Full website crawling mode
      console.log('🌐 Starting Full Website Crawling Pipeline');
      console.log('============================================');
      console.log(`🌐 URL: ${args.url}`);
      console.log(`📄 Max Pages: ${args.maxPages || 10}`);
      console.log(`📊 Max Depth: ${args.maxDepth || 1}`);
      console.log();

      const result = await pipelineApp.executeFullCrawl({
        websiteUrl: args.url!,
        maxPages: args.maxPages || 10,
        maxDepth: args.maxDepth || 1,
        description: `Test crawl from full pipeline script`,
        sessionMetadata: {
          testScript: true,
          testTimestamp: new Date().toISOString(),
          requestedMaxPages: args.maxPages || 10,
          requestedMaxDepth: args.maxDepth || 1
        }
      }, progressCallback);

      if (result.success) {
        console.log('✅ Full Crawling Pipeline Completed Successfully!');
        console.log('============================================');
        console.log(`🌐 Website: ${result.website.domain}`);
        console.log(`📊 Pages Discovered: ${result.summary.pagesDiscovered}`);
        console.log(`📄 Pages Processed: ${result.summary.pagesProcessed}`);
        console.log(`🧮 Chunks Created: ${result.summary.chunksCreated}`);
        console.log(`🔢 Embeddings Generated: ${result.summary.embeddingsGenerated}`);
        console.log(`⏱️  Duration: ${result.summary.processingTimeMs}ms`);
        console.log(`💰 Total Cost: $${result.summary.totalCost.toFixed(4)}`);
        console.log(`📈 Average Quality: ${result.summary.averageQuality.toFixed(1)}/100`);
        console.log();
        
        if (result.pages.length > 0) {
          console.log('📋 Processed Pages Summary:');
          result.pages.slice(0, 5).forEach((page, index) => {
            console.log(`  ${index + 1}. ${page.title}`);
            console.log(`     URL: ${page.url}`);
            console.log(`     Status: ${page.status === 'completed' ? '✅' : '❌'} ${page.status}`);
            console.log(`     Chunks: ${page.chunksCreated}, Embeddings: ${page.embeddingsGenerated}`);
            console.log(`     Quality: ${page.quality}/100, Tokens: ${page.tokenCount}`);
            if (page.error) console.log(`     Error: ${page.error}`);
            console.log();
          });
          
          if (result.pages.length > 5) {
            console.log(`     ... and ${result.pages.length - 5} more pages`);
            console.log();
          }
        }
        
        console.log(`💬 ${result.message}`);
        
      } else {
        console.error('❌ Full Crawling Pipeline Failed');
        console.error('============================================');
        console.error(`🚨 Error: ${result.error}`);
        console.error(`💬 Message: ${result.message}`);
        
        if (result.summary) {
          console.error(`📊 Partial Results:`);
          console.error(`   Pages Discovered: ${result.summary.pagesDiscovered}`);
          console.error(`   Pages Processed: ${result.summary.pagesProcessed}`);
          console.error(`   Duration: ${result.summary.processingTimeMs}ms`);
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Pipeline Test Failed');
    console.error('============================================');
    console.error(`🚨 Error: ${error.message}`);
    console.error(`📚 Stack: ${error.stack}`);
  } finally {
    await pool.end();
    console.log();
    console.log('🔚 Pipeline test completed');
  }
}

// Main execution
testFullPipeline().catch(console.error);
