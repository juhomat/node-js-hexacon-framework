/**
 * Content Extraction Test Script
 * 
 * Tests the content extraction functionality by:
 * 1. Fetching pages that are already in the database (from discovery)
 * 2. Extracting their content and displaying results
 * 3. Optionally updating the database with extracted content
 * 
 * Usage:
 * npx tsx test-content-extraction.ts --url https://example.com/page
 * npx tsx test-content-extraction.ts --page-id <uuid>
 * npm run test-content-extraction -- --session <session-id> --limit 5
 */

import { config } from 'dotenv';
import { Pool } from 'pg';
import { resolve } from 'path';

// Load .env from project root
config({ path: resolve(__dirname, '../.env') });

import { 
  PostgreSQLPageRepository
} from '../packages/ai-framework/src/infrastructure/database';
import { 
  HtmlFetcherService,
  ContentExtractionService 
} from '../packages/ai-framework/src/domain/services';
import { 
  ExtractPageContent,
  ExtractContentRequest
} from '../packages/ai-framework/src/domain/use-cases/crawling/ExtractPageContent';

interface CliArgs {
  url?: string;
  pageId?: string;
  sessionId?: string;
  limit?: number;
  updateDb?: boolean;
  help?: boolean;
  verbose?: boolean;
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
      case '--page-id': case '-p': 
        parsed.pageId = nextArg; 
        i++; 
        break;
      case '--session': case '-s': 
        parsed.sessionId = nextArg; 
        i++; 
        break;
      case '--limit': case '-l': 
        parsed.limit = parseInt(nextArg); 
        i++; 
        break;
      case '--update-db': 
        parsed.updateDb = true; 
        break;
      case '--verbose': case '-v': 
        parsed.verbose = true; 
        break;
    }
  }
  
  return parsed;
}

function showHelp() {
  console.log(`
🔍 AI Framework - Content Extraction Test Script

Test content extraction functionality on discovered pages or arbitrary URLs.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 USAGE

  npx tsx test-content-extraction.ts [options]
  npm run test-content-extraction -- [options]

📊 OPTIONS

  --url, -u <url>           Extract content from specific URL (standalone)
                            Example: https://docs.openai.com/api-reference/chat
                            
  --page-id, -p <id>        Extract content for specific page ID from database
                            Uses stored page information and updates database
                            
  --session, -s <session>   Extract content for all discovered pages in session
                            Processes multiple pages from a crawl session
                            
  --limit, -l <number>      Limit number of pages to process (default: 5)
                            Only applicable with --session option
                            
  --update-db               Update database with extracted content
                            Stores extracted content and metadata in pages table
                            
  --verbose, -v             Show detailed extraction information
                            Displays quality scores, metadata, and analysis
                            
  --help, -h                Show this help message

🚀 EXAMPLES

  # Test extraction on a specific URL (no database)
  npx tsx test-content-extraction.ts --url https://docs.openai.com/api-reference/chat

  # Extract content for a specific page in database
  npx tsx test-content-extraction.ts --page-id abc123-def456-789 --update-db

  # Process all pages from a crawl session
  npm run test-content-extraction -- --session def456-abc123-789 --limit 10 --update-db

  # Verbose extraction with detailed analysis
  npx tsx test-content-extraction.ts -u https://nextjs.org/docs --verbose

  # Extract and update database for session pages
  npm run test-content-extraction -- -s session-id -l 5 --update-db --verbose

💡 USE CASES

  ✅ Test extraction quality on specific pages
  ✅ Verify content extraction accuracy
  ✅ Process discovered pages from crawl sessions
  ✅ Populate database with extracted content
  ✅ Analyze extraction quality scores
  ✅ Debug content extraction issues

🔧 SETUP REQUIREMENTS

  Environment Variables:
    DATABASE_URL    PostgreSQL connection string (required for database operations)
  
  Database Schema:
    Pages must be in database (use discovery scripts first)
    Run: npm run setup-crawling-schema
  
  Dependencies:
    Node.js 18+, PostgreSQL with pgvector extension

⚡ WHAT THIS SCRIPT DOES

  🌐 HTML Fetching:
    • Fetches raw HTML content from URLs
    • Handles redirects and various content types
    • Measures response times and quality

  🔍 Content Extraction:
    • Removes navigation, headers, footers
    • Extracts main content using multiple strategies
    • Provides quality scoring and metadata

  💾 Database Updates (optional):
    • Updates pages table with extracted content
    • Stores raw HTML and clean text
    • Updates page status to 'completed'
    • Adds extraction metadata and metrics

📊 EXPECTED OUTPUT

  🎯 Extraction Analysis:
    • Content quality score (0-100)
    • Word count and character count
    • Extraction method used (semantic, pattern-based, aggressive)
    • Processing time metrics

  📈 Content Metrics:
    • Title extraction
    • Main content identification
    • Link and image counts
    • Heading structure analysis

  💾 Database Operations (if --update-db):
    • Page content updates
    • Status changes to 'completed'
    • Metadata storage with extraction details

🎯 QUALITY SCORING

  High Quality (80-100):    Semantic extraction, good content length
  Medium Quality (50-79):   Pattern-based extraction, decent content
  Low Quality (0-49):       Aggressive extraction, short/poor content

⏱️ PERFORMANCE EXPECTATIONS

  Single URL:              ~2-5 seconds
  Database page:           ~1-3 seconds (cached)
  Session batch (5 pages): ~10-20 seconds
  Session batch (10 pages): ~20-40 seconds

🔄 INTEGRATION WITH DISCOVERY

  This script works with pages discovered by:
  • npm run test-discovery (built-in scenarios)
  • npm run test-custom (custom website discovery)
  • npm run test-manual-page (manually added pages)

🆘 TROUBLESHOOTING

  "No pages found":
    • Run discovery scripts first to populate database
    • Check session ID is correct

  "Failed to fetch URL":
    • Verify URL is accessible from your network
    • Some sites block automated requests

  "Low quality extraction":
    • Some sites have complex layouts
    • Try different URLs from the same site
    • Check extraction strategy used

  Database connection issues:
    • Verify DATABASE_URL is correct
    • Ensure PostgreSQL is running

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 Part of AI Framework Step 2: Content Extraction
    Previous: Step 1 - Website Discovery | Next: Step 3 - Chunking & Embedding
`);
}

async function testContentExtraction() {
  const cliArgs = parseArgs();

  if (cliArgs.help) {
    showHelp();
    process.exit(0);
  }

  // Initialize services
  const htmlFetcherService = new HtmlFetcherService();
  const contentExtractionService = new ContentExtractionService();

  console.log('🔍 Content Extraction Test');
  console.log('============================================');

  // Handle standalone URL extraction
  if (cliArgs.url) {
    console.log(`🌐 URL: ${cliArgs.url}`);
    console.log(`💾 Update Database: No (standalone mode)`);
    console.log();

    const extractUseCase = new ExtractPageContent(
      null as any, // No repository needed for URL-only extraction
      htmlFetcherService,
      contentExtractionService
    );

    const startTime = Date.now();

    try {
      const result = await extractUseCase.execute({
        url: cliArgs.url,
        updateDatabase: false,
        extractionOptions: {
          extractMetadata: true,
          includeLinks: cliArgs.verbose,
          includeImages: cliArgs.verbose
        }
      });

      await displayExtractionResult(result, cliArgs.verbose);

    } catch (error: any) {
      console.error('❌ Content extraction failed:', error.message);
    }

    return;
  }

  // For database operations, need database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    const pageRepository = new PostgreSQLPageRepository(pool);
    const extractUseCase = new ExtractPageContent(
      pageRepository,
      htmlFetcherService,
      contentExtractionService
    );

    console.log('✅ Services initialized');
    console.log();

    // Handle specific page ID
    if (cliArgs.pageId) {
      console.log(`🆔 Page ID: ${cliArgs.pageId}`);
      console.log(`💾 Update Database: ${cliArgs.updateDb ? 'Yes' : 'No'}`);
      console.log();

      const result = await extractUseCase.execute({
        pageId: cliArgs.pageId,
        updateDatabase: cliArgs.updateDb,
        extractionOptions: {
          extractMetadata: true,
          includeLinks: cliArgs.verbose,
          includeImages: cliArgs.verbose
        }
      });

      await displayExtractionResult(result, cliArgs.verbose);
      return;
    }

    // Handle session batch extraction
    if (cliArgs.sessionId) {
      console.log(`📊 Session ID: ${cliArgs.sessionId}`);
      console.log(`📄 Limit: ${cliArgs.limit || 5} pages`);
      console.log(`💾 Update Database: ${cliArgs.updateDb ? 'Yes' : 'No'}`);
      console.log();

      // Get pages from session
      const pages = await pageRepository.findByCrawlSessionId(cliArgs.sessionId, {
        limit: cliArgs.limit || 5,
        orderBy: 'priority',
        orderDirection: 'desc'
      });

      if (pages.length === 0) {
        console.log('⚠️ No pages found in the specified session');
        console.log('💡 Try running discovery scripts first:');
        console.log('   npm run test-discovery');
        console.log('   npm run test-custom -- --website https://example.com');
        return;
      }

      console.log(`🚀 Processing ${pages.length} pages...`);
      console.log();

      const results = await extractUseCase.extractBatch(pages, {
        concurrency: 2,
        updateDatabase: cliArgs.updateDb,
        extractionOptions: {
          extractMetadata: true,
          includeLinks: cliArgs.verbose,
          includeImages: cliArgs.verbose
        }
      });

      // Display summary
      console.log();
      console.log('📊 Batch Extraction Summary');
      console.log('============================================');
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      console.log(`✅ Successful: ${successful.length}/${results.length}`);
      console.log(`❌ Failed: ${failed.length}/${results.length}`);
      
      if (successful.length > 0) {
        const avgQuality = successful.reduce((sum, r) => sum + r.extractionResult.quality.score, 0) / successful.length;
        const totalWords = successful.reduce((sum, r) => sum + r.extractionResult.wordCount, 0);
        const avgTime = successful.reduce((sum, r) => sum + r.processingTimeMs, 0) / successful.length;
        
        console.log(`📈 Average Quality Score: ${avgQuality.toFixed(1)}/100`);
        console.log(`📝 Total Words Extracted: ${totalWords.toLocaleString()}`);
        console.log(`⏱️ Average Processing Time: ${avgTime.toFixed(0)}ms`);
      }

      if (cliArgs.verbose) {
        console.log();
        console.log('📋 Individual Results:');
        console.log('============================================');
        
        results.forEach((result, index) => {
          console.log(`\n${index + 1}. ${result.success ? '✅' : '❌'} ${result.fetchResult.url}`);
          if (result.success) {
            console.log(`   Quality: ${result.extractionResult.quality.score}/100`);
            console.log(`   Words: ${result.extractionResult.wordCount}`);
            console.log(`   Method: ${result.extractionResult.metadata.extractionMethod}`);
          } else {
            console.log(`   Error: ${result.error}`);
          }
        });
      }

      return;
    }

    // No specific options provided, show examples
    console.log('⚠️ No extraction target specified');
    console.log();
    console.log('💡 Examples:');
    console.log('   # Extract from URL');
    console.log('   npx tsx test-content-extraction.ts --url https://docs.openai.com');
    console.log();
    console.log('   # Extract from discovered pages');
    console.log('   npx tsx test-content-extraction.ts --session <session-id> --limit 5');
    console.log();
    console.log('   # Show help');
    console.log('   npx tsx test-content-extraction.ts --help');

  } catch (error: any) {
    console.error('❌ An error occurred:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

async function displayExtractionResult(result: any, verbose: boolean = false) {
  const duration = result.processingTimeMs;

  if (result.success) {
    console.log('✅ Content Extraction Completed!');
    console.log('============================================');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`🌐 URL: ${result.fetchResult.finalUrl}`);
    console.log(`📄 Title: ${result.extractionResult.title || 'No title'}`);
    console.log(`📊 Status Code: ${result.fetchResult.statusCode}`);
    console.log(`📈 Quality Score: ${result.extractionResult.quality.score}/100`);
    console.log(`📝 Word Count: ${result.extractionResult.wordCount.toLocaleString()}`);
    console.log(`🔤 Character Count: ${result.extractionResult.characterCount.toLocaleString()}`);
    console.log(`🎯 Extraction Method: ${result.extractionResult.metadata.extractionMethod}`);
    
    if (result.page) {
      console.log(`🆔 Page ID: ${result.page.id}`);
      console.log(`⭐ Priority: ${result.page.priority}`);
    }

    console.log();
    console.log('📋 Content Quality Analysis:');
    result.extractionResult.quality.reasons.forEach((reason: string) => {
      console.log(`   • ${reason}`);
    });

    if (verbose) {
      console.log();
      console.log('📊 Detailed Metadata:');
      console.log(`   Language: ${result.extractionResult.metadata.language || 'Unknown'}`);
      console.log(`   Author: ${result.extractionResult.metadata.author || 'Unknown'}`);
      console.log(`   Images: ${result.extractionResult.metadata.images.length}`);
      console.log(`   Links: ${result.extractionResult.metadata.links.length}`);
      console.log(`   Headings: ${result.extractionResult.metadata.headings.length}`);
      console.log(`   Content Ratio: ${(result.extractionResult.quality.contentRatio * 100).toFixed(1)}%`);
      console.log(`   Estimated Tokens: ${result.extractionResult.estimatedTokens.toLocaleString()}`);

      if (result.extractionResult.metadata.headings.length > 0) {
        console.log();
        console.log('📑 Content Structure:');
        result.extractionResult.metadata.headings.slice(0, 5).forEach((heading: any) => {
          const indent = '  '.repeat(heading.level - 1);
          console.log(`   ${indent}H${heading.level}: ${heading.text.substring(0, 60)}${heading.text.length > 60 ? '...' : ''}`);
        });
        if (result.extractionResult.metadata.headings.length > 5) {
          console.log(`   ... and ${result.extractionResult.metadata.headings.length - 5} more headings`);
        }
      }

      console.log();
      console.log('📄 Content Preview:');
      const preview = result.extractionResult.cleanText.substring(0, 300);
      console.log(`   ${preview}${result.extractionResult.cleanText.length > 300 ? '...' : ''}`);
    }

    console.log();
    console.log(`💬 ${result.message}`);

  } else {
    console.error('❌ Content extraction failed');
    console.error('============================================');
    console.error(`⏱️  Duration: ${duration}ms`);
    console.error(`🌐 URL: ${result.fetchResult.url}`);
    console.error(`💬 Message: ${result.message}`);
    if (result.error) {
      console.error(`🚨 Error: ${result.error}`);
    }
  }
}

// Main execution
const startTime = Date.now();
testContentExtraction().catch(console.error);
