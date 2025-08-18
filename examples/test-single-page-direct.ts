#!/usr/bin/env tsx

/**
 * Single Page Direct Test Script
 * 
 * Tests the complete single page pipeline directly using the framework
 * (bypassing the API layer due to TypeScript compilation issues)
 * 
 * This does the complete pipeline in one script:
 * 1. Add page to website (create website if needed)
 * 2. Extract content from the page
 * 3. Chunk the extracted text
 * 4. Generate vector embeddings
 * 5. Store in database
 * 
 * Usage:
 *   npx tsx test-single-page-direct.ts --website https://example.com --page https://example.com/page
 *   npx tsx test-single-page-direct.ts --website https://www.advanceb2b.com --page https://www.advanceb2b.com/news/advance-b2b-turned-10
 */

import { config } from 'dotenv';
import { Pool } from 'pg';
import { resolve } from 'path';

// Load .env from project root
config({ path: resolve(__dirname, '../.env') });

// Framework imports
import { AddManualPage } from '../packages/ai-framework/src/domain/use-cases/crawling/AddManualPage';
import { ExtractPageContent } from '../packages/ai-framework/src/domain/use-cases/crawling/ExtractPageContent';
import { ChunkAndEmbedContent } from '../packages/ai-framework/src/domain/use-cases/crawling/ChunkAndEmbedContent';

// Services
import { HtmlFetcherService } from '../packages/ai-framework/src/domain/services/HtmlFetcherService';
import { ContentExtractionService } from '../packages/ai-framework/src/domain/services/ContentExtractionService';
import { TextChunkingService } from '../packages/ai-framework/src/domain/services/TextChunkingService';
import { EmbeddingService } from '../packages/ai-framework/src/domain/services/EmbeddingService';

// Repositories
import {
  PostgreSQLWebsiteRepository,
  PostgreSQLPageRepository,
  PostgreSQLCrawlSessionRepository,
  PostgreSQLChunkRepository
} from '../packages/ai-framework/src/infrastructure/database';

function parseCliArgs(): {
  website: string;
  page: string;
  title?: string;
  description?: string;
  priority?: number;
  help: boolean;
} {
  const args = process.argv.slice(2);
  const result = {
    website: '',
    page: '',
    title: undefined as string | undefined,
    description: undefined as string | undefined,
    priority: undefined as number | undefined,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--website':
      case '-w':
        if (!next || next.startsWith('--')) {
          throw new Error('--website requires a URL');
        }
        result.website = next;
        i++;
        break;

      case '--page':
      case '-p':
        if (!next || next.startsWith('--')) {
          throw new Error('--page requires a URL');
        }
        result.page = next;
        i++;
        break;

      case '--title':
      case '-t':
        if (!next || next.startsWith('--')) {
          throw new Error('--title requires a value');
        }
        result.title = next;
        i++;
        break;

      case '--description':
      case '-d':
        if (!next || next.startsWith('--')) {
          throw new Error('--description requires a value');
        }
        result.description = next;
        i++;
        break;

      case '--priority':
        if (!next || next.startsWith('--')) {
          throw new Error('--priority requires a number');
        }
        const priority = parseInt(next);
        if (isNaN(priority) || priority < 0 || priority > 100) {
          throw new Error('--priority must be a number between 0 and 100');
        }
        result.priority = priority;
        i++;
        break;

      case '--help':
      case '-h':
        result.help = true;
        break;

      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return result;
}

function showHelp() {
  console.log(`
🧪 Single Page Direct Test Script
============================================

This script tests the complete single page processing pipeline directly 
using the framework components (bypassing the API layer).

📋 USAGE

  npx tsx test-single-page-direct.ts [OPTIONS]

🔧 OPTIONS

  --website, -w <url>      Website base URL (required)
                           Example: https://www.advanceb2b.com
                           
  --page, -p <url>         Specific page URL to process (required)
                           Example: https://www.advanceb2b.com/news/advance-b2b-turned-10
                           
  --title, -t <title>      Optional page title (auto-detected if not provided)
                           Example: "Company News - 10 Year Anniversary"
                           
  --description, -d <desc> Optional page description
                           Example: "Important company milestone announcement"
                           
  --priority <number>      Page priority 0-100 (default: 80)
                           Higher priority = more important
                           
  --help, -h              Show this help message

🚀 EXAMPLES

  # Basic usage (your test case)
  npx tsx test-single-page-direct.ts \\
    --website https://www.advanceb2b.com \\
    --page https://www.advanceb2b.com/news/advance-b2b-turned-10

  # With full metadata
  npx tsx test-single-page-direct.ts \\
    --website https://docs.openai.com \\
    --page https://docs.openai.com/api-reference/chat \\
    --title "Chat API Reference" \\
    --description "OpenAI Chat completion API documentation" \\
    --priority 95

🔄 PIPELINE FLOW

  1. 🌐 Add Page - Add page to website with manual discovery method
  2. 📥 Content Extraction - Extract clean text from HTML
  3. ✂️ Text Chunking - Split content into 300-400 token chunks
  4. 🔢 Vector Embedding - Generate 1536D embeddings using OpenAI
  5. 💾 Database Storage - Store chunks and vectors in PostgreSQL

📊 EXPECTED OUTPUT

  ✅ Complete pipeline execution in single script
  📈 Processing metrics (time, cost, quality)
  🧮 Chunk and embedding statistics  
  💾 Database storage confirmation
  🎯 Ready for RAG similarity search
`);
}

async function executeSinglePagePipeline(
  website: string,
  page: string,
  title?: string,
  description?: string,
  priority?: number
) {
  const startTime = Date.now();
  
  console.log('🔍 Initializing database connection...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    console.log('🛠️  Initializing framework components...');
    
    // Repositories
    const websiteRepository = new PostgreSQLWebsiteRepository(pool);
    const pageRepository = new PostgreSQLPageRepository(pool);
    const crawlSessionRepository = new PostgreSQLCrawlSessionRepository(pool);
    const chunkRepository = new PostgreSQLChunkRepository(pool);

    // Services
    const htmlFetcherService = new HtmlFetcherService();
    const contentExtractionService = new ContentExtractionService();
    const textChunkingService = new TextChunkingService();
    const embeddingService = new EmbeddingService();

    // Use Cases
    const addManualPageUseCase = new AddManualPage(pageRepository, websiteRepository, crawlSessionRepository);
    const extractPageContentUseCase = new ExtractPageContent(pageRepository, htmlFetcherService, contentExtractionService, crawlSessionRepository, websiteRepository);
    const chunkAndEmbedContentUseCase = new ChunkAndEmbedContent(pageRepository, chunkRepository, textChunkingService, embeddingService, crawlSessionRepository, websiteRepository);

    console.log('✅ Framework components initialized');
    console.log();

    let pageQuality = 0;
    let pageTokens = 0;
    let totalChunks = 0;
    let totalEmbeddings = 0;
    let totalCost = 0;

    // Step 1: Add page manually
    console.log('📄 Step 1: Adding Page to Website');
    console.log('============================================');
    console.log(`🌐 Website: ${website}`);
    console.log(`📄 Page: ${page}`);
    if (title) console.log(`📝 Title: ${title}`);
    if (description) console.log(`📋 Description: ${description}`);
    console.log(`⭐ Priority: ${priority || 80}`);
    console.log();

    const addPageResult = await addManualPageUseCase.execute({
      websiteUrl: website,
      pageUrl: page,
      title,
      description,
      priority
    });

    if (!addPageResult.success || !addPageResult.page) {
      throw new Error(`Failed to add page: ${addPageResult.message}`);
    }

    console.log(`✅ Page added successfully: ${addPageResult.page.url}`);
    console.log(`🆔 Page ID: ${addPageResult.page.id}`);
    console.log(`🌐 Website: ${addPageResult.website.domain}`);
    console.log(`📋 Session: ${addPageResult.crawlSession.id} (${addPageResult.crawlSession.discoveryMethod})`);
    console.log();

    // Step 2: Extract content
    console.log('📥 Step 2: Content Extraction');
    console.log('============================================');
    
    const extractionResult = await extractPageContentUseCase.execute({
      pageId: addPageResult.page.id,
      updateDatabase: true
    });

    if (!extractionResult.success) {
      throw new Error(`Content extraction failed: ${extractionResult.message}`);
    }
    
    if (!extractionResult.page) {
      throw new Error(`No page returned from content extraction`);
    }

    // Handle case where content was already extracted
    if (extractionResult.extractedContent) {
      pageQuality = extractionResult.extractedContent.qualityScore;
      pageTokens = extractionResult.extractedContent.estimatedTokens;
    } else {
      // Content was already extracted, get quality from page metadata
      pageQuality = extractionResult.page.metadata?.extractionQuality || 0;
      pageTokens = extractionResult.page.tokenCount || 0;
    }

    console.log(`✅ Content extraction completed`);
    console.log(`📊 Quality Score: ${pageQuality}/100`);
    if (extractionResult.extractedContent) {
      console.log(`📝 Word Count: ${extractionResult.extractedContent.wordCount}`);
      console.log(`🔤 Character Count: ${extractionResult.extractedContent.charCount}`);
      console.log(`🎯 Extraction Method: ${extractionResult.extractedContent.extractionMethod}`);
    } else {
      console.log(`📝 Content already extracted (using existing content)`);
    }
    console.log(`📏 Estimated Tokens: ${pageTokens}`);
    console.log();

    // Step 3: Chunk and embed
    console.log('✂️ Step 3: Chunking and Embedding');
    console.log('============================================');
    
    const chunkAndEmbedResult = await chunkAndEmbedContentUseCase.execute({
      pageId: addPageResult.page.id,
      updateDatabase: true,
      chunkingOptions: {
        minTokens: 300,
        maxTokens: 400,
        overlapPercent: 17.5
      },
      embeddingOptions: {
        model: 'text-embedding-3-small'
      }
    });

    if (!chunkAndEmbedResult.success) {
      throw new Error(`Chunking and embedding failed: ${chunkAndEmbedResult.message}`);
    }

    totalChunks = chunkAndEmbedResult.chunksCreated;
    totalEmbeddings = chunkAndEmbedResult.embeddingsGenerated;
    totalCost = chunkAndEmbedResult.totalCost;

    console.log(`✅ Chunking and embedding completed`);
    console.log(`🧮 Chunks Created: ${totalChunks}`);
    console.log(`🔢 Embeddings Generated: ${totalEmbeddings}`);
    console.log(`🎯 Total Tokens: ${chunkAndEmbedResult.totalTokens || 0}`);
    console.log(`💰 Total Cost: $${totalCost.toFixed(4)}`);
    console.log();

    const processingTime = Date.now() - startTime;

    // Final summary
    console.log('🎉 Single Page Pipeline Completed Successfully!');
    console.log('============================================');
    console.log(`🌐 Website: ${addPageResult.website.domain}`);
    console.log(`📄 Page: ${addPageResult.page.url}`);
    console.log(`📝 Title: ${addPageResult.page.title || 'Auto-detected'}`);
    console.log(`🆔 Page ID: ${addPageResult.page.id}`);
    console.log();
    console.log(`📊 Processing Summary:`);
    console.log(`   📄 Pages Processed: 1/1`);
    console.log(`   🧮 Chunks Created: ${totalChunks}`);
    console.log(`   🔢 Embeddings Generated: ${totalEmbeddings}`);
    console.log(`   ⏱️  Processing Time: ${processingTime}ms`);
    console.log(`   💰 Total Cost: $${(totalCost || 0).toFixed(4)}`);
    console.log(`   📈 Quality Score: ${(pageQuality || 0).toFixed(1)}/100`);
    console.log(`   📏 Total Tokens: ${pageTokens || 0}`);
    console.log();
    console.log(`🎯 SUCCESS: The page has been fully processed and is ready for RAG queries!`);
    console.log(`🔍 The content is now indexed and searchable in your vector database.`);
    console.log(`💾 All data is stored in PostgreSQL with pgvector embeddings.`);

  } catch (error: any) {
    console.error('❌ Single page pipeline failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('🧪 Single Page Direct Test Script');
  console.log('============================================');
  
  try {
    const cliArgs = parseCliArgs();
    
    if (cliArgs.help) {
      showHelp();
      return;
    }
    
    // Validate required arguments
    if (!cliArgs.website) {
      throw new Error('--website is required. Use --help for usage information.');
    }
    
    if (!cliArgs.page) {
      throw new Error('--page is required. Use --help for usage information.');
    }
    
    // Validate URLs
    try {
      new URL(cliArgs.website);
      new URL(cliArgs.page);
    } catch (error) {
      throw new Error('Invalid URL format. Please provide valid HTTP/HTTPS URLs.');
    }
    
    // Validate that page URL belongs to the website domain
    const websiteDomain = new URL(cliArgs.website).hostname;
    const pageDomain = new URL(cliArgs.page).hostname;
    if (websiteDomain !== pageDomain) {
      throw new Error(`Page URL domain (${pageDomain}) must match website URL domain (${websiteDomain})`);
    }
    
    await executeSinglePagePipeline(
      cliArgs.website,
      cliArgs.page,
      cliArgs.title,
      cliArgs.description,
      cliArgs.priority
    );
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('\n💡 Use --help for usage information');
    process.exit(1);
  }
}

main().catch(console.error);
