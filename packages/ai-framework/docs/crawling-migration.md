# 🔄 Crawling System Migration Guide

This guide helps existing AI Framework projects add crawling and RAG capabilities.

## 🎯 For Existing Projects

If you're already using the AI Framework and want to add crawling capabilities:

### 1. Update Database Schema

**Option A: Automatic Migration (Recommended)**
```bash
# From your project's ai-framework directory
cd packages/ai-framework
npm run setup-crawling-schema
```

**Option B: Manual Migration**
```bash
# Run only the crawling schema (preserves existing data)
psql $DATABASE_URL -f packages/ai-framework/src/infrastructure/database/crawling-schema.sql
```

### 2. Install Vector Extension

Ensure pgvector is installed:
```sql
-- Connect to your database and run:
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Update Environment Variables

Add crawling configuration to your `.env`:
```env
# Add these to existing .env file
CRAWLING_MAX_PAGES=10      # Default pages per crawl session  
CRAWLING_MAX_DEPTH=1       # Default crawling depth
CRAWLING_DELAY_MS=1000     # Delay between requests (be respectful)
```

### 4. Verify Setup

Run the verification script:
```bash
# This checks that all tables and indexes are properly created
npm run setup-crawling-schema
```

Expected output:
```
✅ Database connection successful
✅ Base schema found: chats, messages  
✅ Crawling schema created successfully
📋 Schema verification:
   ✅ websites
   ✅ crawl_sessions  
   ✅ pages
   ✅ chunks
   ✅ pgvector extension
```

## 🚀 Integration Examples

### Adding to Existing Application Service

```typescript
// In your existing application setup
import { 
  CrawlingApplication,
  PostgreSQLWebsiteRepository,
  PostgreSQLPageRepository,
  PostgreSQLChunkRepository 
} from 'ai-framework';

// Add to your existing service initialization
const websiteRepository = new PostgreSQLWebsiteRepository(dbPool);
const pageRepository = new PostgreSQLPageRepository(dbPool);  
const chunkRepository = new PostgreSQLChunkRepository(dbPool);

const crawlingApp = new CrawlingApplication(
  websiteRepository,
  pageRepository, 
  chunkRepository,
  scrapingService,
  embeddingService
);

// Now you can use crawling alongside existing chat features
```

### Adding to Existing Admin Interface

```typescript
// Add crawling routes to your existing API
app.post('/api/crawl/start', async (req, res) => {
  const { url, maxPages, maxDepth } = req.body;
  
  // Stream crawling progress
  for await (const progress of crawlingApp.crawlWebsite({
    url, maxPages, maxDepth
  })) {
    // Send progress updates to client
    res.write(`data: ${JSON.stringify(progress)}\n\n`);
  }
  
  res.end();
});
```

## 🔧 Backwards Compatibility

The crawling system is designed to be **fully backwards compatible**:

- ✅ **Existing chat functionality** continues to work unchanged
- ✅ **Database migrations** are additive (no changes to existing tables)  
- ✅ **API endpoints** remain the same
- ✅ **Configuration** is optional (defaults provided)

## 📊 Data Migration

### No Data Loss

The migration process:
- **Preserves** all existing chat and message data
- **Adds** new tables for crawling functionality
- **Maintains** existing indexes and triggers
- **Does not modify** existing table structures

### Verification Queries

After migration, verify your data:

```sql
-- Check existing data is intact
SELECT COUNT(*) FROM chats;    -- Should match pre-migration count
SELECT COUNT(*) FROM messages; -- Should match pre-migration count

-- Check new tables exist
SELECT COUNT(*) FROM websites;      -- Should be 0 initially
SELECT COUNT(*) FROM crawl_sessions; -- Should be 0 initially  
SELECT COUNT(*) FROM pages;         -- Should be 0 initially
SELECT COUNT(*) FROM chunks;        -- Should be 0 initially
```

## 🎛️ Admin Interface Integration

If you're using the framework's admin interface, crawling features will be automatically available:

- **Website Management** - Register and manage crawl targets
- **Real-time Crawling** - Start crawl sessions with live progress  
- **Vector Search Testing** - Test RAG queries against crawled content
- **Performance Monitoring** - Track crawling statistics and costs

## ⚠️ Migration Considerations

### Database Size

Crawling can significantly increase database size:
- **Raw HTML**: Full page content stored in `pages.raw_html`
- **Text Content**: Extracted text in `pages.content`  
- **Vector Embeddings**: 1536-dimension vectors in `chunks.embedding`

**Estimate**: ~50KB per page crawled (varies by content length)

### Performance Impact

- **Vector indexes** may take time to build on large datasets
- **Embedding generation** requires OpenAI API calls (costs money)
- **Crawling** should respect rate limits and robots.txt

### Resource Requirements

- **PostgreSQL 14+** with pgvector extension
- **Sufficient disk space** for content and vectors
- **OpenAI API quota** for embedding generation

## 🆘 Troubleshooting Migration

### "Extension 'vector' not found"

```bash
# Install pgvector extension
# On Ubuntu/Debian:
sudo apt install postgresql-14-pgvector

# On macOS with Homebrew:
brew install pgvector

# Then in PostgreSQL:
CREATE EXTENSION vector;
```

### "Permission denied" errors

Ensure your database user has sufficient privileges:
```sql
-- Grant necessary permissions
GRANT CREATE ON DATABASE your_database TO your_user;
GRANT USAGE ON SCHEMA public TO your_user;
GRANT CREATE ON SCHEMA public TO your_user;
```

### Schema conflicts

If you have custom modifications to the framework schema:
1. **Backup your database** before migration
2. **Review the crawling schema** for potential conflicts
3. **Test migration** on a copy of your database first
4. **Contact support** if you encounter issues

## 📞 Support

If you encounter issues during migration:

1. **Check the troubleshooting section** in the main documentation
2. **Review error logs** from the migration script
3. **Test on a database copy** before applying to production
4. **Open an issue** with migration logs and error details

The migration is designed to be safe and reversible, but always backup your data first!

---

**Next Steps**: After successful migration, see the [Crawling System Documentation](crawling-system.md) for usage examples and API reference.
