/**
 * Streaming Full Website Crawling API Endpoint
 * 
 * POST /api/crawling/full-crawl-stream
 * 
 * Same as full-crawl but with real-time progress updates via Server-Sent Events (SSE).
 * This allows the client to receive progress updates during the long-running crawling process.
 * 
 * Request Body: Same as /api/crawling/full-crawl
 * 
 * Response: Server-Sent Events stream with progress updates
 * 
 * Event Types:
 * - progress: Real-time progress updates
 * - result: Final result when completed
 * - error: Error information if failed
 */

import { NextRequest } from 'next/server';
import { Pool } from 'pg';

// Framework imports
import { CrawlingPipelineApplication, PipelineProgress } from '../../../../../packages/ai-framework/src/application/CrawlingPipelineApplication';

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
    console.log('🚀 Streaming full crawl API endpoint called');
    
    // Parse request body
    const body: FullCrawlRequestBody = await request.json();
    
    // Validate required fields (same validation as full-crawl)
    if (!body.websiteUrl) {
      return new Response(
        `data: ${JSON.stringify({
          type: 'error',
          error: 'websiteUrl is required',
          message: 'Please provide a valid website URL'
        })}\n\n`,
        {
          status: 400,
          headers: {
            'Content-Type': 'text/plain',
          },
        }
      );
    }

    // Validate URL format
    try {
      new URL(body.websiteUrl);
    } catch (error) {
      return new Response(
        `data: ${JSON.stringify({
          type: 'error',
          error: 'Invalid URL format',
          message: 'Please provide a valid website URL (e.g., https://example.com)'
        })}\n\n`,
        {
          status: 400,
          headers: {
            'Content-Type': 'text/plain',
          },
        }
      );
    }

    // Validate parameters
    const maxPages = body.maxPages || 10;
    const maxDepth = body.maxDepth || 1;
    
    if (maxPages < 1 || maxPages > 100) {
      return new Response(
        `data: ${JSON.stringify({
          type: 'error',
          error: 'Invalid maxPages',
          message: 'maxPages must be between 1 and 100'
        })}\n\n`,
        {
          status: 400,
          headers: {
            'Content-Type': 'text/plain',
          },
        }
      );
    }

    if (maxDepth < 1 || maxDepth > 5) {
      return new Response(
        `data: ${JSON.stringify({
          type: 'error',
          error: 'Invalid maxDepth',
          message: 'maxDepth must be between 1 and 5'
        })}\n\n`,
        {
          status: 400,
          headers: {
            'Content-Type': 'text/plain',
          },
        }
      );
    }

    console.log(`📊 Starting streaming full crawl: ${body.websiteUrl}, maxPages: ${maxPages}, maxDepth: ${maxDepth}`);

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'connected',
          message: 'Connected to crawling pipeline',
          timestamp: new Date().toISOString()
        })}\n\n`));

        // Execute the full crawling pipeline with progress callback
        pipelineApp.executeFullCrawl({
          websiteUrl: body.websiteUrl,
          maxPages,
          maxDepth,
          description: body.description,
          sessionMetadata: {
            ...body.sessionMetadata,
            apiEndpoint: '/api/crawling/full-crawl-stream',
            requestTimestamp: new Date().toISOString(),
            userAgent: request.headers.get('user-agent') || 'Unknown'
          }
        }, (progress: PipelineProgress) => {
          // Send progress update via SSE
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              ...progress
            })}\n\n`));
          } catch (error) {
            console.error('Error sending progress update:', error);
          }
        }).then((result) => {
          // Send final result
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'result',
              ...result
            })}\n\n`));
            
            console.log(`✅ Streaming full crawl completed successfully`);
            console.log(`📊 Summary: ${result.summary.pagesProcessed} pages, ${result.summary.chunksCreated} chunks, ${result.summary.embeddingsGenerated} embeddings`);
            
          } catch (error) {
            console.error('Error sending final result:', error);
          } finally {
            controller.close();
          }
        }).catch((error) => {
          // Send error
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              error: error.message,
              message: 'Pipeline execution failed',
              timestamp: new Date().toISOString()
            })}\n\n`));
            
            console.error(`❌ Streaming full crawl failed: ${error.message}`);
            
          } catch (sendError) {
            console.error('Error sending error message:', sendError);
          } finally {
            controller.close();
          }
        });
      },
      
      cancel() {
        console.log('Client disconnected from streaming crawl');
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error: any) {
    console.error('❌ Streaming full crawl API error:', error);
    
    return new Response(
      `data: ${JSON.stringify({
        type: 'error',
        error: error.message || 'Internal server error',
        message: 'An unexpected error occurred during the crawling process',
        timestamp: new Date().toISOString()
      })}\n\n`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
        },
      }
    );
  }
}

export async function GET() {
  return new Response(JSON.stringify({
    endpoint: '/api/crawling/full-crawl-stream',
    method: 'POST',
    description: 'Execute complete website crawling pipeline with real-time progress updates via Server-Sent Events',
    parameters: 'Same as /api/crawling/full-crawl',
    response: {
      type: 'Server-Sent Events (text/event-stream)',
      events: {
        connected: 'Initial connection confirmation',
        progress: {
          stage: 'discovery | extraction | chunking | embedding | completed',
          message: 'Human-readable progress message',
          progress: 'Progress percentage (0-100)',
          details: 'Detailed progress information',
          timestamp: 'ISO timestamp'
        },
        result: 'Final pipeline result (same structure as /api/crawling/full-crawl)',
        error: 'Error information if pipeline fails'
      }
    },
    usage: {
      javascript: `
const response = await fetch('/api/crawling/full-crawl-stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    websiteUrl: 'https://example.com',
    maxPages: 10,
    maxDepth: 1
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      
      switch (data.type) {
        case 'connected':
          console.log('Connected to pipeline');
          break;
        case 'progress':
          console.log(\`Progress: \${data.stage} - \${data.progress}%\`);
          break;
        case 'result':
          console.log('Pipeline completed:', data.summary);
          break;
        case 'error':
          console.error('Pipeline error:', data.error);
          break;
      }
    }
  }
}
      `,
      curl: `
curl -X POST \\
  -H "Content-Type: application/json" \\
  -d '{"websiteUrl":"https://example.com","maxPages":5}' \\
  https://your-domain.com/api/crawling/full-crawl-stream
      `
    },
    benefits: [
      'Real-time progress updates during long-running operations',
      'Better user experience with live feedback',
      'Ability to show detailed progress for each pipeline stage',
      'Client can track processing without polling'
    ]
  }, null, 2), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
