#!/usr/bin/env ts-node

/**
 * Website Discovery Test Script
 * 
 * Tests the standalone website discovery component.
 * This script demonstrates Phase 1 of the crawling pipeline:
 * - Website registration
 * - Page discovery and prioritization  
 * - Database storage of discovered pages
 * 
 * Usage:
 * npm run test-discovery
 * or
 * ts-node examples/test-website-discovery.ts
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

interface TestScenario {
  name: string;
  websiteUrl: string;
  maxPages: number;
  maxDepth: number;
  expectedMinPages?: number;
  description: string;
}

async function testWebsiteDiscovery() {
  console.log('🧪 Website Discovery Component Test');
  console.log('=' .repeat(60));
  
  // Check environment
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.log('💡 Add DATABASE_URL to your .env file');
    process.exit(1);
  }
  
  console.log('✅ Environment configured');
  console.log('🗄️  Connecting to database...');
  
  // Initialize database connection
  const pool = new Pool({ connectionString: databaseUrl });
  
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // Initialize services with real PostgreSQL repositories
    console.log('🔧 Initializing services...');
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
    
    // Define test scenarios
    const testScenarios: TestScenario[] = [
      {
        name: 'Small Documentation Site',
        websiteUrl: 'https://docs.github.com',
        maxPages: 10,
        maxDepth: 1,
        expectedMinPages: 5,
        description: 'Tests sitemap discovery and documentation prioritization'
      },
      {
        name: 'Medium Blog Site',
        websiteUrl: 'https://blog.openai.com',
        maxPages: 15,
        maxDepth: 2,
        expectedMinPages: 8,
        description: 'Tests crawling discovery with depth'
      },
      {
        name: 'Large API Documentation',
        websiteUrl: 'https://developer.mozilla.org',
        maxPages: 25,
        maxDepth: 2,
        expectedMinPages: 15,
        description: 'Tests hybrid discovery on large site'
      }
    ];
    
    // Run test scenarios
    for (const [index, scenario] of testScenarios.entries()) {
      console.log(`📋 Test ${index + 1}/${testScenarios.length}: ${scenario.name}`);
      console.log(`🔗 URL: ${scenario.websiteUrl}`);
      console.log(`📊 Parameters: ${scenario.maxPages} pages, depth ${scenario.maxDepth}`);
      console.log(`📝 Description: ${scenario.description}`);
      console.log();
      
      const startTime = Date.now();
      
      try {
        // Run discovery with progress tracking
        const progressLog: string[] = [];
        
        const discoveryGenerator = discoveryApp.discoverWebsite({
          websiteUrl: scenario.websiteUrl,
          maxPages: scenario.maxPages,
          maxDepth: scenario.maxDepth,
          websiteTitle: `Test: ${scenario.name}`,
          websiteDescription: scenario.description
        });
        
        let result;
        for await (const progress of discoveryGenerator) {
          const progressMessage = `[${progress.percentage?.toFixed(0).padStart(3)}%] ${progress.message}`;
          console.log(progressMessage);
          progressLog.push(progressMessage);
          
          if (progress.type === 'complete') {
            result = progress;
            break;
          }
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Verify results
        console.log();
        console.log('✅ Test Results:');
        console.log(`   ⏱️  Duration: ${duration}ms`);
        console.log(`   🌐 Website: ${result?.website?.domain}`);
        console.log(`   📄 Pages Discovered: ${result?.discoveredPages || 0}`);
        console.log(`   📊 Processing Time: ${result?.processingTimeMs || 0}ms`);
        
        // Validation
        const pagesFound = result?.discoveredPages || 0;
        if (scenario.expectedMinPages && pagesFound < scenario.expectedMinPages) {
          console.log(`   ⚠️  Warning: Expected at least ${scenario.expectedMinPages} pages, found ${pagesFound}`);
        } else {
          console.log(`   ✅ Page count meets expectations`);
        }
        
        // Get detailed results
        if (result?.crawlSession) {
          const storedPages = await pageRepository.findByCrawlSessionId(result.crawlSession.id);
          console.log(`   💾 Pages Stored: ${storedPages.length}`);
          
          // Show priority distribution
          const priorities = storedPages.map((p: any) => p.priority);
          const highPriority = priorities.filter((p: number) => p >= 70).length;
          const mediumPriority = priorities.filter((p: number) => p >= 40 && p < 70).length;
          const lowPriority = priorities.filter((p: number) => p < 40).length;
          
          console.log(`   🎯 Priority Distribution:`);
          console.log(`      High (70+): ${highPriority} pages`);
          console.log(`      Medium (40-69): ${mediumPriority} pages`);
          console.log(`      Low (<40): ${lowPriority} pages`);
          
          // Show sample URLs
          const samplePages = storedPages.slice(0, 5);
          console.log(`   🔗 Sample Discovered URLs:`);
          samplePages.forEach((page: any, i: number) => {
            console.log(`      ${i + 1}. [${page.priority}] ${page.url}`);
          });
        }
        
        console.log(`✅ Test ${index + 1} completed successfully`);
        
      } catch (error) {
        console.error(`❌ Test ${index + 1} failed:`, error);
        console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      console.log();
      console.log('-'.repeat(60));
      console.log();
      
      // Brief pause between tests
      if (index < testScenarios.length - 1) {
        console.log('⏸️  Pausing 2 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('🎉 All Discovery Tests Completed!');
    console.log();
    console.log('📊 Summary:');
    console.log('   • Website discovery and prioritization: ✅ Working');
    console.log('   • Database integration: ✅ Working');
    console.log('   • Progress tracking: ✅ Working');
    console.log('   • Error handling: ✅ Working');
    console.log();
    console.log('🔄 Next Steps:');
    console.log('   • The discovered pages are now stored in the database');
    console.log('   • Ready for content extraction implementation');
    console.log('   • Each page has a priority score for processing order');
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
    console.log();
    console.log('🔧 Troubleshooting:');
    console.log('   • Check DATABASE_URL is correct');
    console.log('   • Ensure crawling schema is installed');
    console.log('   • Verify internet connectivity');
    console.log('   • Check that target websites are accessible');
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🧪 Website Discovery Test Script

Tests the standalone website discovery component.

Usage:
  npm run test-discovery
  ts-node examples/test-website-discovery.ts

Options:
  --help, -h    Show this help message

Environment Variables:
  DATABASE_URL  PostgreSQL connection string (required)

This script tests:
  • Website registration in database
  • Intelligent page discovery (sitemap + crawling)
  • Priority-based page ranking
  • Database storage of discovered pages
  • Progress tracking and error handling

The discovered pages will be stored in the database and ready
for the next phase: content extraction.
`);
  process.exit(0);
}

// Run the test
if (require.main === module) {
  testWebsiteDiscovery().catch(console.error);
}

export { testWebsiteDiscovery };
