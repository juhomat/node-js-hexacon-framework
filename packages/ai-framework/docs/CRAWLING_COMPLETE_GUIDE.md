# 🕷️ Complete Crawling & RAG Framework Guide

This guide provides everything you need to integrate the AI Framework's crawling, content extraction, chunking, and embedding capabilities into your projects.

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Database Setup](#database-setup)
- [API Endpoints](#api-endpoints)
- [Framework Integration](#framework-integration)
- [Example Scripts](#example-scripts)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## 🌟 Overview

The AI Framework provides a complete pipeline for processing web content for RAG (Retrieval-Augmented Generation):

```mermaid
graph LR
    A[Website URL] --> B[Discovery & Crawling]
    B --> C[Content Extraction]
    C --> D[Text Chunking]
    D --> E[Vector Embedding]
    E --> F[Database Storage]
    F --> G[RAG Search]
```

### Key Features

- ✅ **Intelligent Page Discovery** - Sitemap parsing with smart prioritization
- ✅ **Real-time Content Extraction** - Clean text extraction from HTML using Readability.js
- ✅ **Smart Text Chunking** - 300-400 token chunks with sentence boundary respect
- ✅ **Vector Embeddings** - OpenAI `text-embedding-3-small` for semantic search
- ✅ **PostgreSQL + pgvector** - High-performance vector storage and search
- ✅ **Streaming Progress** - Real-time feedback during long crawling operations
- ✅ **Cost Tracking** - Automatic API cost calculation and monitoring

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Required software
- Node.js >= 18.0.0
- PostgreSQL >= 12 with pgvector extension
- OpenAI API key
```

### 2. Installation

Add the framework to your project as a Git subtree:

```bash
git subtree add --prefix=packages/ai-framework https://github.com/your-org/ai-framework main --squash
```

Or copy the framework into your project structure:

```bash
cp -r ai-framework packages/
cd packages/ai-framework && npm install
```

### 3. Environment Setup

Create `.env` in your project root:

```env
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/your_db
OPENAI_API_KEY=sk-your-openai-api-key

# Optional crawling configuration
CRAWLING_MAX_PAGES=50        # Default max pages per session
CRAWLING_MAX_DEPTH=3         # Default crawling depth
CRAWLING_DELAY_MS=1000       # Respectful delay between requests
CRAWLING_USER_AGENT=YourBot  # Custom user agent
```

## 🗄️ Database Setup

### Option 1: Automatic Setup (Recommended)

```bash
cd packages/ai-framework
npm run setup-db
```

This runs:
1. Base schema creation (`schema.sql`)
2. Crawling schema creation (`crawling-schema.sql`)
3. Required PostgreSQL extensions

### Option 2: Manual Setup

```bash
# 1. Create database with extensions
createdb your_database
psql your_database -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql your_database -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# 2. Setup schemas
cd packages/ai-framework
psql $DATABASE_URL -f src/infrastructure/database/schema.sql
psql $DATABASE_URL -f src/infrastructure/database/crawling-schema.sql
```

### Option 3: Individual Scripts

```bash
cd packages/ai-framework

# Setup base schema
npm run setup-db-base

# Setup crawling schema
npm run setup-crawling-schema
```

### Database Schema Overview

The crawling system creates 4 main tables:

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `websites` | Website registry | Domain, status tracking, metadata |
| `crawl_sessions` | Crawling operations | Progress tracking, configuration |
| `pages` | Individual web pages | Content, HTML, metadata, depth |
| `chunks` | Vector embeddings | Text chunks with 1536D vectors |

## 🌐 API Endpoints

### Full Website Crawling

**Endpoint:** `POST /api/crawling/full-crawl`

Crawls an entire website with intelligent page discovery and processing.

```bash
curl -X POST http://localhost:3000/api/crawling/full-crawl \
  -H "Content-Type: application/json" \
  -d '{
    "websiteUrl": "https://docs.openai.com",
    "maxPages": 10,
    "maxDepth": 2,
    "description": "OpenAI API Documentation"
  }'
```

**Request Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `websiteUrl` | string | ✅ | - | Website to crawl (e.g., https://example.com) |
| `maxPages` | number | ❌ | 10 | Maximum pages to crawl (1-100) |
| `maxDepth` | number | ❌ | 1 | Crawling depth from root (1-5) |
| `description` | string | ❌ | - | Optional website description |
| `sessionMetadata` | object | ❌ | {} | Additional session metadata |

**Response Example:**

```json
{
  "success": true,
  "website": {
    "id": "uuid-here",
    "domain": "docs.openai.com",
    "title": "OpenAI Documentation"
  },
  "session": {
    "id": "session-uuid",
    "status": "completed",
    "pagesDiscovered": 10,
    "pagesCompleted": 8
  },
  "summary": {
    "pagesDiscovered": 10,
    "pagesProcessed": 8,
    "chunksCreated": 24,
    "embeddingsGenerated": 24,
    "processingTimeMs": 45000,
    "totalCost": 0.0048,
    "averageQuality": 72
  },
  "pages": [...]
}
```

### Manual Page Addition

**Endpoint:** `POST /api/crawling/add-page`

Add a specific page to process through the complete pipeline.

```bash
curl -X POST http://localhost:3000/api/crawling/add-page \
  -H "Content-Type: application/json" \
  -d '{
    "websiteUrl": "https://docs.openai.com",
    "pageUrl": "https://docs.openai.com/api-reference/chat",
    "title": "Chat API Reference",
    "priority": 95
  }'
```

**Request Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `websiteUrl` | string | ✅ | - | Base website URL |
| `pageUrl` | string | ✅ | - | Specific page to process |
| `title` | string | ❌ | auto-detect | Page title |
| `description` | string | ❌ | - | Page description |
| `priority` | number | ❌ | 80 | Priority score (0-100) |

### Streaming Crawl Progress

**Endpoint:** `GET /api/crawling/full-crawl-stream`

Real-time Server-Sent Events for crawling progress.

```javascript
const eventSource = new EventSource(
  `/api/crawling/full-crawl-stream?websiteUrl=${encodeURIComponent(url)}&maxPages=10`
);

eventSource.onmessage = (event) => {
  const progress = JSON.parse(event.data);
  console.log(`Progress: ${progress.current}/${progress.total}`);
};
```

## 🔧 Framework Integration

### Basic TypeScript Integration

```typescript
import { Pool } from 'pg';
import {
  CrawlingPipelineApplication,
  PostgreSQLWebsiteRepository,
  PostgreSQLPageRepository,
  PostgreSQLCrawlSessionRepository,
  PostgreSQLChunkRepository,
  PageDiscoveryService,
  HtmlFetcherService,
  ContentExtractionService,
  TextChunkingService,
  EmbeddingService
} from 'packages/ai-framework';

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Initialize repositories
const websiteRepository = new PostgreSQLWebsiteRepository(pool);
const pageRepository = new PostgreSQLPageRepository(pool);
const crawlSessionRepository = new PostgreSQLCrawlSessionRepository(pool);
const chunkRepository = new PostgreSQLChunkRepository(pool);

// Initialize services
const pageDiscoveryService = new PageDiscoveryService();
const htmlFetcherService = new HtmlFetcherService();
const contentExtractionService = new ContentExtractionService();
const textChunkingService = new TextChunkingService();
const embeddingService = new EmbeddingService();

// Initialize pipeline application
const crawlingPipeline = new CrawlingPipelineApplication(
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

// Execute full crawl
async function crawlWebsite() {
  const result = await crawlingPipeline.executeFullCrawl({
    websiteUrl: 'https://docs.openai.com',
    maxPages: 10,
    maxDepth: 2
  });
  
  console.log(`Processed ${result.summary.pagesProcessed} pages`);
  console.log(`Created ${result.summary.chunksCreated} chunks`);
  console.log(`Cost: $${result.summary.totalCost.toFixed(4)}`);
}

// Add single page
async function addPage() {
  const result = await crawlingPipeline.executeAddPage({
    websiteUrl: 'https://docs.openai.com',
    pageUrl: 'https://docs.openai.com/api-reference/chat',
    priority: 95
  });
  
  console.log(`Created ${result.summary.chunksCreated} chunks`);
}
```

### Vector Search Integration

```typescript
import { PostgreSQLChunkRepository } from 'packages/ai-framework';

const chunkRepository = new PostgreSQLChunkRepository(pool);

// Search for similar content
async function searchContent(query: string) {
  // Generate embedding for query
  const embeddingService = new EmbeddingService();
  const { embedding } = await embeddingService.generateEmbedding(query);
  
  // Search for similar chunks
  const chunks = await chunkRepository.searchSimilar(
    embedding,
    5,  // limit
    'website-id'  // optional website filter
  );
  
  chunks.forEach(chunk => {
    console.log(`Similarity: ${chunk.similarity}`);
    console.log(`Content: ${chunk.content}`);
    console.log(`Source: ${chunk.pageUrl}`);
  });
}
```

## 📚 Example Scripts

The framework includes comprehensive example scripts in the `examples/` directory:

### Full Pipeline Testing

```bash
# Test complete crawling pipeline
cd examples
npx tsx test-full-pipeline.ts
```

**Script:** `examples/test-full-pipeline.ts`
- Tests the complete CrawlingPipelineApplication
- Includes progress tracking and error handling
- Demonstrates proper repository initialization

### Individual Component Testing

```bash
# Test website discovery
npx tsx test-website-discovery.ts

# Test content extraction
npx tsx test-content-extraction.ts

# Test chunking and embedding
npx tsx test-chunking-embedding.ts

# Test manual page addition
npx tsx test-manual-page-addition.ts
```

### API Endpoint Testing

```bash
# Test API endpoints
npx tsx test-api-endpoints.ts --endpoint full-crawl --url https://example.com --max-pages 5

# Test single page API
npx tsx test-single-page-api.ts
```

### Custom Discovery Testing

```bash
# Test with custom website
npx tsx test-custom-discovery.ts --website https://your-site.com --max-pages 10 --max-depth 2
```

## ⚙️ Configuration

### Chunking Configuration

Default chunking settings (customizable in `TextChunkingService`):

```typescript
const chunkingConfig = {
  chunkSize: 400,           // Target tokens per chunk
  overlap: 60,              // Overlap between chunks (tokens)
  minChunkSize: 100,        // Minimum viable chunk size
  maxChunkSize: 500,        // Maximum chunk size
  splitStrategy: 'sentence' // Split on sentence boundaries
};
```

### Embedding Configuration

Default embedding settings (customizable in `EmbeddingService`):

```typescript
const embeddingConfig = {
  model: 'text-embedding-3-small',  // OpenAI model
  dimensions: 1536,                 // Vector dimensions
  batchSize: 100,                   // Chunks per API call
  maxRetries: 3,                    // Retry failed embeddings
  retryDelay: 1000                  // Delay between retries (ms)
};
```

### Crawling Configuration

Default crawling settings (customizable in services):

```typescript
const crawlingConfig = {
  maxPages: 10,           // Pages per session
  maxDepth: 1,            // Crawling depth
  delay: 1000,            // Delay between requests (ms)
  timeout: 30000,         // Request timeout (ms)
  userAgent: 'AI-Framework-Bot',
  respectRobots: true,    // Respect robots.txt
  followRedirects: true   // Follow HTTP redirects
};
```

## 🔍 Troubleshooting

### Common Issues

**"vector extension not found"**
```bash
# Install pgvector extension
psql your_database -c "CREATE EXTENSION vector;"
```

**"Permission denied creating tables"**
```bash
# Grant necessary permissions
psql your_database -c "GRANT CREATE ON DATABASE your_database TO your_user;"
```

**"OpenAI API rate limit exceeded"**
- Add delays between embedding API calls
- Use smaller batch sizes
- Implement exponential backoff

**"Chunking produces poor results"**
- Check content extraction quality
- Adjust chunk size and overlap parameters
- Verify text cleaning in ContentExtractionService

**"Vector search returns irrelevant results"**
- Check embedding generation
- Verify similarity thresholds
- Ensure proper chunk content quality

### Performance Optimization

1. **Database Indexes**
   ```sql
   -- Ensure vector indexes exist
   CREATE INDEX CONCURRENTLY idx_chunks_embedding ON chunks 
   USING ivfflat (embedding vector_cosine_ops)
   WITH (lists = 100);
   ```

2. **Connection Pooling**
   ```typescript
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     max: 20,        // Maximum connections
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000
   });
   ```

3. **Batch Processing**
   ```typescript
   // Process embeddings in batches
   const embeddingService = new EmbeddingService({
     batchSize: 50,  // Smaller batches for rate limiting
     maxRetries: 3
   });
   ```

### Debug Mode

Enable detailed logging:

```bash
# Set debug environment
export DEBUG=crawling:*
export NODE_ENV=development

# Run with verbose output
npx tsx test-full-pipeline.ts
```

### Monitoring

Track crawling performance:

```typescript
// Monitor crawling metrics
const metrics = {
  totalPages: result.summary.pagesProcessed,
  totalChunks: result.summary.chunksCreated,
  processingTime: result.summary.processingTimeMs,
  costPerPage: result.summary.totalCost / result.summary.pagesProcessed,
  avgQuality: result.summary.averageQuality
};

console.log('Crawling Metrics:', metrics);
```

## 📊 Advanced Usage

### Custom Content Extraction

```typescript
// Extend ContentExtractionService for custom extraction
class CustomContentExtraction extends ContentExtractionService {
  protected extractMainContent(html: string, url: string) {
    // Your custom extraction logic
    return super.extractMainContent(html, url);
  }
}
```

### Custom Chunking Strategy

```typescript
// Implement custom chunking logic
class CustomTextChunking extends TextChunkingService {
  protected splitIntoChunks(text: string, options: ChunkingOptions) {
    // Your custom chunking logic
    return super.splitIntoChunks(text, options);
  }
}
```

### Multi-Website RAG Search

```typescript
// Search across multiple websites
const websites = ['site1-id', 'site2-id', 'site3-id'];
const multiSiteResults = await chunkRepository.searchSimilar(
  queryEmbedding,
  10,
  websites  // Search across specific websites only
);
```

---

## 📚 Next Steps

1. **Set up your database** using the provided scripts
2. **Run example scripts** to verify functionality  
3. **Integrate API endpoints** into your application
4. **Customize configuration** for your specific needs
5. **Monitor performance** and optimize as needed

For additional help, check the framework's main documentation or create an issue in the repository.
