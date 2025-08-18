-- ================================
-- CRAWLING & RAG SYSTEM SCHEMA
-- ================================
-- This extends the base AI Framework schema with crawling and vector capabilities

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================
-- CRAWLING TABLES
-- ================================

-- 1. WEBSITES - Distinct websites that can be crawled
CREATE TABLE IF NOT EXISTS websites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain VARCHAR(255) NOT NULL UNIQUE,          -- "example.com", "docs.openai.com"
    base_url VARCHAR(2048) NOT NULL,              -- "https://example.com"
    title VARCHAR(512),                           -- "OpenAI Documentation", "Company Blog"
    description TEXT,                             -- Optional description of the site
    status VARCHAR(20) DEFAULT 'active',          -- active, inactive
    total_pages INTEGER DEFAULT 0,               -- Total pages ever crawled
    last_crawled_at TIMESTAMP,                    -- Last successful crawl
    metadata JSONB DEFAULT '{}',                  -- robots.txt info, site-specific settings
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. CRAWL_SESSIONS - Individual crawling sessions (real-time)
CREATE TABLE IF NOT EXISTS crawl_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    max_pages INTEGER DEFAULT 10,                -- User-specified limit
    max_depth INTEGER DEFAULT 1,                 -- User-specified depth
    status VARCHAR(20) DEFAULT 'pending',        -- pending, running, completed, failed, cancelled
    pages_discovered INTEGER DEFAULT 0,          -- Pages found during discovery
    pages_completed INTEGER DEFAULT 0,           -- Pages successfully processed (content extracted)
    chunks_created INTEGER DEFAULT 0,            -- Total chunks generated
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',                  -- Session-specific settings, user_id, etc.
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. PAGES - Individual web pages discovered and crawled
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    crawl_session_id UUID NOT NULL REFERENCES crawl_sessions(id) ON DELETE CASCADE,
    url VARCHAR(2048) NOT NULL,                   -- Full page URL
    title VARCHAR(512),                           -- Page title from <title> tag
    content TEXT,                                 -- Extracted clean text content
    raw_html TEXT,                                -- Full HTML content of the page
    depth_level INTEGER NOT NULL,                -- 0=root page, 1=one level deep, etc.
    token_count INTEGER,                          -- Approximate token count
    status VARCHAR(20) DEFAULT 'discovered',     -- discovered, completed, failed
    priority INTEGER DEFAULT 50,                 -- Priority score 0-100
    discovery_method VARCHAR(20) DEFAULT 'crawling', -- sitemap, crawling, manual
    error_message TEXT,                           -- If status = failed
    crawled_at TIMESTAMP,                         -- When content was extracted
    metadata JSONB DEFAULT '{}',                  -- HTTP headers, content-type, language, etc.
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure same URL isn't crawled multiple times in same session
    UNIQUE(crawl_session_id, url)
);

-- 4. CHUNKS - Text chunks with embeddings for RAG
CREATE TABLE IF NOT EXISTS chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    content TEXT NOT NULL,                        -- Chunk text content
    chunk_index INTEGER NOT NULL,                -- Position within the page (0, 1, 2...)
    token_count INTEGER,                          -- Tokens in this chunk
    start_position INTEGER,                       -- Character position in original content
    end_position INTEGER,                         -- Character position in original content
    embedding vector(1536),                       -- OpenAI embedding vector
    embedding_model VARCHAR(50) DEFAULT 'text-embedding-3-small',
    metadata JSONB DEFAULT '{}',                  -- Chunking strategy, overlap info, etc.
    created_at TIMESTAMP DEFAULT NOW()
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================

-- Websites
CREATE INDEX IF NOT EXISTS idx_websites_domain ON websites(domain);
CREATE INDEX IF NOT EXISTS idx_websites_status ON websites(status);
CREATE INDEX IF NOT EXISTS idx_websites_last_crawled ON websites(last_crawled_at DESC);

-- Crawl Sessions
CREATE INDEX IF NOT EXISTS idx_crawl_sessions_website ON crawl_sessions(website_id);
CREATE INDEX IF NOT EXISTS idx_crawl_sessions_status ON crawl_sessions(status);
CREATE INDEX IF NOT EXISTS idx_crawl_sessions_created ON crawl_sessions(created_at DESC);

-- Pages
CREATE INDEX IF NOT EXISTS idx_pages_website ON pages(website_id);
CREATE INDEX IF NOT EXISTS idx_pages_session ON pages(crawl_session_id);
CREATE INDEX IF NOT EXISTS idx_pages_url ON pages(url);
CREATE INDEX IF NOT EXISTS idx_pages_depth ON pages(depth_level);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);

-- Chunks (Critical for RAG performance)
CREATE INDEX IF NOT EXISTS idx_chunks_page ON chunks(page_id);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_cosine ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_l2 ON chunks USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_chunks_website_lookup ON chunks(page_id) INCLUDE (content, chunk_index);

-- ================================
-- TRIGGERS FOR AUTO-UPDATES
-- ================================

-- Update crawl session statistics
CREATE OR REPLACE FUNCTION update_crawl_session_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update session statistics when pages are added
    UPDATE crawl_sessions SET
        pages_discovered = (
            SELECT COUNT(*) FROM pages 
            WHERE crawl_session_id = NEW.crawl_session_id
        ),
        pages_completed = (
            SELECT COUNT(*) FROM pages 
            WHERE crawl_session_id = NEW.crawl_session_id AND status = 'completed'
        ),
        chunks_created = (
            SELECT COUNT(*) FROM chunks c
            JOIN pages p ON c.page_id = p.id
            WHERE p.crawl_session_id = NEW.crawl_session_id
        )
    WHERE id = NEW.crawl_session_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_crawl_session_stats ON pages;
CREATE TRIGGER trigger_update_crawl_session_stats
    AFTER INSERT OR UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION update_crawl_session_stats();

-- Update website statistics
CREATE OR REPLACE FUNCTION update_website_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update website total pages and last crawled time
    UPDATE websites SET
        total_pages = (
            SELECT COUNT(*) FROM pages 
            WHERE website_id = NEW.website_id AND status = 'completed'
        ),
        last_crawled_at = (
            SELECT MAX(crawled_at) FROM pages
            WHERE website_id = NEW.website_id AND status = 'completed'
        ),
        updated_at = NOW()
    WHERE id = NEW.website_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_website_stats ON pages;
CREATE TRIGGER trigger_update_website_stats
    AFTER INSERT OR UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION update_website_stats();

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_websites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_websites_updated_at ON websites;
CREATE TRIGGER trigger_websites_updated_at
    BEFORE UPDATE ON websites
    FOR EACH ROW
    EXECUTE FUNCTION update_websites_updated_at();

-- ================================
-- SAMPLE DATA FOR TESTING
-- ================================

-- Example website
-- INSERT INTO websites (domain, base_url, title, description) VALUES 
-- ('example.com', 'https://example.com', 'Example Website', 'Sample website for testing crawling functionality');

-- Example crawl session
-- INSERT INTO crawl_sessions (website_id, max_pages, max_depth, status) VALUES 
-- ((SELECT id FROM websites WHERE domain = 'example.com'), 5, 1, 'completed');
