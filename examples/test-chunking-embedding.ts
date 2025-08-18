/**
 * Chunking and Embedding Test Script
 * 
 * Tests the chunking and embedding functionality by:
 * 1. Taking extracted content from pages in the database
 * 2. Chunking the content according to specified strategy
 * 3. Generating embeddings for each chunk
 * 4. Displaying analysis of results
 * 
 * Usage:
 * npx tsx test-chunking-embedding.ts --page-id <uuid>
 * npx tsx test-chunking-embedding.ts --session <session-id> --limit 2
 * npm run test-chunking-embedding -- --content "Your text here"
 */

import { config } from 'dotenv';
import { Pool } from 'pg';
import { resolve } from 'path';

// Load .env from project root
config({ path: resolve(__dirname, '../.env') });

import { 
  PostgreSQLPageRepository,
  PostgreSQLChunkRepository
} from '../packages/ai-framework/src/infrastructure/database';
import { 
  TextChunkingService,
  EmbeddingService 
} from '../packages/ai-framework/src/domain/services';
import { 
  ChunkAndEmbedContent,
  ChunkAndEmbedRequest
} from '../packages/ai-framework/src/domain/use-cases/crawling/ChunkAndEmbedContent';

interface CliArgs {
  content?: string;
  pageId?: string;
  sessionId?: string;
  limit?: number;
  help?: boolean;
  verbose?: boolean;
  noEmbeddings?: boolean;
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
      case '--content': case '-c': 
        parsed.content = nextArg; 
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
      case '--no-embeddings': 
        parsed.noEmbeddings = true; 
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
🧮 AI Framework - Chunking and Embedding Test Script

Test chunking and embedding functionality on extracted page content.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 USAGE

  npx tsx test-chunking-embedding.ts [options]
  npm run test-chunking-embedding -- [options]

📊 OPTIONS

  --content, -c <text>      Chunk and embed specific text content (standalone)
                            Example: "Your long text content here..."
                            
  --page-id, -p <id>        Process specific page from database
                            Uses extracted content from page
                            
  --session, -s <session>   Process all pages from a crawl session
                            Batch processes multiple pages
                            
  --limit, -l <number>      Limit number of pages to process (default: 3)
                            Only applicable with --session option
                            
  --no-embeddings           Skip embedding generation (chunking only)
                            Faster testing, no OpenAI API calls
                            
  --verbose, -v             Show detailed chunk analysis
                            Displays individual chunk details
                            
  --help, -h                Show this help message

🚀 EXAMPLES

  # Test chunking and embedding on specific text
  npx tsx test-chunking-embedding.ts --content "Your long article content here..."

  # Process a specific page from database
  npx tsx test-chunking-embedding.ts --page-id abc123-def456 --verbose

  # Process multiple pages from a crawl session
  npm run test-chunking-embedding -- --session session-id --limit 2

  # Test chunking only (no embeddings)
  npm run test-chunking-embedding -- -p page-id --no-embeddings

  # Verbose analysis of chunking quality
  npx tsx test-chunking-embedding.ts -c "Long text..." -v --no-embeddings

💡 CHUNKING STRATEGY

  Chunk Size:    300-400 tokens (~225-300 words)
  Overlap:       15-20% (≈ 50-80 tokens)
  Boundaries:    Paragraph and sentence boundaries (never mid-sentence)
  Quality:       Semantic coherence scoring

🔢 EMBEDDING DETAILS

  Model:         text-embedding-3-small (1536 dimensions)
  Batch Size:    Up to 100 chunks per API call
  Cost:          ~$0.00002 per 1K tokens
  Rate Limit:    100ms delay between batches

📊 EXPECTED OUTPUT

  🧮 Chunking Analysis:
    • Number of chunks created
    • Average chunk size and consistency
    • Quality scores and reasoning
    • Overlap effectiveness

  🔢 Embedding Analysis:
    • Embedding success rate
    • Token usage and cost estimate
    • Processing time metrics
    • Dimensional validation

  📋 Quality Assessment:
    • Chunk completeness and coherence
    • Boundary detection quality
    • Content preservation analysis

🔧 SETUP REQUIREMENTS

  Environment Variables:
    OPENAI_API_KEY    Required for embedding generation
    DATABASE_URL      Required for database operations
  
  Dependencies:
    OpenAI API access, PostgreSQL with content

⚡ WHAT THIS SCRIPT TESTS

  ✅ Text chunking with smart boundary detection
  ✅ Token counting and size optimization
  ✅ Overlap generation for context preservation
  ✅ OpenAI embedding generation
  ✅ Batch processing efficiency
  ✅ Quality scoring and analysis

🎯 INTEGRATION TESTING

  This script works with content from:
  • Content extraction (test-content-extraction.ts)
  • Manual page addition (test-manual-page-addition.ts)
  • Website discovery (test-custom-discovery.ts)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 Part of AI Framework Step 3: Chunking & Embedding
    Previous: Step 2 - Content Extraction | Next: Step 4 - RAG Integration
`);
}

async function testChunkingAndEmbedding() {
  const cliArgs = parseArgs();

  if (cliArgs.help) {
    showHelp();
    process.exit(0);
  }

  // Initialize services
  const textChunkingService = new TextChunkingService();
  const embeddingService = cliArgs.noEmbeddings ? null : new EmbeddingService();

  console.log('🧮 Chunking and Embedding Test');
  console.log('============================================');

  // Handle standalone content processing
  if (cliArgs.content) {
    console.log(`📝 Content Length: ${cliArgs.content.length} characters`);
    console.log(`🔢 Generate Embeddings: ${cliArgs.noEmbeddings ? 'No' : 'Yes'}`);
    console.log();

    try {
      // Test chunking
      const startTime = Date.now();
      console.log('✂️ Chunking content...');
      
      const chunkingResult = await textChunkingService.chunkText(cliArgs.content, {
        minTokens: 300,
        maxTokens: 400,
        overlapPercent: 17.5
      });

      if (!chunkingResult.success) {
        console.error('❌ Chunking failed:', chunkingResult.error);
        return;
      }

      await displayChunkingResults(chunkingResult, cliArgs.verbose);

      // Test embeddings if enabled
      if (!cliArgs.noEmbeddings && embeddingService) {
        console.log('\n🔢 Generating embeddings...');
        
        const embeddingRequests = chunkingResult.chunks.map((chunk, index) => ({
          text: chunk.content,
          id: `chunk_${index}`,
          metadata: { chunkIndex: index }
        }));

        const embeddingResult = await embeddingService.generateBatchEmbeddings(embeddingRequests);
        await displayEmbeddingResults(embeddingResult);

        // Display combined analysis
        const totalTime = Date.now() - startTime;
        console.log('\n📊 Combined Analysis');
        console.log('============================================');
        console.log(`⏱️  Total Processing Time: ${totalTime}ms`);
        console.log(`🧮 Chunks Created: ${chunkingResult.chunks.length}`);
        console.log(`🔢 Embeddings Generated: ${embeddingResult.successCount}`);
        console.log(`💰 Estimated Cost: $${embeddingResult.costEstimate.toFixed(4)}`);
        console.log(`📈 Overall Success Rate: ${(embeddingResult.successCount / chunkingResult.chunks.length * 100).toFixed(1)}%`);
      }

    } catch (error: any) {
      console.error('❌ Processing failed:', error.message);
    }

    return;
  }

  // For database operations, need database connection
  console.log('🔍 Database operations require connection...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    const pageRepository = new PostgreSQLPageRepository(pool);
    const chunkRepository = new PostgreSQLChunkRepository(pool);
    
    // Create the use case with real PostgreSQL repositories
    const chunkAndEmbedUseCase = new ChunkAndEmbedContent(
      pageRepository,
      chunkRepository,
      textChunkingService,
      embeddingService || new EmbeddingService()
    );

    console.log('✅ Services initialized');
    console.log();

    // Handle specific page ID
    if (cliArgs.pageId) {
      console.log(`🆔 Page ID: ${cliArgs.pageId}`);
      console.log(`🔢 Generate Embeddings: ${cliArgs.noEmbeddings ? 'No' : 'Yes'}`);
      console.log();

      const result = await chunkAndEmbedUseCase.execute({
        pageId: cliArgs.pageId,
        updateDatabase: true, // Now we can update the database with real repository
        chunkingOptions: {
          minTokens: 300,
          maxTokens: 400,
          overlapPercent: 17.5
        },
        embeddingOptions: cliArgs.noEmbeddings ? undefined : {
          model: 'text-embedding-3-small'
        }
      });

      await displayChunkAndEmbedResults(result, cliArgs.verbose);
      return;
    }

    // Handle session batch processing
    if (cliArgs.sessionId) {
      console.log(`📊 Session ID: ${cliArgs.sessionId}`);
      console.log(`📄 Limit: ${cliArgs.limit || 3} pages`);
      console.log(`🔢 Generate Embeddings: ${cliArgs.noEmbeddings ? 'No' : 'Yes'}`);
      console.log();

      // Get pages from session
      const pages = await pageRepository.findByCrawlSessionId(cliArgs.sessionId, {
        limit: cliArgs.limit || 3,
        orderBy: 'priority',
        orderDirection: 'desc'
      });

      if (pages.length === 0) {
        console.log('⚠️ No pages found in the specified session');
        console.log('💡 Try running content extraction first:');
        console.log('   npm run test-content-extraction -- --session session-id --update-db');
        return;
      }

      console.log(`🚀 Processing ${pages.length} pages...`);
      console.log();

      const results = await chunkAndEmbedUseCase.processBatch(pages, {
        concurrency: 1,
        updateDatabase: true, // Now we can update the database with real repository
        chunkingOptions: {
          minTokens: 300,
          maxTokens: 400,
          overlapPercent: 17.5
        },
        embeddingOptions: cliArgs.noEmbeddings ? undefined : {
          model: 'text-embedding-3-small'
        }
      });

      // Display batch summary
      await displayBatchResults(results, cliArgs.verbose);
      return;
    }

    // No specific options provided
    console.log('⚠️ No processing target specified');
    console.log();
    console.log('💡 Examples:');
    console.log('   # Test with custom content');
    console.log('   npx tsx test-chunking-embedding.ts --content "Your long text here..."');
    console.log();
    console.log('   # Process extracted page content');
    console.log('   npx tsx test-chunking-embedding.ts --page-id <page-id>');
    console.log();
    console.log('   # Show help');
    console.log('   npx tsx test-chunking-embedding.ts --help');

  } catch (error: any) {
    console.error('❌ An error occurred:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

async function displayChunkingResults(result: any, verbose: boolean = false) {
  console.log('✅ Chunking Completed!');
  console.log('============================================');
  console.log(`⏱️  Processing Time: ${result.processingTimeMs}ms`);
  console.log(`🧮 Total Chunks: ${result.totalChunks}`);
  console.log(`📊 Average Tokens: ${Math.round(result.averageTokens)}`);
  console.log(`📈 Average Quality: ${result.quality.averageScore}/100`);
  console.log(`📏 Size Consistency: ${result.quality.chunkSizeConsistency}/100`);
  console.log(`🔗 Overlap Effectiveness: ${result.quality.overlapEffectiveness}/100`);

  if (verbose && result.chunks.length > 0) {
    console.log('\n📋 Individual Chunks:');
    console.log('============================================');
    
    result.chunks.slice(0, 5).forEach((chunk: any, index: number) => {
      console.log(`\n📄 Chunk ${index + 1}:`);
      console.log(`   Tokens: ${chunk.tokenCount}`);
      console.log(`   Quality: ${chunk.metadata.quality.score}/100`);
      console.log(`   Split Reason: ${chunk.metadata.splitReason}`);
      console.log(`   Has Heading: ${chunk.metadata.hasHeading ? 'Yes' : 'No'}`);
      console.log(`   Sentences: ${chunk.metadata.sentenceCount}`);
      if (chunk.overlapStart || chunk.overlapEnd) {
        console.log(`   Overlap: ${chunk.overlapStart || 0} start, ${chunk.overlapEnd || 0} end tokens`);
      }
      const preview = chunk.content.substring(0, 150);
      console.log(`   Preview: ${preview}${chunk.content.length > 150 ? '...' : ''}`);
    });

    if (result.chunks.length > 5) {
      console.log(`\n   ... and ${result.chunks.length - 5} more chunks`);
    }
  }
}

async function displayEmbeddingResults(result: any) {
  console.log('\n✅ Embedding Generation Completed!');
  console.log('============================================');
  console.log(`⏱️  Processing Time: ${result.processingTimeMs}ms`);
  console.log(`✅ Successful: ${result.successCount}/${result.results.length}`);
  console.log(`❌ Failed: ${result.failureCount}/${result.results.length}`);
  console.log(`🎯 Success Rate: ${((result.successCount / result.results.length) * 100).toFixed(1)}%`);
  console.log(`🔢 Total Tokens: ${result.totalTokens.toLocaleString()}`);
  console.log(`💰 Estimated Cost: $${result.costEstimate.toFixed(4)}`);
  
  if (result.results.length > 0 && result.results[0].embedding) {
    console.log(`📐 Embedding Dimensions: ${result.results[0].embedding.length}`);
  }
}

async function displayChunkAndEmbedResults(result: any, verbose: boolean = false) {
  if (result.success) {
    console.log('✅ Chunking and Embedding Completed!');
    console.log('============================================');
    console.log(`⏱️  Duration: ${result.processingTimeMs}ms`);
    console.log(`📄 Page: ${result.page?.title || 'Unknown'}`);
    console.log(`🧮 Chunks Created: ${result.chunksCreated}`);
    console.log(`🔢 Embeddings Generated: ${result.embeddingsGenerated}`);
    console.log(`🎯 Embedding Success Rate: ${result.quality.embeddingSuccessRate.toFixed(1)}%`);
    console.log(`📊 Average Chunk Quality: ${result.quality.averageChunkQuality}/100`);
    console.log(`📏 Chunk Consistency: ${result.quality.chunkSizeConsistency}/100`);
    console.log(`🔖 Total Tokens Used: ${result.totalTokensUsed.toLocaleString()}`);
    console.log(`💰 Estimated Cost: $${result.estimatedCost.toFixed(4)}`);

    if (verbose) {
      console.log('\n📋 Chunk Details:');
      console.log('============================================');
      
      result.chunks.slice(0, 3).forEach((chunk: any, index: number) => {
        console.log(`\n📄 Chunk ${index + 1}:`);
        console.log(`   Tokens: ${chunk.tokenCount}`);
        console.log(`   Quality: ${chunk.quality}/100`);
        console.log(`   Embedding: ${chunk.embeddingSuccess ? '✅' : '❌'} (${chunk.embeddingDimensions}D)`);
        const preview = chunk.content.substring(0, 100);
        console.log(`   Preview: ${preview}...`);
      });

      if (result.chunks.length > 3) {
        console.log(`\n   ... and ${result.chunks.length - 3} more chunks`);
      }
    }

    console.log(`\n💬 ${result.message}`);

  } else {
    console.error('❌ Chunking and embedding failed');
    console.error('============================================');
    console.error(`⏱️  Duration: ${result.processingTimeMs}ms`);
    console.error(`💬 Message: ${result.message}`);
    if (result.error) {
      console.error(`🚨 Error: ${result.error}`);
    }
  }
}

async function displayBatchResults(results: any[], verbose: boolean = false) {
  console.log('\n📊 Batch Processing Summary');
  console.log('============================================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    const totalChunks = successful.reduce((sum, r) => sum + r.chunksCreated, 0);
    const totalEmbeddings = successful.reduce((sum, r) => sum + r.embeddingsGenerated, 0);
    const totalCost = successful.reduce((sum, r) => sum + r.estimatedCost, 0);
    const avgQuality = successful.reduce((sum, r) => sum + r.quality.averageChunkQuality, 0) / successful.length;
    const avgTime = successful.reduce((sum, r) => sum + r.processingTimeMs, 0) / successful.length;
    
    console.log(`🧮 Total Chunks: ${totalChunks}`);
    console.log(`🔢 Total Embeddings: ${totalEmbeddings}`);
    console.log(`📈 Average Quality: ${avgQuality.toFixed(1)}/100`);
    console.log(`💰 Total Cost: $${totalCost.toFixed(4)}`);
    console.log(`⏱️ Average Time: ${avgTime.toFixed(0)}ms per page`);
  }

  if (verbose) {
    console.log('\n📋 Individual Results:');
    console.log('============================================');
    
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.success ? '✅' : '❌'} ${result.page?.title || 'Unknown page'}`);
      if (result.success) {
        console.log(`   Chunks: ${result.chunksCreated}, Embeddings: ${result.embeddingsGenerated}`);
        console.log(`   Quality: ${result.quality.averageChunkQuality}/100, Cost: $${result.estimatedCost.toFixed(4)}`);
      } else {
        console.log(`   Error: ${result.error}`);
      }
    });
  }
}

// Main execution
testChunkingAndEmbedding().catch(console.error);
