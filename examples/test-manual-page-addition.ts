/**
 * Manual Page Addition Test Script
 * 
 * Demonstrates how to manually add specific pages to websites for content extraction.
 * This is useful when you want to include specific high-value pages that might not
 * be discoverable through normal crawling.
 * 
 * Usage:
 * npx tsx test-manual-page-addition.ts --website https://example.com --page https://example.com/important-page
 * npm run test-manual-page -- --website https://docs.openai.com --page https://docs.openai.com/api-reference
 */

import { config } from 'dotenv';
import { Pool } from 'pg';
import { resolve } from 'path';

// Load .env from project root
config({ path: resolve(__dirname, '../.env') });

import { WebsiteDiscoveryApplication } from '../packages/ai-framework/src/application/WebsiteDiscoveryApplication';
import { 
  PostgreSQLWebsiteRepository,
  PostgreSQLPageRepository,
  PostgreSQLCrawlSessionRepository
} from '../packages/ai-framework/src/infrastructure/database';
import { PageDiscoveryService } from '../packages/ai-framework/src/domain/services/PageDiscoveryService';

interface CliArgs {
  website?: string;
  page?: string;
  title?: string;
  description?: string;
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
      case '--website': case '-w': 
        parsed.website = nextArg; 
        i++; 
        break;
      case '--page': case '-p': 
        parsed.page = nextArg; 
        i++; 
        break;
      case '--title': case '-t': 
        parsed.title = nextArg; 
        i++; 
        break;
      case '--description': case '-d': 
        parsed.description = nextArg; 
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
🔧 AI Framework - Manual Page Addition Test Script

Add specific pages manually to websites for content extraction and RAG.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 USAGE

  npx tsx test-manual-page-addition.ts [options]
  npm run test-manual-page -- [options]

📊 OPTIONS

  --website, -w <url>        Website base URL (required)
                             Example: https://docs.openai.com
                             
  --page, -p <url>          Specific page URL to add (required)
                             Example: https://docs.openai.com/api-reference/chat
                             
  --title, -t <title>       Custom page title (optional)
                             Used for better organization
                             
  --description, -d <desc>  Custom page description (optional)
                             Used for metadata
                             
  --priority <number>       Custom priority score 1-100 (optional)
                             Default: 80 (high priority for manual pages)
                             
  --help, -h                Show this help message

🚀 EXAMPLES

  # Add OpenAI API reference page
  npx tsx test-manual-page-addition.ts \\
    --website https://docs.openai.com \\
    --page https://docs.openai.com/api-reference/chat \\
    --title "OpenAI Chat API Reference"
    
  # Add specific blog post with custom priority
  npm run test-manual-page -- \\
    -w https://example.com \\
    -p https://example.com/blog/important-announcement \\
    --priority 95
    
  # Add documentation page with description
  npx tsx test-manual-page-addition.ts \\
    --website https://nextjs.org \\
    --page https://nextjs.org/docs/advanced-features/custom-app \\
    --title "Next.js Custom App" \\
    --description "Advanced Next.js app customization guide"

💡 USE CASES

  ✅ High-value pages not in sitemap
  ✅ Password-protected content (you have access to)
  ✅ Specific product documentation
  ✅ Important blog posts or announcements
  ✅ Landing pages with valuable content
  ✅ External resources that should be part of knowledge base

🔧 SETUP REQUIREMENTS

  Environment Variables:
    DATABASE_URL    PostgreSQL connection string (required)
  
  Database Schema:
    Run: npm run setup-crawling-schema
  
  Dependencies:
    Node.js 18+, PostgreSQL with pgvector extension

⚡ WHAT THIS SCRIPT DOES

  ✅ Validates URLs and domain matching
  ✅ Creates/finds website in database
  ✅ Creates/finds manual crawl session
  ✅ Adds page with high priority (80+ by default)
  ✅ Sets discoveryMethod to 'manual'
  ✅ Ready for content extraction pipeline

📊 EXPECTED OUTPUT

  🎯 Page Analysis:
    • URL validation and domain checking
    • Automatic priority calculation (80+ for manual pages)
    • Manual discovery method marking
    
  💾 Database Operations:
    • Website creation/retrieval
    • Manual crawl session creation/retrieval
    • Page insertion with metadata
    
  📈 Results Summary:
    • Page details and priority score
    • Associated website and crawl session info
    • Ready for content extraction confirmation

🔄 NEXT STEPS AFTER MANUAL ADDITION

  The manually added page will be stored with:
  • High priority score (80-100)
  • discoveryMethod: 'manual'
  • status: 'discovered'
  • Ready for Step 2: Content Extraction
  • Ready for Step 3: Chunking & Embedding

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 Part of AI Framework Manual Content Management
`);
}

async function testManualPageAddition() {
  const cliArgs = parseArgs();

  if (cliArgs.help) {
    showHelp();
    process.exit(0);
  }

  if (!cliArgs.website) {
    console.error('❌ Error: --website parameter is required.');
    console.log('Use --help for usage instructions.');
    process.exit(1);
  }

  if (!cliArgs.page) {
    console.error('❌ Error: --page parameter is required.');
    console.log('Use --help for usage instructions.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Initialize repositories and services
    const websiteRepository = new PostgreSQLWebsiteRepository(pool);
    const pageRepository = new PostgreSQLPageRepository(pool);
    const crawlSessionRepository = new PostgreSQLCrawlSessionRepository(pool);
    const pageDiscoveryService = new PageDiscoveryService();

    const discoveryApp = new WebsiteDiscoveryApplication(
      websiteRepository,
      pageRepository,
      crawlSessionRepository,
      pageDiscoveryService
    );

    console.log('✅ Services initialized');
    console.log();

    console.log('🔧 Manual Page Addition Test');
    console.log('============================================');
    console.log(`🌐 Website: ${cliArgs.website}`);
    console.log(`📄 Page: ${cliArgs.page}`);
    if (cliArgs.title) console.log(`📝 Title: ${cliArgs.title}`);
    if (cliArgs.description) console.log(`📝 Description: ${cliArgs.description}`);
    if (cliArgs.priority) console.log(`⭐ Priority: ${cliArgs.priority}`);
    console.log();

    const startTime = Date.now();

    console.log('🚀 Adding page manually...');
    
    const result = await discoveryApp.addManualPage({
      websiteUrl: cliArgs.website,
      pageUrl: cliArgs.page,
      title: cliArgs.title,
      description: cliArgs.description,
      priority: cliArgs.priority,
      metadata: {
        addedViaScript: true,
        scriptVersion: '1.0.0',
        userAgent: 'test-manual-page-addition'
      }
    });

    const duration = Date.now() - startTime;

    if (result.success) {
      console.log('✅ Manual Page Addition Completed!');
      console.log('============================================');
      console.log(`⏱️  Duration: ${duration}ms`);
      console.log(`🌐 Website: ${result.website.domain}`);
      console.log(`📄 Page URL: ${result.page.url}`);
      console.log(`⭐ Priority: ${result.page.priority}`);
      console.log(`🔍 Discovery Method: ${result.page.discoveryMethod}`);
      console.log(`📊 Status: ${result.page.status}`);
      console.log(`🆔 Page ID: ${result.page.id}`);
      console.log(`🔗 Crawl Session: ${result.crawlSession.id}`);
      console.log();
      
      if (result.page.title) {
        console.log(`📝 Title: ${result.page.title}`);
      }
      
      console.log('📋 Page Metadata:');
      console.log(`   • Website ID: ${result.page.websiteId}`);
      console.log(`   • Depth Level: ${result.page.depthLevel}`);
      console.log(`   • Added Manually: ${result.page.metadata.addedManually ? 'Yes' : 'No'}`);
      console.log(`   • Added At: ${result.page.metadata.addedAt}`);
      console.log();
      
      console.log('💡 Next Steps:');
      console.log('   ✅ Page is now stored in the database');
      console.log('   🔄 Ready for content extraction (Step 2)');
      console.log('   📝 Ready for chunking and embedding (Step 3)');
      console.log('   🤖 Ready for RAG integration (Step 4)');
      console.log();
      
      console.log(`💬 Message: ${result.message}`);
      
    } else {
      console.error('❌ Manual page addition failed');
      console.error(result.message);
    }

  } catch (error: any) {
    console.error('❌ An error occurred:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run examples if no CLI args provided
async function runExamples() {
  console.log('📚 Running built-in manual page addition examples...');
  console.log();

  const examples = [
    {
      name: 'OpenAI API Documentation',
      website: 'https://docs.openai.com',
      page: 'https://docs.openai.com/api-reference/chat',
      title: 'OpenAI Chat API Reference',
      description: 'Complete API reference for OpenAI Chat endpoints'
    },
    {
      name: 'Next.js Custom App Guide',
      website: 'https://nextjs.org',
      page: 'https://nextjs.org/docs/advanced-features/custom-app',
      title: 'Next.js Custom App',
      description: 'Advanced guide for customizing Next.js applications'
    }
  ];

  for (const [index, example] of examples.entries()) {
    console.log(`📄 Example ${index + 1}: ${example.name}`);
    console.log(`   Website: ${example.website}`);
    console.log(`   Page: ${example.page}`);
    
    // Here you would call the manual page addition
    // For demo purposes, we'll just show what would be added
    console.log(`   ✅ Would add: ${example.title}`);
    console.log();
  }
  
  console.log('💡 To add pages manually, use:');
  console.log('npx tsx test-manual-page-addition.ts --website <URL> --page <PAGE_URL>');
}

// Main execution
const startTime = Date.now();

if (process.argv.length <= 2) {
  // No arguments provided, run examples
  runExamples().catch(console.error);
} else {
  // Arguments provided, run manual page addition
  testManualPageAddition().catch(console.error);
}
