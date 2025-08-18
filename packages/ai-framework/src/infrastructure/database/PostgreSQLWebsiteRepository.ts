/**
 * PostgreSQL Website Repository Implementation
 * 
 * Implements the WebsiteRepository interface using PostgreSQL as the data store.
 */

import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Website, CreateWebsiteRequest, WebsiteWithStats, createWebsite, WebsiteUtils } from '../../domain/entities/Website';
import { WebsiteRepository, WebsiteListOptions, WebsiteStatsUpdate } from '../../domain/repositories/WebsiteRepository';

export class PostgreSQLWebsiteRepository implements WebsiteRepository {
  constructor(private pool: Pool) {}

  async create(request: CreateWebsiteRequest): Promise<Website> {
    // Validate and normalize URL
    if (!WebsiteUtils.isValidWebsiteUrl(request.baseUrl)) {
      throw new Error(`Invalid website URL: ${request.baseUrl}`);
    }

    const normalizedUrl = WebsiteUtils.normalizeUrl(request.baseUrl);
    const domain = WebsiteUtils.extractDomain(normalizedUrl);

    // Check if website already exists
    const existing = await this.findByDomain(domain);
    if (existing) {
      throw new Error(`Website with domain '${domain}' already exists`);
    }

    const websiteData = createWebsite({
      ...request,
      baseUrl: normalizedUrl
    });

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO websites (
          id, domain, base_url, title, description, status, 
          total_pages, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *`,
        [
          uuidv4(),
          websiteData.domain,
          websiteData.baseUrl,
          websiteData.title,
          websiteData.description,
          websiteData.status,
          websiteData.totalPages,
          JSON.stringify(websiteData.metadata)
        ]
      );

      return this.mapRowToWebsite(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<Website | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM websites WHERE id = $1',
        [id]
      );

      return result.rows.length > 0 ? this.mapRowToWebsite(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async findByDomain(domain: string): Promise<Website | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM websites WHERE domain = $1',
        [domain]
      );

      return result.rows.length > 0 ? this.mapRowToWebsite(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async findByBaseUrl(baseUrl: string): Promise<Website | null> {
    const normalizedUrl = WebsiteUtils.normalizeUrl(baseUrl);
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM websites WHERE base_url = $1',
        [normalizedUrl]
      );

      return result.rows.length > 0 ? this.mapRowToWebsite(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async update(id: string, updates: Partial<Website>): Promise<Website> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic UPDATE query
    if (updates.title !== undefined) {
      setClause.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      setClause.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.status !== undefined) {
      setClause.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.totalPages !== undefined) {
      setClause.push(`total_pages = $${paramIndex++}`);
      values.push(updates.totalPages);
    }
    if (updates.lastCrawledAt !== undefined) {
      setClause.push(`last_crawled_at = $${paramIndex++}`);
      values.push(updates.lastCrawledAt);
    }
    if (updates.metadata !== undefined) {
      setClause.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    setClause.push(`updated_at = NOW()`);
    values.push(id);

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `UPDATE websites SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error(`Website with id '${id}' not found`);
      }

      return this.mapRowToWebsite(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Delete website (cascading deletes will handle related data)
      const result = await client.query(
        'DELETE FROM websites WHERE id = $1',
        [id]
      );

      if (result.rowCount === 0) {
        throw new Error(`Website with id '${id}' not found`);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async list(options: WebsiteListOptions = {}): Promise<Website[]> {
    const {
      status,
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc',
      search
    } = options;

    let query = 'SELECT * FROM websites WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    // Add filters
    if (status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(status);
    }

    if (search) {
      query += ` AND (domain ILIKE $${paramIndex++} OR title ILIKE $${paramIndex++})`;
      values.push(`%${search}%`, `%${search}%`);
      paramIndex++;
    }

    // Add ordering
    query += ` ORDER BY ${orderBy} ${orderDirection.toUpperCase()}`;

    // Add pagination
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    values.push(limit, offset);

    const client = await this.pool.connect();
    try {
      const result = await client.query(query, values);
      return result.rows.map(row => this.mapRowToWebsite(row));
    } finally {
      client.release();
    }
  }

  async getWithStats(id: string): Promise<WebsiteWithStats | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          w.*,
          COUNT(DISTINCT cs.id) as total_crawl_sessions,
          COUNT(DISTINCT CASE WHEN cs.status IN ('discovering', 'extracting', 'processing') THEN cs.id END) as active_crawl_sessions,
          AVG(p.metadata->>'qualityScore')::float as average_page_quality,
          MAX(cs.status) as last_crawl_status
        FROM websites w
        LEFT JOIN crawl_sessions cs ON w.id = cs.website_id
        LEFT JOIN pages p ON cs.id = p.crawl_session_id AND p.status = 'completed'
        WHERE w.id = $1
        GROUP BY w.id`,
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const website = this.mapRowToWebsite(row);

      return {
        ...website,
        activeCrawlSessions: parseInt(row.active_crawl_sessions) || 0,
        totalCrawlSessions: parseInt(row.total_crawl_sessions) || 0,
        averagePageQuality: row.average_page_quality || undefined,
        lastCrawlStatus: row.last_crawl_status || undefined
      };
    } finally {
      client.release();
    }
  }

  async updateStats(id: string, stats: WebsiteStatsUpdate): Promise<void> {
    await this.update(id, stats);
  }

  async existsByDomain(domain: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT 1 FROM websites WHERE domain = $1 LIMIT 1',
        [domain]
      );

      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  private mapRowToWebsite(row: any): Website {
    return {
      id: row.id,
      domain: row.domain,
      baseUrl: row.base_url,
      title: row.title,
      description: row.description,
      status: row.status,
      totalPages: row.total_pages,
      lastCrawledAt: row.last_crawled_at,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
