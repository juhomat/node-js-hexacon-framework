/**
 * PostgreSQL CrawlSession Repository Implementation
 * 
 * Implements the CrawlSessionRepository interface using PostgreSQL as the data store.
 */

import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { CrawlSession, CreateCrawlSessionRequest, CrawlSessionProgress, createCrawlSession } from '../../domain/entities/CrawlSession';
import { CrawlSessionRepository, CrawlSessionListOptions, CrawlSessionStatsUpdate, CrawlSessionStats } from '../../domain/repositories/CrawlSessionRepository';

export class PostgreSQLCrawlSessionRepository implements CrawlSessionRepository {
  constructor(private pool: Pool) {}

  async create(request: CreateCrawlSessionRequest): Promise<CrawlSession> {
    const sessionData = createCrawlSession(request);
    const id = uuidv4();

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO crawl_sessions (
          id, website_id, max_pages, max_depth, status,
          pages_discovered, pages_completed, chunks_created,
          started_at, completed_at, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING *`,
        [
          id,
          sessionData.websiteId,
          sessionData.maxPages,
          sessionData.maxDepth,
          sessionData.status,
          sessionData.pagesDiscovered,
          sessionData.pagesCompleted,
          sessionData.chunksCreated,
          sessionData.startedAt,
          sessionData.completedAt,
          JSON.stringify(sessionData.metadata)
        ]
      );

      return this.mapRowToCrawlSession(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<CrawlSession | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM crawl_sessions WHERE id = $1',
        [id]
      );

      return result.rows.length > 0 ? this.mapRowToCrawlSession(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async update(id: string, updates: Partial<CrawlSession>): Promise<CrawlSession> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic UPDATE query
    if (updates.maxPages !== undefined) {
      setClause.push(`max_pages = $${paramIndex++}`);
      values.push(updates.maxPages);
    }
    if (updates.maxDepth !== undefined) {
      setClause.push(`max_depth = $${paramIndex++}`);
      values.push(updates.maxDepth);
    }
    if (updates.status !== undefined) {
      setClause.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.pagesDiscovered !== undefined) {
      setClause.push(`pages_discovered = $${paramIndex++}`);
      values.push(updates.pagesDiscovered);
    }
    if (updates.pagesCompleted !== undefined) {
      setClause.push(`pages_completed = $${paramIndex++}`);
      values.push(updates.pagesCompleted);
    }
    if (updates.chunksCreated !== undefined) {
      setClause.push(`chunks_created = $${paramIndex++}`);
      values.push(updates.chunksCreated);
    }
    if (updates.startedAt !== undefined) {
      setClause.push(`started_at = $${paramIndex++}`);
      values.push(updates.startedAt);
    }
    if (updates.completedAt !== undefined) {
      setClause.push(`completed_at = $${paramIndex++}`);
      values.push(updates.completedAt);
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
        `UPDATE crawl_sessions SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error(`CrawlSession with id '${id}' not found`);
      }

      return this.mapRowToCrawlSession(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Delete crawl session (cascading deletes will handle related data)
      const result = await client.query(
        'DELETE FROM crawl_sessions WHERE id = $1',
        [id]
      );

      if (result.rowCount === 0) {
        throw new Error(`CrawlSession with id '${id}' not found`);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findByWebsiteId(websiteId: string, options: CrawlSessionListOptions = {}): Promise<CrawlSession[]> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc',
      status
    } = options;

    let query = 'SELECT * FROM crawl_sessions WHERE website_id = $1';
    const values = [websiteId];
    let paramIndex = 2;

    // Add filters
    if (status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(status);
    }

    // Add ordering
    query += ` ORDER BY ${orderBy} ${orderDirection.toUpperCase()}`;

    // Add pagination
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    values.push(limit, offset);

    const client = await this.pool.connect();
    try {
      const result = await client.query(query, values);
      return result.rows.map(row => this.mapRowToCrawlSession(row));
    } finally {
      client.release();
    }
  }

  async findActive(): Promise<CrawlSession[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM crawl_sessions 
         WHERE status IN ('pending', 'discovering', 'extracting', 'processing')
         ORDER BY created_at DESC`
      );

      return result.rows.map(row => this.mapRowToCrawlSession(row));
    } finally {
      client.release();
    }
  }

  async getWithProgress(id: string): Promise<CrawlSessionProgress | null> {
    const session = await this.findById(id);
    if (!session) return null;

    // Calculate progress based on session status and stats
    const total = session.maxPages;
    const current = session.pagesCompleted;
    const percentage = total > 0 ? (current / total) * 100 : 0;

    return {
      session,
      currentPhase: this.getPhaseFromStatus(session.status),
      progress: {
        current,
        total,
        percentage
      },
      recentActivity: [], // Could be populated from logs/events
      estimatedTimeRemaining: this.estimateTimeRemaining(session)
    };
  }

  async updateStatus(id: string, status: string, metadata?: Record<string, any>): Promise<void> {
    const updates: Partial<CrawlSession> = { status };
    if (metadata) {
      const current = await this.findById(id);
      if (current) {
        updates.metadata = { ...current.metadata, ...metadata };
      }
    }
    await this.update(id, updates);
  }

  async updateStats(id: string, stats: CrawlSessionStatsUpdate): Promise<void> {
    await this.update(id, stats);
  }

  async getLatestForWebsite(websiteId: string): Promise<CrawlSession | null> {
    const sessions = await this.findByWebsiteId(websiteId, {
      limit: 1,
      orderBy: 'created_at',
      orderDirection: 'desc'
    });

    return sessions.length > 0 ? sessions[0] : null;
  }

  async getStats(id: string): Promise<CrawlSessionStats> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          cs.*,
          COUNT(p.id) as total_pages,
          COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_pages,
          COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_pages,
          COUNT(CASE WHEN p.status = 'skipped' THEN 1 END) as skipped_pages,
          COUNT(c.id) as total_chunks,
          AVG(CASE WHEN p.metadata->>'qualityScore' IS NOT NULL 
              THEN (p.metadata->>'qualityScore')::float END) as average_page_quality
        FROM crawl_sessions cs
        LEFT JOIN pages p ON cs.id = p.crawl_session_id
        LEFT JOIN chunks c ON p.id = c.page_id
        WHERE cs.id = $1
        GROUP BY cs.id`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error(`CrawlSession with id '${id}' not found`);
      }

      const row = result.rows[0];
      const processingTimeMs = row.completed_at && row.started_at
        ? new Date(row.completed_at).getTime() - new Date(row.started_at).getTime()
        : undefined;

      return {
        totalPages: parseInt(row.total_pages) || 0,
        completedPages: parseInt(row.completed_pages) || 0,
        failedPages: parseInt(row.failed_pages) || 0,
        skippedPages: parseInt(row.skipped_pages) || 0,
        totalChunks: parseInt(row.total_chunks) || 0,
        averagePageQuality: row.average_page_quality || undefined,
        processingTimeMs
      };
    } finally {
      client.release();
    }
  }

  async markCompleted(id: string, completionMetadata?: Record<string, any>): Promise<CrawlSession> {
    const updates: Partial<CrawlSession> = {
      status: 'completed',
      completedAt: new Date()
    };

    if (completionMetadata) {
      const current = await this.findById(id);
      if (current) {
        updates.metadata = { ...current.metadata, ...completionMetadata };
      }
    }

    return await this.update(id, updates);
  }

  async markFailed(id: string, error: string, metadata?: Record<string, any>): Promise<CrawlSession> {
    const updates: Partial<CrawlSession> = {
      status: 'failed',
      completedAt: new Date()
    };

    const current = await this.findById(id);
    if (current) {
      updates.metadata = {
        ...current.metadata,
        error,
        failedAt: new Date().toISOString(),
        ...metadata
      };
    }

    return await this.update(id, updates);
  }

  async findByStatus(status: string, options: CrawlSessionListOptions = {}): Promise<CrawlSession[]> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc'
    } = options;

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM crawl_sessions 
         WHERE status = $1
         ORDER BY ${orderBy} ${orderDirection.toUpperCase()}
         LIMIT $2 OFFSET $3`,
        [status, limit, offset]
      );

      return result.rows.map(row => this.mapRowToCrawlSession(row));
    } finally {
      client.release();
    }
  }

  private mapRowToCrawlSession(row: any): CrawlSession {
    return {
      id: row.id,
      websiteId: row.website_id,
      maxPages: row.max_pages,
      maxDepth: row.max_depth,
      status: row.status,
      pagesDiscovered: row.pages_discovered,
      pagesCompleted: row.pages_completed,
      chunksCreated: row.chunks_created,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      metadata: row.metadata || {},
      createdAt: row.created_at
    };
  }

  private getPhaseFromStatus(status: string): any {
    switch (status) {
      case 'discovering': return 'discovery';
      case 'extracting': return 'extraction';
      case 'processing': return 'processing';
      default: return 'discovery';
    }
  }

  private estimateTimeRemaining(session: CrawlSession): number | undefined {
    if (!session.startedAt || session.status === 'completed' || session.status === 'failed') {
      return undefined;
    }

    const elapsedMs = Date.now() - session.startedAt.getTime();
    const progress = session.maxPages > 0 ? session.pagesCompleted / session.maxPages : 0;

    if (progress <= 0) return undefined;

    const totalEstimatedMs = elapsedMs / progress;
    return totalEstimatedMs - elapsedMs;
  }
}
