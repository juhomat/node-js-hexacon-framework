/**
 * API Endpoints Test Script
 * 
 * Tests the new crawling API endpoints:
 * 1. /api/crawling/full-crawl - Complete website crawling pipeline
 * 2. /api/crawling/add-page - Manual page addition pipeline
 * 3. /api/crawling/full-crawl-stream - Streaming crawling with progress
 * 
 * Usage:
 * npx tsx test-api-endpoints.ts --endpoint full-crawl --url https://example.com
 * npx tsx test-api-endpoints.ts --endpoint add-page --website https://example.com --page https://example.com/docs
 * npx tsx test-api-endpoints.ts --endpoint stream --url https://example.com
 */

import fetch from 'node-fetch';

interface CliArgs {
  endpoint?: 'full-crawl' | 'add-page' | 'stream' | 'info';
  url?: string;
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
      case '--endpoint': case '-e': 
        parsed.endpoint = nextArg as any; 
        i++; 
        break;
      case '--url': case '-u': 
        parsed.url = nextArg; 
        i++; 
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
🌐 AI Framework - API Endpoints Test Script

Test the new crawling API endpoints with real requests.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 USAGE

  npx tsx test-api-endpoints.ts [options]

📊 OPTIONS

  --endpoint, -e <type>     API endpoint to test:
                            • full-crawl: Complete website crawling
                            • add-page: Manual page addition
                            • stream: Streaming crawling with progress
                            • info: Show endpoint documentation
                            
  --url, -u <url>          Website URL for full-crawl and stream endpoints
                           Example: https://docs.openai.com
                           
  --website, -w <url>      Website URL for add-page endpoint
                           Example: https://docs.openai.com
                           
  --page, -p <url>         Page URL for add-page endpoint
                           Example: https://docs.openai.com/api-reference
                           
  --max-pages <number>     Maximum pages to crawl (default: 5)
                           Only for full-crawl and stream endpoints
                           
  --max-depth <number>     Maximum crawling depth (default: 1)
                           Only for full-crawl and stream endpoints
                           
  --priority <number>      Page priority 0-100 (default: 80)
                           Only for add-page endpoint
                           
  --help, -h              Show this help message

🚀 EXAMPLES

  # Test full website crawling
  npx tsx test-api-endpoints.ts -e full-crawl -u https://example.com --max-pages 3

  # Test manual page addition
  npx tsx test-api-endpoints.ts -e add-page -w https://docs.openai.com -p https://docs.openai.com/api-reference/chat

  # Test streaming crawling
  npx tsx test-api-endpoints.ts -e stream -u https://example.com --max-pages 2

  # Get endpoint information
  npx tsx test-api-endpoints.ts -e info

💡 PREREQUISITES

  1. Admin application must be running (npm run dev in admin_application/)
  2. Database must be set up with crawling schema
  3. OPENAI_API_KEY must be configured
  4. Environment variables properly set

📊 EXPECTED BEHAVIOR

  Full Crawl:
    • Discovers pages from sitemap/navigation
    • Extracts content from each page
    • Creates text chunks (300-400 tokens)
    • Generates OpenAI embeddings
    • Stores everything in PostgreSQL

  Add Page:
    • Adds specific page to website
    • Extracts content from that page
    • Creates chunks and embeddings
    • Stores in database

  Stream:
    • Same as full crawl but with real-time progress
    • Shows progress for each pipeline stage
    • Uses Server-Sent Events

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 This script tests the complete end-to-end pipeline API endpoints.
   Make sure the admin application is running on localhost:3000.
`);
}

async function testFullCrawl(args: CliArgs) {
  if (!args.url) {
    console.error('❌ URL is required for full-crawl endpoint');
    console.log('💡 Example: npx tsx test-api-endpoints.ts -e full-crawl -u https://example.com');
    return;
  }

  console.log('🚀 Testing Full Crawl Endpoint');
  console.log('============================================');
  console.log(`🌐 URL: ${args.url}`);
  console.log(`📄 Max Pages: ${args.maxPages || 5}`);
  console.log(`📊 Max Depth: ${args.maxDepth || 1}`);
  console.log();

  try {
    const startTime = Date.now();
    
    const response = await fetch('http://localhost:3000/api/crawling/full-crawl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        websiteUrl: args.url,
        maxPages: args.maxPages || 5,
        maxDepth: args.maxDepth || 1,
        description: `Test crawl from API test script`,
        sessionMetadata: {
          testScript: true,
          testTimestamp: new Date().toISOString()
        }
      }),
    });

    const result = await response.json();
    const duration = Date.now() - startTime;

    if (result.success) {
      console.log('✅ Full Crawl Completed Successfully!');
      console.log('============================================');
      console.log(`⏱️  Duration: ${duration}ms`);
      console.log(`🌐 Website: ${result.website.domain}`);
      console.log(`📊 Pages Discovered: ${result.summary.pagesDiscovered}`);
      console.log(`📄 Pages Processed: ${result.summary.pagesProcessed}`);
      console.log(`🧮 Chunks Created: ${result.summary.chunksCreated}`);
      console.log(`🔢 Embeddings Generated: ${result.summary.embeddingsGenerated}`);
      console.log(`💰 Total Cost: $${result.summary.totalCost.toFixed(4)}`);
      console.log(`📈 Average Quality: ${result.summary.averageQuality.toFixed(1)}/100`);
      console.log();
      
      if (result.pages.length > 0) {
        console.log('📋 Processed Pages:');
        result.pages.slice(0, 3).forEach((page: any, index: number) => {
          console.log(`  ${index + 1}. ${page.title}`);
          console.log(`     URL: ${page.url}`);
          console.log(`     Status: ${page.status === 'completed' ? '✅' : '❌'} ${page.status}`);
          console.log(`     Chunks: ${page.chunksCreated}, Embeddings: ${page.embeddingsGenerated}`);
          console.log(`     Quality: ${page.quality}/100, Tokens: ${page.tokenCount}`);
          console.log();
        });
        
        if (result.pages.length > 3) {
          console.log(`     ... and ${result.pages.length - 3} more pages`);
        }
      }
      
      console.log(`💬 ${result.message}`);
      
    } else {
      console.error('❌ Full Crawl Failed');
      console.error('============================================');
      console.error(`⏱️  Duration: ${duration}ms`);
      console.error(`🚨 Error: ${result.error}`);
      console.error(`💬 Message: ${result.message}`);
    }

  } catch (error: any) {
    console.error('❌ API Request Failed');
    console.error('============================================');
    console.error(`🚨 Error: ${error.message}`);
    console.error('💡 Make sure the admin application is running on localhost:3000');
  }
}

async function testAddPage(args: CliArgs) {
  if (!args.website || !args.page) {
    console.error('❌ Both website and page URLs are required for add-page endpoint');
    console.log('💡 Example: npx tsx test-api-endpoints.ts -e add-page -w https://example.com -p https://example.com/docs');
    return;
  }

  console.log('📄 Testing Add Page Endpoint');
  console.log('============================================');
  console.log(`🌐 Website: ${args.website}`);
  console.log(`📄 Page: ${args.page}`);
  console.log(`🎯 Priority: ${args.priority || 80}`);
  console.log();

  try {
    const startTime = Date.now();
    
    const response = await fetch('http://localhost:3000/api/crawling/add-page', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        websiteUrl: args.website,
        pageUrl: args.page,
        title: 'Test Page from API Script',
        description: 'Page added via API test script',
        priority: args.priority || 80
      }),
    });

    const result = await response.json();
    const duration = Date.now() - startTime;

    if (result.success) {
      console.log('✅ Page Addition Completed Successfully!');
      console.log('============================================');
      console.log(`⏱️  Duration: ${duration}ms`);
      console.log(`🌐 Website: ${result.website.domain}`);
      console.log(`📄 Page Added: ${result.pages[0]?.title}`);
      console.log(`🧮 Chunks Created: ${result.summary.chunksCreated}`);
      console.log(`🔢 Embeddings Generated: ${result.summary.embeddingsGenerated}`);
      console.log(`💰 Total Cost: $${result.summary.totalCost.toFixed(4)}`);
      console.log(`📈 Quality: ${result.summary.averageQuality.toFixed(1)}/100`);
      console.log();
      
      const page = result.pages[0];
      if (page) {
        console.log('📋 Page Details:');
        console.log(`   Title: ${page.title}`);
        console.log(`   URL: ${page.url}`);
        console.log(`   Status: ${page.status === 'completed' ? '✅' : '❌'} ${page.status}`);
        console.log(`   Chunks: ${page.chunksCreated}`);
        console.log(`   Embeddings: ${page.embeddingsGenerated}`);
        console.log(`   Quality: ${page.quality}/100`);
        console.log(`   Tokens: ${page.tokenCount}`);
        console.log();
      }
      
      console.log(`💬 ${result.message}`);
      
    } else {
      console.error('❌ Page Addition Failed');
      console.error('============================================');
      console.error(`⏱️  Duration: ${duration}ms`);
      console.error(`🚨 Error: ${result.error}`);
      console.error(`💬 Message: ${result.message}`);
    }

  } catch (error: any) {
    console.error('❌ API Request Failed');
    console.error('============================================');
    console.error(`🚨 Error: ${error.message}`);
    console.error('💡 Make sure the admin application is running on localhost:3000');
  }
}

async function testStreamingCrawl(args: CliArgs) {
  if (!args.url) {
    console.error('❌ URL is required for streaming endpoint');
    console.log('💡 Example: npx tsx test-api-endpoints.ts -e stream -u https://example.com');
    return;
  }

  console.log('🌊 Testing Streaming Crawl Endpoint');
  console.log('============================================');
  console.log(`🌐 URL: ${args.url}`);
  console.log(`📄 Max Pages: ${args.maxPages || 3}`);
  console.log(`📊 Max Depth: ${args.maxDepth || 1}`);
  console.log('🔄 Listening for real-time updates...');
  console.log();

  try {
    const response = await fetch('http://localhost:3000/api/crawling/full-crawl-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        websiteUrl: args.url,
        maxPages: args.maxPages || 3,
        maxDepth: args.maxDepth || 1,
        description: `Test streaming crawl from API test script`,
        sessionMetadata: {
          testScript: true,
          streaming: true,
          testTimestamp: new Date().toISOString()
        }
      }),
    });

    if (!response.body) {
      throw new Error('No response body received');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            switch (data.type) {
              case 'connected':
                console.log('🔗 Connected to streaming pipeline');
                break;
                
              case 'progress':
                const progressBar = '█'.repeat(Math.floor(data.progress / 5)) + '░'.repeat(20 - Math.floor(data.progress / 5));
                console.log(`📊 [${progressBar}] ${data.progress.toFixed(1)}% - ${data.stage}: ${data.message}`);
                
                if (data.details.pagesDiscovered) {
                  console.log(`   📄 Pages: ${data.details.pagesProcessed || 0}/${data.details.pagesDiscovered} processed`);
                }
                if (data.details.chunksCreated) {
                  console.log(`   🧮 Chunks: ${data.details.chunksCreated}, Embeddings: ${data.details.embeddingsGenerated || 0}`);
                }
                if (data.details.totalCost) {
                  console.log(`   💰 Cost: $${data.details.totalCost.toFixed(4)}`);
                }
                console.log();
                break;
                
              case 'result':
                console.log('✅ Streaming Crawl Completed Successfully!');
                console.log('============================================');
                console.log(`🌐 Website: ${data.website.domain}`);
                console.log(`📊 Pages Discovered: ${data.summary.pagesDiscovered}`);
                console.log(`📄 Pages Processed: ${data.summary.pagesProcessed}`);
                console.log(`🧮 Chunks Created: ${data.summary.chunksCreated}`);
                console.log(`🔢 Embeddings Generated: ${data.summary.embeddingsGenerated}`);
                console.log(`⏱️  Duration: ${data.summary.processingTimeMs}ms`);
                console.log(`💰 Total Cost: $${data.summary.totalCost.toFixed(4)}`);
                console.log(`📈 Average Quality: ${data.summary.averageQuality.toFixed(1)}/100`);
                console.log();
                console.log(`💬 ${data.message}`);
                break;
                
              case 'error':
                console.error('❌ Streaming Crawl Failed');
                console.error('============================================');
                console.error(`🚨 Error: ${data.error}`);
                console.error(`💬 Message: ${data.message}`);
                console.error(`🕐 Time: ${data.timestamp}`);
                break;
            }
          } catch (parseError) {
            console.error('❌ Failed to parse SSE data:', line);
          }
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Streaming Request Failed');
    console.error('============================================');
    console.error(`🚨 Error: ${error.message}`);
    console.error('💡 Make sure the admin application is running on localhost:3000');
  }
}

async function showEndpointInfo() {
  console.log('📚 API Endpoints Information');
  console.log('============================================');
  
  const endpoints = [
    'full-crawl',
    'add-page',
    'full-crawl-stream'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:3000/api/crawling/${endpoint}`, {
        method: 'GET'
      });
      
      const info = await response.json();
      
      console.log(`\n🔗 ${info.endpoint}`);
      console.log(`📝 ${info.description}`);
      console.log(`📊 Method: ${info.method}`);
      
      if (info.examples?.basic) {
        console.log(`💡 Example:`, JSON.stringify(info.examples.basic, null, 2));
      }
      
    } catch (error) {
      console.error(`❌ Failed to get info for ${endpoint}:`, error);
    }
  }
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (!args.endpoint) {
    console.log('⚠️ No endpoint specified');
    console.log();
    console.log('💡 Available endpoints:');
    console.log('   --endpoint full-crawl    Complete website crawling');
    console.log('   --endpoint add-page      Manual page addition');
    console.log('   --endpoint stream        Streaming crawling with progress');
    console.log('   --endpoint info          Show endpoint documentation');
    console.log();
    console.log('   Use --help for detailed usage information');
    process.exit(1);
  }

  switch (args.endpoint) {
    case 'full-crawl':
      await testFullCrawl(args);
      break;
    case 'add-page':
      await testAddPage(args);
      break;
    case 'stream':
      await testStreamingCrawl(args);
      break;
    case 'info':
      await showEndpointInfo();
      break;
    default:
      console.error(`❌ Unknown endpoint: ${args.endpoint}`);
      console.log('💡 Available: full-crawl, add-page, stream, info');
      process.exit(1);
  }
}

main().catch(console.error);
