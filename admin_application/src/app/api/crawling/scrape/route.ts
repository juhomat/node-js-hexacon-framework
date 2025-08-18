/**
 * Web Scraping & Embedding API Endpoint
 * 
 * POST /api/crawling/scrape
 * 
 * Executes the complete web scraping and embedding pipeline:
 * 1. Website discovery and intelligent page prioritization
 * 2. Real-time content extraction from discovered pages
 * 3. Smart text chunking with sentence boundary respect
 * 4. Vector embedding generation using OpenAI
 * 5. Database storage with performance metrics
 * 
 * Request Body:
 * {
 *   "websiteUrl": "https://docs.openai.com",
 *   "maxPages": 10,
 *   "maxDepth": 2,
 *   "description": "OpenAI API Documentation"
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
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCrawlingPipelineApplication } from '@/lib/framework'

interface ScrapeRequestBody {
  websiteUrl: string
  maxPages?: number
  maxDepth?: number
  description?: string
  sessionMetadata?: Record<string, any>
}

export async function POST(request: NextRequest) {
  try {
    console.log('🕷️ Web Scraping & Embedding API endpoint called')
    
    // Parse request body
    const body: ScrapeRequestBody = await request.json()
    
    // Validate required fields
    if (!body.websiteUrl) {
      return NextResponse.json({
        success: false,
        error: 'websiteUrl is required',
        message: 'Please provide a valid website URL to scrape'
      }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(body.websiteUrl)
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid URL format',
        message: 'Please provide a valid website URL (e.g., https://example.com)'
      }, { status: 400 })
    }

    // Validate parameters
    const maxPages = body.maxPages || 10
    const maxDepth = body.maxDepth || 1
    
    if (maxPages < 1 || maxPages > 100) {
      return NextResponse.json({
        success: false,
        error: 'Invalid maxPages',
        message: 'maxPages must be between 1 and 100'
      }, { status: 400 })
    }

    if (maxDepth < 1 || maxDepth > 5) {
      return NextResponse.json({
        success: false,
        error: 'Invalid maxDepth',
        message: 'maxDepth must be between 1 and 5'
      }, { status: 400 })
    }

    console.log(`📊 Starting web scraping for: ${body.websiteUrl}`)
    console.log(`   Max Pages: ${maxPages}`)
    console.log(`   Max Depth: ${maxDepth}`)
    console.log(`   Description: ${body.description || 'Auto-detected'}`)

    // Get crawling application from service layer
    const crawlingApp = getCrawlingPipelineApplication()

    // Execute the complete web scraping & embedding pipeline
    const result = await crawlingApp.executeFullCrawl({
      websiteUrl: body.websiteUrl,
      maxPages,
      maxDepth,
      description: body.description,
      sessionMetadata: {
        source: 'admin_interface',
        endpoint: '/api/crawling/scrape',
        requestTimestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent') || 'Admin Interface',
        ...body.sessionMetadata
      }
    })

    if (result.success) {
      console.log(`✅ Web scraping completed successfully`)
      console.log(`📊 Summary:`)
      console.log(`   Pages discovered: ${result.summary.pagesDiscovered}`)
      console.log(`   Pages processed: ${result.summary.pagesProcessed}`)
      console.log(`   Chunks created: ${result.summary.chunksCreated}`)
      console.log(`   Embeddings generated: ${result.summary.embeddingsGenerated}`)
      console.log(`   Processing time: ${(result.summary.processingTimeMs / 1000).toFixed(1)}s`)
      console.log(`   Total cost: $${result.summary.totalCost.toFixed(4)}`)
      console.log(`   Average quality: ${result.summary.averageQuality}%`)
      
      return NextResponse.json({
        success: true,
        website: result.website,
        session: result.session,
        summary: result.summary,
        pages: result.pages,
        message: `Successfully scraped and embedded ${result.summary.pagesProcessed} pages with ${result.summary.chunksCreated} chunks`
      }, { status: 200 })
      
    } else {
      console.error(`❌ Web scraping failed: ${result.error}`)
      
      return NextResponse.json({
        success: false,
        error: result.error,
        message: result.message,
        summary: result.summary
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('❌ Web Scraping API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'An unexpected error occurred during the web scraping process',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/crawling/scrape',
    method: 'POST',
    description: 'Complete web scraping and embedding pipeline for RAG systems',
    pipeline: [
      '1. Website Discovery - Intelligent page discovery using sitemaps and crawling',
      '2. Content Extraction - Clean text extraction from HTML using Readability.js',
      '3. Smart Chunking - Text splitting into 300-400 token chunks with sentence boundaries',
      '4. Vector Embedding - Generate 1536D embeddings using OpenAI text-embedding-3-small',
      '5. Database Storage - Store chunks and vectors in PostgreSQL with pgvector'
    ],
    parameters: {
      websiteUrl: {
        type: 'string',
        required: true,
        description: 'Website URL to scrape and embed',
        example: 'https://docs.openai.com'
      },
      maxPages: {
        type: 'number',
        required: false,
        default: 10,
        range: '1-100',
        description: 'Maximum number of pages to process'
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
        description: 'Optional metadata to attach to the crawling session'
      }
    },
    response: {
      success: 'boolean - Operation success status',
      website: 'object - Website details and metadata',
      session: 'object - Crawling session information',
      summary: {
        pagesDiscovered: 'number - Pages found during discovery',
        pagesProcessed: 'number - Pages successfully processed',
        chunksCreated: 'number - Text chunks created for RAG',
        embeddingsGenerated: 'number - Vector embeddings generated',
        processingTimeMs: 'number - Total processing time',
        totalCost: 'number - Estimated API costs in USD',
        averageQuality: 'number - Average content quality score (0-100)'
      },
      pages: 'array - List of processed pages with details',
      message: 'string - Human-readable result summary'
    },
    features: [
      'Intelligent page discovery with smart prioritization',
      'Real-time content extraction and quality assessment',
      'Semantic text chunking with boundary respect',
      'High-performance vector embeddings for RAG',
      'Comprehensive metrics and cost tracking',
      'Robust error handling and recovery'
    ],
    examples: {
      documentation: {
        websiteUrl: 'https://docs.openai.com',
        maxPages: 15,
        maxDepth: 2,
        description: 'OpenAI API Documentation'
      },
      blog: {
        websiteUrl: 'https://blog.example.com',
        maxPages: 25,
        maxDepth: 1,
        description: 'Company Blog Posts'
      },
      knowledgeBase: {
        websiteUrl: 'https://support.example.com',
        maxPages: 50,
        maxDepth: 3,
        description: 'Customer Support Knowledge Base'
      }
    }
  })
}
