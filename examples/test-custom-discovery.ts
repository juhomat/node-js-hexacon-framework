#!/usr/bin/env ts-node

/**
 * Custom Website Discovery Test Script
 * 
 * Tests the discovery component with command line parameters.
 * This is a separate script to avoid npm argument parsing issues.
 * 
 * Usage:
 * npx tsx test-custom-discovery.ts --website https://example.com --pages 10 --depth 1
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
  pages?: number;
  depth?: number;
  help?: boolean;
  title?: string;
  description?: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: CliArgs = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--help':
      case '-h':
        parsed.help = true;
        break;
      case '--website':
      case '-w':
        parsed.website = nextArg;
        i++; // Skip next arg
        break;
      case '--pages':
      case '-p':
        parsed.pages = parseInt(nextArg);
        i++; // Skip next arg
        break;
      case '--depth':
      case '-d':
        parsed.depth = parseInt(nextArg);
        i++; // Skip next arg
        break;
      case '--title':
      case '-t':
        parsed.title = nextArg;
        i++; // Skip next arg
        break;
      case '--description':
        parsed.description = nextArg;
        i++; // Skip next arg
        break;
    }
  }
  
  return parsed;
}

async function runCustomDiscovery() {
  const cliArgs = parseArgs();

  if (cliArgs.help) {
    console.log(`
🧪 Custom Website Discovery Test

Tests website discovery with your own parameters.

Usage:
  npx tsx test-custom-discovery.ts [options]

Required:
  --website, -w <url>        Website URL to crawl

Optional:
  --pages, -p <number>       Maximum pages to discover (default: 10)
  --depth, -d <number>       Maximum crawling depth (default: 1)
  --title, -t <title>        Custom website title
  --description <desc>       Custom description
  --help, -h                 Show this help

Examples:
  npx tsx test-custom-discovery.ts --website https://docs.openai.com --pages 15 --depth 2
  npx tsx test-custom-discovery.ts -w https://fastapi.tiangolo.com -p 8 -d 1

Environment:
  DATABASE_URL  PostgreSQL connection string (required)
`);
    process.exit(0);
  }

  if (!cliArgs.website) {
    console.error('❌ Error: --website parameter is required');
    console.log('💡 Usage: npx tsx test-custom-discovery.ts --website https://example.com');
    console.log('📚 Run with --help for full options');
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🧪 Custom Website Discovery Test');
  console.log('=' .repeat(50));
  console.log(`🔗 Website: ${cliArgs.website}`);
  console.log(`📊 Pages: ${cliArgs.pages || 10}`);
  console.log(`📊 Depth: ${cliArgs.depth || 1}`);
  console.log();

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Initialize services with real PostgreSQL repositories
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
    console.log('🚀 Starting discovery...');

    const startTime = Date.now();

    // Run discovery
    const discoveryGenerator = discoveryApp.discoverWebsite({
      websiteUrl: cliArgs.website,
      maxPages: cliArgs.pages || 10,
      maxDepth: cliArgs.depth || 1,
      websiteTitle: cliArgs.title,
      websiteDescription: cliArgs.description
    });

    let result;
    for await (const progress of discoveryGenerator) {
      const progressMessage = `[${progress.percentage?.toFixed(0).padStart(3)}%] ${progress.message}`;
      console.log(progressMessage);

      if (progress.type === 'complete') {
        result = progress;
        break;
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Show results
    console.log();
    console.log('✅ Discovery Complete!');
    console.log('=' .repeat(50));
    console.log(`⏱️  Total Duration: ${duration}ms`);
    console.log(`🌐 Website: ${result?.website?.domain}`);
    console.log(`📄 Pages Discovered: ${result?.discoveredPages || 0}`);
    console.log(`📊 Processing Time: ${result?.processingTimeMs || 0}ms`);

    // Get detailed results
    if (result?.crawlSession) {
      const storedPages = await pageRepository.findByCrawlSessionId(result.crawlSession.id);
      console.log(`💾 Pages Stored: ${storedPages.length}`);

      // Show priority distribution
      const priorities = storedPages.map((p: any) => p.priority);
      const highPriority = priorities.filter((p: number) => p >= 70).length;
      const mediumPriority = priorities.filter((p: number) => p >= 40 && p < 70).length;
      const lowPriority = priorities.filter((p: number) => p < 40).length;

      console.log();
      console.log('🎯 Priority Distribution:');
      console.log(`   High (70+): ${highPriority} pages`);
      console.log(`   Medium (40-69): ${mediumPriority} pages`);
      console.log(`   Low (<40): ${lowPriority} pages`);

      // Show sample URLs
      const samplePages = storedPages.slice(0, 5);
      console.log();
      console.log('🔗 Sample Discovered URLs:');
      samplePages.forEach((page: any, i: number) => {
        console.log(`   ${i + 1}. [${page.priority}] ${page.url}`);
      });

      if (storedPages.length > 5) {
        console.log(`   ... and ${storedPages.length - 5} more pages`);
      }
    }

    console.log();
    console.log('🎉 Discovery test completed successfully!');
    console.log('💡 The discovered pages are now stored in the database');
    console.log('🔄 Ready for Step 2: Content Extraction');

  } catch (error) {
    console.error('❌ Discovery test failed:', error);
    console.log();
    console.log('🔧 Troubleshooting:');
    console.log('   • Check if the website URL is accessible');
    console.log('   • Verify DATABASE_URL is correct');
    console.log('   • Ensure crawling schema is installed');
    console.log('   • Try with a smaller page count first');
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runCustomDiscovery().catch(console.error);
}

export { runCustomDiscovery };
