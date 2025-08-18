/**
 * Full Website Crawling API Endpoint
 * 
 * POST /api/crawling/full-crawl
 * 
 * Executes the complete crawling pipeline:
 * 1. Website discovery and page prioritization
 * 2. Content extraction from discovered pages  
 * 3. Text chunking with intelligent boundaries
 * 4. Vector embedding generation
 * 5. Database storage with metadata
 * 
 * Request Body:
 * {
 *   "websiteUrl": "https://example.com",
 *   "maxPages": 10,
 *   "maxDepth": 1,
 *   "description": "Optional website description"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "website": {...},
 *   "session": {...},
 *   "summary": {
 *     "pagesDiscovered": 10,
 *     "pagesProcessed": 8,
 *     "chunksCreated": 24,
 *     "embeddingsGenerated": 24,
 *     "processingTimeMs": 45000,
 *     "totalCost": 0.0048,
 *     "averageQuality": 72
 *   },
 *   "pages": [...],
 *   "message": "Successfully processed 8 pages with 24 chunks and 24 embeddings"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Framework imports
import { CrawlingPipelineApplication } from '../../../../../packages/ai-framework/src/application/CrawlingPipelineApplication';

// Repositories
import {
  PostgreSQLWebsiteRepository,
  PostgreSQLPageRepository,
  PostgreSQLCrawlSessionRepository,
  PostgreSQLChunkRepository
} from '../../../../../packages/ai-framework/src/infrastructure/database';

// Services
import {
  PageDiscoveryService,
  HtmlFetcherService,
  ContentExtractionService,
  TextChunkingService,
  EmbeddingService
} from '../../../../../packages/ai-framework/src/domain/services';

interface FullCrawlRequestBody {
  websiteUrl: string;
  maxPages?: number;
  maxDepth?: number;
  description?: string;
  sessionMetadata?: Record<string, any>;
}

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize services and repositories
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

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Full crawl API endpoint called');
    
    // Parse request body
    const body: FullCrawlRequestBody = await request.json();
    
    // Validate required fields
    if (!body.websiteUrl) {
      return NextResponse.json({
        success: false,
        error: 'websiteUrl is required',
        message: 'Please provide a valid website URL'
      }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(body.websiteUrl);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid URL format',
        message: 'Please provide a valid website URL (e.g., https://example.com)'
      }, { status: 400 });
    }

    // Validate parameters
    const maxPages = body.maxPages || 10;
    const maxDepth = body.maxDepth || 1;
    
    if (maxPages < 1 || maxPages > 100) {
      return NextResponse.json({
        success: false,
        error: 'Invalid maxPages',
        message: 'maxPages must be between 1 and 100'
      }, { status: 400 });
    }

    if (maxDepth < 1 || maxDepth > 5) {
      return NextResponse.json({
        success: false,
        error: 'Invalid maxDepth',
        message: 'maxDepth must be between 1 and 5'
      }, { status: 400 });
    }

    console.log(`📊 Starting full crawl: ${body.websiteUrl}, maxPages: ${maxPages}, maxDepth: ${maxDepth}`);

    // Execute the full crawling pipeline
    const result = await pipelineApp.executeFullCrawl({
      websiteUrl: body.websiteUrl,
      maxPages,
      maxDepth,
      description: body.description,
      sessionMetadata: {
        ...body.sessionMetadata,
        apiEndpoint: '/api/crawling/full-crawl',
        requestTimestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent') || 'Unknown'
      }
    });

    if (result.success) {
      console.log(`✅ Full crawl completed successfully`);
      console.log(`📊 Summary: ${result.summary.pagesProcessed} pages, ${result.summary.chunksCreated} chunks, ${result.summary.embeddingsGenerated} embeddings`);
      console.log(`💰 Cost: $${result.summary.totalCost.toFixed(4)}`);
      
      return NextResponse.json(result, { status: 200 });
    } else {
      console.error(`❌ Full crawl failed: ${result.error}`);
      
      return NextResponse.json({
        success: false,
        error: result.error,
        message: result.message,
        summary: result.summary
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Full crawl API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'An unexpected error occurred during the crawling process',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/crawling/full-crawl',
    method: 'POST',
    description: 'Execute complete website crawling pipeline with discovery, extraction, chunking, and embedding',
    parameters: {
      websiteUrl: {
        type: 'string',
        required: true,
        description: 'Website URL to crawl (e.g., https://example.com)',
        example: 'https://docs.openai.com'
      },
      maxPages: {
        type: 'number',
        required: false,
        default: 10,
        range: '1-100',
        description: 'Maximum number of pages to crawl'
      },
      maxDepth: {
        type: 'number',
        required: false,
        default: 1,
        range: '1-5',
        description: 'Maximum crawling depth from the root page'
      },
      description: {
        type: 'string',
        required: false,
        description: 'Optional description for the website'
      },
      sessionMetadata: {
        type: 'object',
        required: false,
        description: 'Optional metadata to attach to the crawl session'
      }
    },
    response: {
      success: 'boolean',
      website: 'Website object with domain, title, etc.',
      session: 'CrawlSession object with session details',
      summary: {
        pagesDiscovered: 'Number of pages found during discovery',
        pagesProcessed: 'Number of pages successfully processed',
        chunksCreated: 'Total text chunks created',
        embeddingsGenerated: 'Total embeddings generated',
        processingTimeMs: 'Total processing time in milliseconds',
        totalCost: 'Estimated cost in USD',
        averageQuality: 'Average quality score of chunks (0-100)'
      },
      pages: 'Array of processed page summaries',
      message: 'Human-readable result message'
    },
    pipeline: [
      '1. Website Discovery - Find and prioritize pages',
      '2. Content Extraction - Extract clean text from HTML',
      '3. Text Chunking - Split content into 300-400 token chunks',
      '4. Vector Embedding - Generate 1536D embeddings using OpenAI',
      '5. Database Storage - Store chunks and vectors in PostgreSQL'
    ],
    examples: {
      basic: {
        websiteUrl: 'https://docs.openai.com',
        maxPages: 5,
        maxDepth: 1
      },
      advanced: {
        websiteUrl: 'https://example.com',
        maxPages: 20,
        maxDepth: 2,
        description: 'Company documentation',
        sessionMetadata: {
          project: 'knowledge-base',
          version: '1.0'
        }
      }
    }
  });
}
