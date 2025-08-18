# 🌐 API Reference - Crawling & Processing Endpoints

Complete reference for the AI Framework's crawling and content processing API endpoints.

## Base URL

```
http://localhost:3000/api/crawling
```

## Authentication

Currently, no authentication is required. In production, implement proper API authentication.

## Content-Type

All requests must include:
```
Content-Type: application/json
```

---

## 🕷️ Full Website Crawling

### `POST /api/crawling/full-crawl`

Executes the complete crawling pipeline for an entire website.

**Pipeline Steps:**
1. Website discovery and page prioritization
2. Content extraction from discovered pages
3. Text chunking with intelligent boundaries
4. Vector embedding generation
5. Database storage with metadata

#### Request

```http
POST /api/crawling/full-crawl
Content-Type: application/json

{
  "websiteUrl": "https://docs.openai.com",
  "maxPages": 10,
  "maxDepth": 2,
  "description": "OpenAI API Documentation",
  "sessionMetadata": {
    "project": "knowledge-base",
    "version": "1.0"
  }
}
```

#### Request Parameters

| Parameter | Type | Required | Default | Range | Description |
|-----------|------|----------|---------|-------|-------------|
| `websiteUrl` | string | ✅ | - | - | Website URL to crawl |
| `maxPages` | number | ❌ | 10 | 1-100 | Maximum pages to crawl |
| `maxDepth` | number | ❌ | 1 | 1-5 | Crawling depth from root |
| `description` | string | ❌ | - | - | Website description |
| `sessionMetadata` | object | ❌ | {} | - | Additional session data |

#### Response

```json
{
  "success": true,
  "website": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "domain": "docs.openai.com",
    "baseUrl": "https://docs.openai.com",
    "title": "OpenAI Documentation",
    "status": "active",
    "totalPages": 10,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "session": {
    "id": "session-uuid-here",
    "websiteId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "maxPages": 10,
    "maxDepth": 2,
    "pagesDiscovered": 10,
    "pagesCompleted": 8,
    "startedAt": "2024-01-15T10:30:05Z",
    "completedAt": "2024-01-15T10:31:20Z"
  },
  "summary": {
    "pagesDiscovered": 10,
    "pagesProcessed": 8,
    "chunksCreated": 24,
    "embeddingsGenerated": 24,
    "processingTimeMs": 75000,
    "totalCost": 0.0048,
    "averageQuality": 72
  },
  "pages": [
    {
      "id": "page-uuid",
      "url": "https://docs.openai.com/api-reference/chat",
      "title": "Chat - OpenAI API",
      "status": "completed",
      "chunks": 3,
      "tokens": 1245,
      "quality": 85
    }
    // ... more pages
  ],
  "message": "Successfully processed 8 pages with 24 chunks and 24 embeddings"
}
```

#### Error Response

```json
{
  "success": false,
  "error": "Invalid URL format",
  "message": "Please provide a valid website URL (e.g., https://example.com)",
  "details": "URL parsing failed: Invalid protocol"
}
```

#### Status Codes

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `500` - Internal Server Error

---

## 📄 Manual Page Addition

### `POST /api/crawling/add-page`

Adds a specific page to a website and processes it through the complete pipeline.

**Use Cases:**
- Add important pages not found in sitemap
- Process specific documentation pages
- Include high-priority content
- Add API reference pages

#### Request

```http
POST /api/crawling/add-page
Content-Type: application/json

{
  "websiteUrl": "https://docs.openai.com",
  "pageUrl": "https://docs.openai.com/api-reference/chat",
  "title": "Chat API Reference",
  "description": "OpenAI Chat API documentation",
  "priority": 95
}
```

#### Request Parameters

| Parameter | Type | Required | Default | Range | Description |
|-----------|------|----------|---------|-------|-------------|
| `websiteUrl` | string | ✅ | - | - | Base website URL |
| `pageUrl` | string | ✅ | - | - | Specific page URL to process |
| `title` | string | ❌ | auto-detect | - | Page title |
| `description` | string | ❌ | - | - | Page description |
| `priority` | number | ❌ | 80 | 0-100 | Priority score |

#### Validation Rules

1. **Domain Match**: `pageUrl` domain must match `websiteUrl` domain
2. **URL Format**: Both URLs must be valid HTTP/HTTPS URLs  
3. **Priority Range**: Must be between 0 and 100

#### Response

```json
{
  "success": true,
  "website": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "domain": "docs.openai.com",
    "title": "OpenAI Documentation"
  },
  "session": {
    "id": "session-uuid",
    "type": "manual",
    "pagesDiscovered": 1,
    "pagesCompleted": 1
  },
  "summary": {
    "pagesDiscovered": 1,
    "pagesProcessed": 1,
    "chunksCreated": 3,
    "embeddingsGenerated": 3,
    "processingTimeMs": 5000,
    "totalCost": 0.0006,
    "averageQuality": 78
  },
  "pages": [
    {
      "id": "page-uuid",
      "url": "https://docs.openai.com/api-reference/chat",
      "title": "Chat API Reference",
      "priority": 95,
      "chunks": 3,
      "tokens": 892,
      "quality": 78
    }
  ],
  "message": "Successfully processed page with 3 chunks and 3 embeddings"
}
```

---

## 📡 Streaming Crawl Progress

### `GET /api/crawling/full-crawl-stream`

Real-time Server-Sent Events for crawling progress updates.

#### Request

```http
GET /api/crawling/full-crawl-stream?websiteUrl=https%3A//docs.openai.com&maxPages=10&maxDepth=2
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `websiteUrl` | string | ✅ | - | URL-encoded website URL |
| `maxPages` | number | ❌ | 10 | Maximum pages to crawl |
| `maxDepth` | number | ❌ | 1 | Crawling depth |

#### JavaScript Client Example

```javascript
const params = new URLSearchParams({
  websiteUrl: 'https://docs.openai.com',
  maxPages: '10',
  maxDepth: '2'
});

const eventSource = new EventSource(
  `/api/crawling/full-crawl-stream?${params}`
);

eventSource.onmessage = (event) => {
  const progress = JSON.parse(event.data);
  
  switch (progress.type) {
    case 'discovery':
      console.log(`🔍 Discovered ${progress.pagesFound} pages`);
      break;
      
    case 'processing':
      console.log(`⚙️ Processing: ${progress.current}/${progress.total}`);
      updateProgressBar(progress.current / progress.total * 100);
      break;
      
    case 'page-complete':
      console.log(`✅ Completed: ${progress.page.title}`);
      console.log(`📄 Chunks: ${progress.page.chunks}`);
      break;
      
    case 'complete':
      console.log(`🎉 Crawling complete!`);
      console.log(`📊 Summary: ${progress.summary}`);
      eventSource.close();
      break;
      
    case 'error':
      console.error(`❌ Error: ${progress.error}`);
      eventSource.close();
      break;
  }
};

eventSource.onerror = (error) => {
  console.error('EventSource failed:', error);
  eventSource.close();
};
```

#### Event Types

**Discovery Event:**
```json
{
  "type": "discovery",
  "pagesFound": 12,
  "timestamp": "2024-01-15T10:30:10Z"
}
```

**Processing Event:**
```json
{
  "type": "processing",
  "current": 3,
  "total": 10,
  "currentPage": {
    "url": "https://docs.openai.com/api-reference/chat",
    "title": "Chat API"
  },
  "timestamp": "2024-01-15T10:30:15Z"
}
```

**Page Complete Event:**
```json
{
  "type": "page-complete",
  "page": {
    "url": "https://docs.openai.com/api-reference/chat",
    "title": "Chat API Reference",
    "chunks": 3,
    "tokens": 892,
    "processingTime": 2500
  },
  "timestamp": "2024-01-15T10:30:20Z"
}
```

**Completion Event:**
```json
{
  "type": "complete",
  "summary": {
    "pagesProcessed": 8,
    "chunksCreated": 24,
    "totalCost": 0.0048,
    "processingTimeMs": 75000
  },
  "timestamp": "2024-01-15T10:31:20Z"
}
```

**Error Event:**
```json
{
  "type": "error",
  "error": "Failed to extract content",
  "page": "https://docs.openai.com/some-page",
  "timestamp": "2024-01-15T10:30:25Z"
}
```

---

## 🔍 Endpoint Discovery

### `GET /api/crawling/full-crawl`

Returns endpoint documentation and examples.

### `GET /api/crawling/add-page`

Returns endpoint documentation and examples.

#### Response Example

```json
{
  "endpoint": "/api/crawling/full-crawl",
  "method": "POST",
  "description": "Execute complete website crawling pipeline",
  "parameters": {
    "websiteUrl": {
      "type": "string",
      "required": true,
      "example": "https://docs.openai.com"
    }
  },
  "pipeline": [
    "1. Website Discovery - Find and prioritize pages",
    "2. Content Extraction - Extract clean text from HTML",
    "3. Text Chunking - Split content into 300-400 token chunks",
    "4. Vector Embedding - Generate 1536D embeddings using OpenAI",
    "5. Database Storage - Store chunks and vectors in PostgreSQL"
  ],
  "examples": {
    "basic": {
      "websiteUrl": "https://docs.openai.com",
      "maxPages": 5
    }
  }
}
```

---

## 📊 Response Schemas

### Website Object

```typescript
interface Website {
  id: string;
  domain: string;
  baseUrl: string;
  title: string;
  description?: string;
  status: 'active' | 'inactive';
  totalPages: number;
  lastCrawledAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
}
```

### CrawlSession Object

```typescript
interface CrawlSession {
  id: string;
  websiteId: string;
  maxPages: number;
  maxDepth: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  pagesDiscovered: number;
  pagesCompleted: number;
  chunksCreated: number;
  startedAt?: string;
  completedAt?: string;
  metadata: Record<string, any>;
  createdAt: string;
}
```

### ProcessingSummary Object

```typescript
interface ProcessingSummary {
  pagesDiscovered: number;
  pagesProcessed: number;
  chunksCreated: number;
  embeddingsGenerated: number;
  processingTimeMs: number;
  totalCost: number;        // USD
  averageQuality: number;   // 0-100
}
```

### Page Object

```typescript
interface PageSummary {
  id: string;
  url: string;
  title: string;
  status: 'completed' | 'failed';
  chunks?: number;
  tokens?: number;
  quality?: number;
  error?: string;
}
```

---

## ⚠️ Error Handling

### Common Error Codes

| Status | Error Type | Description | Solution |
|--------|------------|-------------|----------|
| 400 | `missing_parameter` | Required parameter missing | Check request body |
| 400 | `invalid_url` | Invalid URL format | Use valid HTTP/HTTPS URLs |
| 400 | `domain_mismatch` | Page domain ≠ website domain | Ensure URLs match |
| 400 | `invalid_range` | Parameter out of range | Check parameter limits |
| 500 | `crawling_failed` | Crawling process failed | Check website accessibility |
| 500 | `extraction_failed` | Content extraction failed | Check page content |
| 500 | `embedding_failed` | OpenAI API error | Check API key and quota |

### Error Response Format

```json
{
  "success": false,
  "error": "error_code",
  "message": "Human-readable error message",
  "details": "Additional error details (development only)",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 🧪 Testing with cURL

### Full Crawl Example

```bash
curl -X POST http://localhost:3000/api/crawling/full-crawl \
  -H "Content-Type: application/json" \
  -d '{
    "websiteUrl": "https://docs.openai.com",
    "maxPages": 5,
    "maxDepth": 1,
    "description": "OpenAI Documentation"
  }'
```

### Add Page Example

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

### Stream Events Example

```bash
curl -N http://localhost:3000/api/crawling/full-crawl-stream \
  -G \
  -d websiteUrl=https://docs.openai.com \
  -d maxPages=5 \
  -d maxDepth=1
```

---

## 📈 Rate Limits & Performance

### Current Limits

- **No rate limiting** - Implement in production
- **Max pages per request**: 100
- **Max depth**: 5 levels
- **Request timeout**: 30 seconds per page
- **OpenAI API**: Subject to your API limits

### Performance Considerations

1. **Embedding costs**: ~$0.0002 per chunk (1,000 tokens)
2. **Processing time**: ~2-5 seconds per page
3. **Concurrent requests**: Limited by database connections
4. **Memory usage**: ~50MB per 1000 chunks

### Optimization Tips

1. **Start small**: Test with `maxPages: 5` first
2. **Monitor costs**: Check `totalCost` in responses
3. **Use streaming**: For real-time progress updates
4. **Batch processing**: Process multiple pages at once
5. **Cache results**: Avoid re-crawling unchanged content

---

For more examples and integration guides, see the [Complete Crawling Guide](CRAWLING_COMPLETE_GUIDE.md).
