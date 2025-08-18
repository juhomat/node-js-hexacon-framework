/**
 * PostgreSQL Page Repository Implementation
 * 
 * Implements the PageRepository interface using PostgreSQL as the data store.
 */

import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Page, CreatePageRequest, PageWithWebsite, PriorityPageQueue, createPage } from '../../domain/entities/Page';
import { PageRepository, PageListOptions, PageContentUpdate } from '../../domain/repositories/PageRepository';

export class PostgreSQLPageRepository implements PageRepository {
  constructor(private pool: Pool) {}

  async create(request: CreatePageRequest): Promise<Page> {
    const pageData = createPage(request);
    const id = uuidv4();

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO pages (
          id, website_id, crawl_session_id, url, title, content, raw_html,
          depth_level, token_count, status, priority, discovery_method,
          error_message, crawled_at, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
        RETURNING *`,
        [
          id,
          pageData.websiteId,
          pageData.crawlSessionId,
          pageData.url,
          pageData.title,
          pageData.content,
          pageData.rawHtml,
          pageData.depthLevel,
          pageData.tokenCount,
          pageData.status,
          pageData.priority,
          pageData.discoveryMethod,
          pageData.errorMessage,
          pageData.crawledAt,
          JSON.stringify(pageData.metadata)
        ]
      );

      return this.mapRowToPage(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async createBatch(requests: CreatePageRequest[]): Promise<Page[]> {
    if (requests.length === 0) return [];

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const pages: Page[] = [];
      
      // Process in batches of 50 for better performance
      const batchSize = 50;
      for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        
        // Build VALUES clause for batch insert
        const values: any[] = [];
        const valueStrings: string[] = [];
        let paramIndex = 1;

        for (const request of batch) {
          const pageData = createPage(request);
          const id = uuidv4();

          valueStrings.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, NOW())`);
          
          values.push(
            id,
            pageData.websiteId,
            pageData.crawlSessionId,
            pageData.url,
            pageData.title,
            pageData.content,
            pageData.rawHtml,
            pageData.depthLevel,
            pageData.tokenCount,
            pageData.status,
            pageData.priority,
            pageData.discoveryMethod,
            pageData.errorMessage,
            pageData.crawledAt,
            JSON.stringify(pageData.metadata)
          );
        }

        const query = `
          INSERT INTO pages (
            id, website_id, crawl_session_id, url, title, content, raw_html,
            depth_level, token_count, status, priority, discovery_method,
            error_message, crawled_at, metadata, created_at
          ) VALUES ${valueStrings.join(', ')}
          RETURNING *
        `;

        const result = await client.query(query, values);
        const batchPages = result.rows.map(row => this.mapRowToPage(row));
        pages.push(...batchPages);
      }

      await client.query('COMMIT');
      return pages;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<Page | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM pages WHERE id = $1',
        [id]
      );

      return result.rows.length > 0 ? this.mapRowToPage(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async findByUrl(url: string): Promise<Page | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM pages WHERE url = $1',
        [url]
      );

      return result.rows.length > 0 ? this.mapRowToPage(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async findByUrlInSession(url: string, crawlSessionId: string): Promise<Page | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM pages WHERE url = $1 AND crawl_session_id = $2',
        [url, crawlSessionId]
      );

      return result.rows.length > 0 ? this.mapRowToPage(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async update(id: string, updates: Partial<Page>): Promise<Page> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic UPDATE query
    if (updates.title !== undefined) {
      setClause.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.content !== undefined) {
      setClause.push(`content = $${paramIndex++}`);
      values.push(updates.content);
    }
    if (updates.rawHtml !== undefined) {
      setClause.push(`raw_html = $${paramIndex++}`);
      values.push(updates.rawHtml);
    }
    if (updates.status !== undefined) {
      setClause.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.priority !== undefined) {
      setClause.push(`priority = $${paramIndex++}`);
      values.push(updates.priority);
    }
    if (updates.tokenCount !== undefined) {
      setClause.push(`token_count = $${paramIndex++}`);
      values.push(updates.tokenCount);
    }
    if (updates.errorMessage !== undefined) {
      setClause.push(`error_message = $${paramIndex++}`);
      values.push(updates.errorMessage);
    }
    if (updates.crawledAt !== undefined) {
      setClause.push(`crawled_at = $${paramIndex++}`);
      values.push(updates.crawledAt);
    }
    if (updates.metadata !== undefined) {
      setClause.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `UPDATE pages SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error(`Page with id '${id}' not found`);
      }

      return this.mapRowToPage(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM pages WHERE id = $1',
        [id]
      );

      if (result.rowCount === 0) {
        throw new Error(`Page with id '${id}' not found`);
      }
    } finally {
      client.release();
    }
  }

  async findByWebsiteId(websiteId: string, options: PageListOptions = {}): Promise<Page[]> {
    return this.findPages({ ...options, websiteId });
  }

  async findByCrawlSessionId(crawlSessionId: string, options: PageListOptions = {}): Promise<Page[]> {
    return this.findPages({ ...options, crawlSessionId });
  }

  async findByStatus(status: string, options: PageListOptions = {}): Promise<Page[]> {
    return this.findPages({ ...options, status });
  }

  private async findPages(options: PageListOptions & { websiteId?: string; crawlSessionId?: string }): Promise<Page[]> {
    const {
      websiteId,
      crawlSessionId,
      status,
      depthLevel,
      minPriority,
      maxPriority,
      limit = 50,
      offset = 0,
      orderBy = 'priority',
      orderDirection = 'desc'
    } = options;

    let query = 'SELECT * FROM pages WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    // Add filters
    if (websiteId) {
      query += ` AND website_id = $${paramIndex++}`;
      values.push(websiteId);
    }

    if (crawlSessionId) {
      query += ` AND crawl_session_id = $${paramIndex++}`;
      values.push(crawlSessionId);
    }

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(status);
    }

    if (depthLevel !== undefined) {
      query += ` AND depth_level = $${paramIndex++}`;
      values.push(depthLevel);
    }

    if (minPriority !== undefined) {
      query += ` AND priority >= $${paramIndex++}`;
      values.push(minPriority);
    }

    if (maxPriority !== undefined) {
      query += ` AND priority <= $${paramIndex++}`;
      values.push(maxPriority);
    }

    // Add ordering
    query += ` ORDER BY ${orderBy} ${orderDirection.toUpperCase()}`;

    // Add pagination
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    values.push(limit, offset);

    const client = await this.pool.connect();
    try {
      const result = await client.query(query, values);
      return result.rows.map(row => this.mapRowToPage(row));
    } finally {
      client.release();
    }
  }

  async getPriorityQueue(crawlSessionId: string): Promise<PriorityPageQueue> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM pages WHERE crawl_session_id = $1 ORDER BY priority DESC',
        [crawlSessionId]
      );

      const pages = result.rows.map(row => this.mapRowToPage(row));
      
      return {
        pages,
        totalDiscovered: pages.length,
        highPriorityCount: pages.filter(p => p.priority >= 70).length,
        mediumPriorityCount: pages.filter(p => p.priority >= 40 && p.priority < 70).length,
        lowPriorityCount: pages.filter(p => p.priority < 40).length
      };
    } finally {
      client.release();
    }
  }

  async getNextForProcessing(crawlSessionId: string, limit: number): Promise<Page[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM pages 
         WHERE crawl_session_id = $1 AND status = 'discovered'
         ORDER BY priority DESC, depth_level ASC
         LIMIT $2`,
        [crawlSessionId, limit]
      );

      return result.rows.map(row => this.mapRowToPage(row));
    } finally {
      client.release();
    }
  }

  async updateStatus(id: string, status: string, metadata?: Record<string, any>): Promise<void> {
    const updates: Partial<Page> = { status };
    if (metadata) {
      updates.metadata = metadata;
    }
    await this.update(id, updates);
  }

  async updateContent(id: string, content: PageContentUpdate): Promise<Page> {
    return await this.update(id, content);
  }

  async countByWebsiteAndStatus(websiteId: string, status?: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      let query = 'SELECT COUNT(*) FROM pages WHERE website_id = $1';
      const values = [websiteId];

      if (status) {
        query += ' AND status = $2';
        values.push(status);
      }

      const result = await client.query(query, values);
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  async countByCrawlSessionAndStatus(crawlSessionId: string, status?: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      let query = 'SELECT COUNT(*) FROM pages WHERE crawl_session_id = $1';
      const values = [crawlSessionId];

      if (status) {
        query += ' AND status = $2';
        values.push(status);
      }

      const result = await client.query(query, values);
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  async existsInSession(url: string, crawlSessionId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT 1 FROM pages WHERE url = $1 AND crawl_session_id = $2 LIMIT 1',
        [url, crawlSessionId]
      );

      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  async findWithWebsite(options: PageListOptions): Promise<PageWithWebsite[]> {
    const {
      status,
      depthLevel,
      minPriority,
      maxPriority,
      limit = 50,
      offset = 0,
      orderBy = 'priority',
      orderDirection = 'desc'
    } = options;

    let query = `
      SELECT p.*, w.domain, w.title as website_title, w.base_url as website_base_url
      FROM pages p
      JOIN websites w ON p.website_id = w.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    // Add filters
    if (status) {
      query += ` AND p.status = $${paramIndex++}`;
      values.push(status);
    }

    if (depthLevel !== undefined) {
      query += ` AND p.depth_level = $${paramIndex++}`;
      values.push(depthLevel);
    }

    if (minPriority !== undefined) {
      query += ` AND p.priority >= $${paramIndex++}`;
      values.push(minPriority);
    }

    if (maxPriority !== undefined) {
      query += ` AND p.priority <= $${paramIndex++}`;
      values.push(maxPriority);
    }

    // Add ordering
    query += ` ORDER BY p.${orderBy} ${orderDirection.toUpperCase()}`;

    // Add pagination
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    values.push(limit, offset);

    const client = await this.pool.connect();
    try {
      const result = await client.query(query, values);
      return result.rows.map(row => ({
        ...this.mapRowToPage(row),
        website: {
          domain: row.domain,
          title: row.website_title,
          baseUrl: row.website_base_url
        }
      }));
    } finally {
      client.release();
    }
  }

  async deleteByCrawlSession(crawlSessionId: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM pages WHERE crawl_session_id = $1',
        [crawlSessionId]
      );

      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  private mapRowToPage(row: any): Page {
    return {
      id: row.id,
      websiteId: row.website_id,
      crawlSessionId: row.crawl_session_id,
      url: row.url,
      title: row.title,
      content: row.content,
      rawHtml: row.raw_html,
      depthLevel: row.depth_level,
      tokenCount: row.token_count,
      status: row.status,
      priority: row.priority,
      discoveryMethod: row.discovery_method,
      errorMessage: row.error_message,
      crawledAt: row.crawled_at,
      metadata: row.metadata || {},
      createdAt: row.created_at
    };
  }
}
