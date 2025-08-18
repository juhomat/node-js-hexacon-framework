#!/usr/bin/env tsx

/**
 * Single Page API Test Script
 * 
 * Tests the /api/crawling/add-page endpoint which performs the complete pipeline:
 * 1. Add page to website (create website if needed)
 * 2. Extract content from the page
 * 3. Chunk the extracted text
 * 4. Generate vector embeddings
 * 5. Store in database
 * 
 * Usage:
 *   npx tsx test-single-page-api.ts --website https://example.com --page https://example.com/page
 *   npx tsx test-single-page-api.ts --website https://www.advanceb2b.com --page https://www.advanceb2b.com/news/advance-b2b-turned-10
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
config({ path: resolve(__dirname, '../.env') });

interface ApiRequestBody {
  websiteUrl: string;
  pageUrl: string;
  title?: string;
  description?: string;
  priority?: number;
}

interface ApiResponse {
  success: boolean;
  website?: any;
  session?: any;
  summary?: {
    pagesDiscovered: number;
    pagesProcessed: number;
    chunksCreated: number;
    embeddingsGenerated: number;
    processingTimeMs: number;
    totalCost: number;
    averageQuality: number;
  };
  pages?: Array<{
    id: string;
    url: string;
    title?: string;
    status: string;
    chunks: number;
    embeddings: number;
    quality: number;
    tokens: number;
    error?: string;
  }>;
  message: string;
  error?: string;
}

function parseCliArgs(): {
  website: string;
  page: string;
  title?: string;
  description?: string;
  priority?: number;
  baseUrl: string;
  help: boolean;
} {
  const args = process.argv.slice(2);
  const result = {
    website: '',
    page: '',
    title: undefined as string | undefined,
    description: undefined as string | undefined,
    priority: undefined as number | undefined,
    baseUrl: 'http://localhost:3000',
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

      case '--base-url':
        if (!next || next.startsWith('--')) {
          throw new Error('--base-url requires a URL');
        }
        result.baseUrl = next;
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
🧪 Single Page API Test Script
============================================

This script tests the /api/crawling/add-page endpoint which performs the complete 
single page processing pipeline in one API call.

📋 USAGE

  npx tsx test-single-page-api.ts [OPTIONS]

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
                           
  --base-url <url>         API base URL (default: http://localhost:3000)
                           Example: https://your-api.com
                           
  --help, -h              Show this help message

🚀 EXAMPLES

  # Basic usage (your test case)
  npx tsx test-single-page-api.ts \\
    --website https://www.advanceb2b.com \\
    --page https://www.advanceb2b.com/news/advance-b2b-turned-10

  # With full metadata
  npx tsx test-single-page-api.ts \\
    --website https://docs.openai.com \\
    --page https://docs.openai.com/api-reference/chat \\
    --title "Chat API Reference" \\
    --description "OpenAI Chat completion API documentation" \\
    --priority 95

  # High priority blog post
  npx tsx test-single-page-api.ts \\
    --website https://example.com \\
    --page https://example.com/blog/important-announcement \\
    --priority 90

🔄 PIPELINE FLOW

  1. 🌐 Website Verification - Ensure website exists or create it
  2. 📄 Page Addition - Add page to manual crawl session  
  3. 📥 Content Extraction - Extract clean text from HTML
  4. ✂️ Text Chunking - Split content into 300-400 token chunks
  5. 🔢 Vector Embedding - Generate 1536D embeddings using OpenAI
  6. 💾 Database Storage - Store chunks and vectors in PostgreSQL

📊 EXPECTED OUTPUT

  ✅ Complete pipeline execution in single API call
  📈 Processing metrics (time, cost, quality)
  🧮 Chunk and embedding statistics  
  💾 Database storage confirmation
  🎯 Ready for RAG similarity search

⚠️  REQUIREMENTS

  • Admin application running (npm run dev)
  • PostgreSQL database with crawling schema
  • OPENAI_API_KEY environment variable
  • Valid website and page URLs
`);
}

async function callAddPageApi(
  baseUrl: string,
  requestBody: ApiRequestBody
): Promise<ApiResponse> {
  const url = `${baseUrl}/api/crawling/add-page`;
  
  console.log(`🌐 API URL: ${url}`);
  console.log(`📋 Request Body:`, JSON.stringify(requestBody, null, 2));
  console.log();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error || data.message || 'Unknown error'}`);
    }

    return data;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`❌ Cannot connect to API at ${url}. Is the admin application running? (npm run dev)`);
    }
    throw error;
  }
}

function displayResults(result: ApiResponse) {
  if (result.success) {
    console.log('✅ Single Page API Test Completed Successfully!');
    console.log('============================================');
    
    if (result.website) {
      console.log(`🌐 Website: ${result.website.domain}`);
      console.log(`🆔 Website ID: ${result.website.id}`);
    }
    
    if (result.session) {
      console.log(`📋 Session: ${result.session.id} (${result.session.discoveryMethod})`);
    }
    
    if (result.summary) {
      const s = result.summary;
      console.log(`📊 Processing Summary:`);
      console.log(`   📄 Pages Processed: ${s.pagesProcessed}/${s.pagesDiscovered}`);
      console.log(`   🧮 Chunks Created: ${s.chunksCreated}`);
      console.log(`   🔢 Embeddings Generated: ${s.embeddingsGenerated}`);
      console.log(`   ⏱️  Processing Time: ${s.processingTimeMs}ms`);
      console.log(`   💰 Total Cost: $${s.totalCost.toFixed(4)}`);
      console.log(`   📈 Average Quality: ${s.averageQuality.toFixed(1)}/100`);
    }
    
    if (result.pages && result.pages.length > 0) {
      console.log(`\n📋 Page Details:`);
      result.pages.forEach((page, index) => {
        console.log(`  ${index + 1}. ${page.title || 'Untitled'}`);
        console.log(`     URL: ${page.url}`);
        console.log(`     Status: ${page.status === 'completed' ? '✅ completed' : '❌ ' + page.status}`);
        console.log(`     Chunks: ${page.chunks}, Embeddings: ${page.embeddings}`);
        console.log(`     Quality: ${page.quality}/100, Tokens: ${page.tokens}`);
        if (page.error) {
          console.log(`     Error: ${page.error}`);
        }
        console.log();
      });
    }
    
    console.log(`💬 ${result.message}`);
    
    console.log(`\n🎉 SUCCESS: The page has been fully processed and is ready for RAG queries!`);
    console.log(`🔍 The content is now indexed and searchable in your vector database.`);
    
  } else {
    console.log('❌ Single Page API Test Failed');
    console.log('============================================');
    console.log(`🚨 Error: ${result.error}`);
    console.log(`💬 Message: ${result.message}`);
    
    if (result.summary) {
      console.log(`📊 Partial Results:`);
      console.log(`   Pages Processed: ${result.summary.pagesProcessed}`);
      console.log(`   Chunks Created: ${result.summary.chunksCreated}`);
      console.log(`   Processing Time: ${result.summary.processingTimeMs}ms`);
    }
  }
}

async function main() {
  console.log('🧪 Single Page API Test Script');
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
    
    console.log(`🌐 Website: ${cliArgs.website}`);
    console.log(`📄 Page: ${cliArgs.page}`);
    if (cliArgs.title) console.log(`📝 Title: ${cliArgs.title}`);
    if (cliArgs.description) console.log(`📋 Description: ${cliArgs.description}`);
    if (cliArgs.priority) console.log(`⭐ Priority: ${cliArgs.priority}`);
    console.log(`🔗 API Base URL: ${cliArgs.baseUrl}`);
    console.log();
    
    // Prepare API request
    const requestBody: ApiRequestBody = {
      websiteUrl: cliArgs.website,
      pageUrl: cliArgs.page,
    };
    
    if (cliArgs.title) requestBody.title = cliArgs.title;
    if (cliArgs.description) requestBody.description = cliArgs.description;
    if (cliArgs.priority) requestBody.priority = cliArgs.priority;
    
    console.log('🚀 Calling Add Page API...');
    console.log(`📡 This will execute the complete pipeline in one API call:`);
    console.log(`   1. 🌐 Website verification/creation`);
    console.log(`   2. 📄 Page addition to crawl session`);
    console.log(`   3. 📥 Content extraction from HTML`);
    console.log(`   4. ✂️ Text chunking (300-400 tokens)`);
    console.log(`   5. 🔢 Vector embedding generation`);
    console.log(`   6. 💾 Database storage`);
    console.log();
    
    const startTime = Date.now();
    
    const result = await callAddPageApi(cliArgs.baseUrl, requestBody);
    
    const duration = Date.now() - startTime;
    console.log(`⏱️  API call completed in ${duration}ms`);
    console.log();
    
    displayResults(result);
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('\n💡 Use --help for usage information');
    process.exit(1);
  }
}

// Handle dynamic imports for Node.js fetch
async function setupFetch() {
  if (typeof fetch === 'undefined') {
    const { default: fetch } = await import('node-fetch');
    (global as any).fetch = fetch;
  }
}

setupFetch().then(() => main()).catch(console.error);
