# 🕷️ Crawling & RAG System Documentation

## Overview

The AI Framework includes a comprehensive crawling and RAG (Retrieval-Augmented Generation) system that enables projects to crawl websites, extract content, generate embeddings, and perform vector-based searches for enhanced AI conversations.

## 🏗️ Architecture

The crawling system follows the framework's hexagonal architecture with four main components:

```
Website Input → Real-time Crawling → Content Processing → Vector Storage → RAG Search
```

### Core Components

1. **Domain Entities**: Website, CrawlSession, Page, Chunk
2. **Infrastructure Adapters**: Web scraping, text processing, embedding generation, vector storage
3. **Application Services**: Real-time crawling orchestration
4. **Presentation Layer**: Admin interface for crawling management

## 🗄️ Database Schema

### Table Structure

The crawling system extends the base AI Framework schema with four main tables:

#### 1. `websites` - Website Registry
```sql
CREATE TABLE websites (
    id UUID PRIMARY KEY,
    domain VARCHAR(255) UNIQUE,           -- "example.com"
    base_url VARCHAR(2048),               -- "https://example.com"
    title VARCHAR(512),                   -- "Website Display Name"
    description TEXT,                     -- Optional description
    status VARCHAR(20) DEFAULT 'active', -- active, inactive
    total_pages INTEGER DEFAULT 0,       -- Pages crawled across all sessions
    last_crawled_at TIMESTAMP,           -- Last successful crawl
    metadata JSONB DEFAULT '{}',         -- Site-specific settings
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. `crawl_sessions` - Real-time Crawling Sessions
```sql
CREATE TABLE crawl_sessions (
    id UUID PRIMARY KEY,
    website_id UUID REFERENCES websites(id),
    max_pages INTEGER DEFAULT 10,        -- User-specified limit
    max_depth INTEGER DEFAULT 1,         -- Crawling depth (0=root only)
    status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed
    pages_crawled INTEGER DEFAULT 0,     -- Progress tracking
    chunks_created INTEGER DEFAULT 0,    -- Vector chunks generated
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',         -- Session settings
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. `pages` - Crawled Web Pages
```sql
CREATE TABLE pages (
    id UUID PRIMARY KEY,
    website_id UUID REFERENCES websites(id),
    crawl_session_id UUID REFERENCES crawl_sessions(id),
    url VARCHAR(2048),                    -- Full page URL
    title VARCHAR(512),                   -- Page title
    content TEXT,                         -- Extracted clean text
    raw_html TEXT,                        -- Full HTML content
    depth_level INTEGER,                  -- 0=root, 1=one level deep
    token_count INTEGER,                  -- Approximate tokens
    status VARCHAR(20) DEFAULT 'completed',
    error_message TEXT,                   -- Error details if failed
    crawled_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',         -- Headers, content-type, etc.
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(crawl_session_id, url)        -- Prevent duplicates per session
);
```

#### 4. `chunks` - Vector Embeddings for RAG
```sql
CREATE TABLE chunks (
    id UUID PRIMARY KEY,
    page_id UUID REFERENCES pages(id),
    content TEXT NOT NULL,                -- Chunk text content
    chunk_index INTEGER,                  -- Position in page (0, 1, 2...)
    token_count INTEGER,                  -- Tokens in chunk
    start_position INTEGER,               -- Character position in original
    end_position INTEGER,                 -- Character position in original
    embedding vector(1536),               -- OpenAI embedding vector
    embedding_model VARCHAR(50) DEFAULT 'text-embedding-3-small',
    metadata JSONB DEFAULT '{}',         -- Chunking strategy info
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Key Relationships

```
websites (1) ──── (many) crawl_sessions
    │                      │
    │                      │
    └──── (many) pages ────┘
                 │
                 │
               (many) chunks
```

### Performance Indexes

The schema includes optimized indexes for:
- **Vector similarity search** using `ivfflat` indexes
- **Website and session lookups** for management interfaces
- **Page URL lookups** for crawling deduplication
- **Composite indexes** for common RAG queries

## 🚀 Setup Instructions

### 1. Database Setup

**Option A: Automatic Setup (Recommended)**
```bash
# From the ai-framework directory
npm run setup-db
```

**Option B: Manual Setup**
```bash
# Setup base schema first
psql $DATABASE_URL -f src/infrastructure/database/schema.sql

# Setup crawling schema
npm run setup-crawling-schema
```

**Option C: Individual SQL Files**
```bash
# Base schema
psql your_database -f src/infrastructure/database/schema.sql

# Crawling schema  
psql your_database -f src/infrastructure/database/crawling-schema.sql
```

### 2. Required Extensions

The crawling system requires PostgreSQL extensions:
```sql
CREATE EXTENSION IF NOT EXISTS vector;      -- For embedding storage
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- For UUID generation
```

### 3. Environment Variables

Add to your `.env` file:
```env
# Required for crawling
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
OPENAI_API_KEY=your_openai_api_key

# Optional: Crawling configuration
CRAWLING_MAX_PAGES=10      # Default max pages per session
CRAWLING_MAX_DEPTH=1       # Default crawling depth
CRAWLING_DELAY_MS=1000     # Delay between requests
```

## 📊 Usage Examples

### Creating and Managing Websites

```typescript
// Register a new website
const website = await websiteRepository.create({
  domain: 'docs.openai.com',
  baseUrl: 'https://docs.openai.com',
  title: 'OpenAI Documentation',
  description: 'Official OpenAI API documentation'
});

// Start a crawling session
const session = await crawlSessionRepository.create({
  websiteId: website.id,
  maxPages: 20,
  maxDepth: 2
});
```

### Real-time Crawling

```typescript
// Stream crawling progress
for await (const progress of crawlingService.crawlWebsite({
  websiteId: website.id,
  maxPages: 10,
  maxDepth: 1
})) {
  console.log(`Progress: ${progress.current}/${progress.total}`);
  // Update UI with real-time progress
}
```

### RAG Vector Search

```typescript
// Search for relevant content
const results = await vectorSearch.findSimilar({
  query: "How do I use the OpenAI API?",
  limit: 5,
  websiteIds: [website.id]  // Optional: filter by specific websites
});

// Results include page context and similarity scores
results.forEach(result => {
  console.log(`Score: ${result.similarity}`);
  console.log(`Content: ${result.chunk.content}`);
  console.log(`Source: ${result.page.url}`);
});
```

## 🔧 Configuration Options

### Crawling Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `maxPages` | 10 | Maximum pages to crawl per session |
| `maxDepth` | 1 | How deep to crawl (0=root only, 1=one level) |
| `delay` | 1000ms | Delay between requests (respectful crawling) |
| `userAgent` | "AI-Framework-Bot" | User agent string |
| `timeout` | 30000ms | Request timeout |

### Chunking Strategy

| Parameter | Default | Description |
|-----------|---------|-------------|
| `chunkSize` | 1000 | Target tokens per chunk |
| `overlap` | 200 | Overlap between chunks |
| `splitOn` | sentences | Split strategy (sentences, paragraphs) |

### Embedding Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `model` | text-embedding-3-small | OpenAI embedding model |
| `dimensions` | 1536 | Vector dimensions |
| `batchSize` | 100 | Chunks per embedding batch |

## 🎯 Integration with Projects

### Using in Your Project

1. **Include the framework** as a dependency
2. **Run the setup script** to create tables
3. **Use the application services** for crawling
4. **Integrate with your UI** for management

### Example Project Integration

```typescript
// In your project's setup
import { CrawlingSchemaSetup } from 'ai-framework';

// Setup database schema
const setup = new CrawlingSchemaSetup({
  connectionString: process.env.DATABASE_URL
});
await setup.setup();

// Use crawling services
import { CrawlingApplication } from 'ai-framework';

const crawlingApp = new CrawlingApplication(
  websiteRepository,
  pageRepository,
  chunkRepository,
  scrapingService,
  embeddingService
);
```

## 📈 Monitoring and Analytics

### Built-in Statistics

The schema automatically tracks:
- **Website statistics**: Total pages, last crawl time
- **Session progress**: Pages crawled, chunks created
- **Error tracking**: Failed URLs, retry counts
- **Performance metrics**: Processing times, token counts

### Admin Interface Features

- **Real-time crawling progress**
- **Website management dashboard**
- **Vector search testing**
- **Error monitoring and debugging**
- **Performance analytics**

## 🔍 Troubleshooting

### Common Issues

**"vector extension not found"**
```sql
-- Install pgvector extension
CREATE EXTENSION vector;
```

**"Permission denied creating tables"**
- Ensure database user has CREATE privileges
- Check connection string and credentials

**"Crawling taking too long"**
- Reduce `maxPages` and `maxDepth` parameters
- Check website robots.txt and response times
- Monitor network connectivity

**"Vector search returning poor results"**
- Verify embeddings are being generated
- Check chunk content quality
- Tune similarity thresholds

### Performance Optimization

1. **Index optimization**: Ensure vector indexes are created
2. **Batch processing**: Process embeddings in batches
3. **Connection pooling**: Use connection pools for database access
4. **Caching**: Cache frequently accessed website metadata

## 🚀 Future Enhancements

Planned improvements to the crawling system:

- **Smart crawling**: Respect robots.txt and rate limits
- **Content filtering**: Skip non-text content automatically  
- **Multi-format support**: PDF, DOC, markdown files
- **Incremental updates**: Re-crawl only changed content
- **Advanced chunking**: Semantic-aware text splitting
- **Search improvements**: Hybrid search (keyword + vector)

---

## 📚 API Reference

See the framework's main documentation for detailed API references for:
- `CrawlingApplication` service methods
- Repository interfaces and implementations
- Domain entity structures
- Configuration options

For questions or contributions, see the main framework repository.
