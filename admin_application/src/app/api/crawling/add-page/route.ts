/**
 * Manual Page Addition API Endpoint
 * 
 * POST /api/crawling/add-page
 * 
 * Adds a specific page to a website and executes the complete processing pipeline:
 * 1. Add page to website (create website if needed)
 * 2. Extract content from the page
 * 3. Chunk the extracted text
 * 4. Generate vector embeddings
 * 5. Store in database
 * 
 * Request Body:
 * {
 *   "websiteUrl": "https://example.com",
 *   "pageUrl": "https://example.com/docs/api",
 *   "title": "API Documentation",
 *   "description": "API reference documentation",
 *   "priority": 90
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "website": {...},
 *   "session": {...},
 *   "summary": {
 *     "pagesDiscovered": 1,
 *     "pagesProcessed": 1,
 *     "chunksCreated": 3,
 *     "embeddingsGenerated": 3,
 *     "processingTimeMs": 5000,
 *     "totalCost": 0.0006,
 *     "averageQuality": 78
 *   },
 *   "pages": [...],
 *   "message": "Successfully processed page with 3 chunks and 3 embeddings"
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

interface AddPageRequestBody {
  websiteUrl: string;
  pageUrl: string;
  title?: string;
  description?: string;
  priority?: number;
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
    console.log('📄 Add page API endpoint called');
    
    // Parse request body
    const body: AddPageRequestBody = await request.json();
    
    // Validate required fields
    if (!body.websiteUrl) {
      return NextResponse.json({
        success: false,
        error: 'websiteUrl is required',
        message: 'Please provide a valid website URL'
      }, { status: 400 });
    }

    if (!body.pageUrl) {
      return NextResponse.json({
        success: false,
        error: 'pageUrl is required',
        message: 'Please provide a valid page URL'
      }, { status: 400 });
    }

    // Validate URL formats
    try {
      new URL(body.websiteUrl);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid websiteUrl format',
        message: 'Please provide a valid website URL (e.g., https://example.com)'
      }, { status: 400 });
    }

    try {
      new URL(body.pageUrl);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid pageUrl format',
        message: 'Please provide a valid page URL (e.g., https://example.com/docs/api)'
      }, { status: 400 });
    }

    // Validate that pageUrl belongs to the website domain
    const websiteHostname = new URL(body.websiteUrl).hostname;
    const pageHostname = new URL(body.pageUrl).hostname;
    
    if (websiteHostname !== pageHostname) {
      return NextResponse.json({
        success: false,
        error: 'Domain mismatch',
        message: `Page URL domain (${pageHostname}) must match website domain (${websiteHostname})`
      }, { status: 400 });
    }

    // Validate priority
    const priority = body.priority || 80;
    if (priority < 0 || priority > 100) {
      return NextResponse.json({
        success: false,
        error: 'Invalid priority',
        message: 'Priority must be between 0 and 100'
      }, { status: 400 });
    }

    console.log(`📄 Adding page: ${body.pageUrl} to website: ${body.websiteUrl}`);
    console.log(`🎯 Priority: ${priority}, Title: ${body.title || 'Auto-detected'}`);

    // Execute the manual page addition pipeline
    const result = await pipelineApp.executeAddPage({
      websiteUrl: body.websiteUrl,
      pageUrl: body.pageUrl,
      title: body.title,
      description: body.description,
      priority
    });

    if (result.success) {
      console.log(`✅ Page addition completed successfully`);
      console.log(`📊 Summary: ${result.summary.chunksCreated} chunks, ${result.summary.embeddingsGenerated} embeddings`);
      console.log(`💰 Cost: $${result.summary.totalCost.toFixed(4)}`);
      
      return NextResponse.json(result, { status: 200 });
    } else {
      console.error(`❌ Page addition failed: ${result.error}`);
      
      return NextResponse.json({
        success: false,
        error: result.error,
        message: result.message,
        summary: result.summary
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Add page API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'An unexpected error occurred during page processing',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/crawling/add-page',
    method: 'POST',
    description: 'Add a specific page to a website and execute complete processing pipeline',
    parameters: {
      websiteUrl: {
        type: 'string',
        required: true,
        description: 'Base website URL (e.g., https://example.com)',
        example: 'https://docs.openai.com'
      },
      pageUrl: {
        type: 'string',
        required: true,
        description: 'Specific page URL to add and process',
        example: 'https://docs.openai.com/api-reference/chat'
      },
      title: {
        type: 'string',
        required: false,
        description: 'Optional page title (will be auto-detected if not provided)'
      },
      description: {
        type: 'string',
        required: false,
        description: 'Optional page description'
      },
      priority: {
        type: 'number',
        required: false,
        default: 80,
        range: '0-100',
        description: 'Priority score for the page (higher = more important)'
      }
    },
    response: {
      success: 'boolean',
      website: 'Website object (created if new)',
      session: 'CrawlSession object (manual session)',
      summary: {
        pagesDiscovered: 'Always 1 for single page addition',
        pagesProcessed: '1 if successful, 0 if failed',
        chunksCreated: 'Number of text chunks created',
        embeddingsGenerated: 'Number of embeddings generated',
        processingTimeMs: 'Total processing time in milliseconds',
        totalCost: 'Estimated cost in USD',
        averageQuality: 'Quality score of chunks (0-100)'
      },
      pages: 'Array with single processed page summary',
      message: 'Human-readable result message'
    },
    pipeline: [
      '1. Website Verification - Ensure website exists or create it',
      '2. Page Addition - Add page to manual crawl session',
      '3. Content Extraction - Extract clean text from HTML',
      '4. Text Chunking - Split content into 300-400 token chunks',
      '5. Vector Embedding - Generate 1536D embeddings using OpenAI',
      '6. Database Storage - Store chunks and vectors in PostgreSQL'
    ],
    useCases: [
      'Add important pages not found in sitemap',
      'Process specific documentation pages',
      'Add API reference pages',
      'Include blog posts or articles',
      'Add product pages with high priority'
    ],
    examples: {
      basic: {
        websiteUrl: 'https://docs.openai.com',
        pageUrl: 'https://docs.openai.com/api-reference/chat'
      },
      withMetadata: {
        websiteUrl: 'https://example.com',
        pageUrl: 'https://example.com/docs/important-feature',
        title: 'Important Feature Documentation',
        description: 'Key feature that users frequently ask about',
        priority: 95
      },
      blogPost: {
        websiteUrl: 'https://company.com',
        pageUrl: 'https://company.com/blog/new-product-launch',
        title: 'New Product Launch',
        priority: 90
      }
    },
    validation: {
      domainMatch: 'Page URL domain must match website URL domain',
      urlFormat: 'Both URLs must be valid HTTP/HTTPS URLs',
      priorityRange: 'Priority must be between 0 and 100'
    }
  });
}
