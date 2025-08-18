/**
 * PostgreSQL Chunk Repository Implementation
 * 
 * Implements chunk storage with pgvector for similarity search.
 * Handles vector embeddings, batch operations, and RAG queries.
 */

import { Pool } from 'pg';
import { 
  Chunk, 
  CreateChunkRequest, 
  UpdateChunkRequest, 
  ChunkWithPage, 
  ChunkSearchResult,
  createChunk 
} from '../../domain/entities/Chunk';
import { 
  ChunkRepository, 
  ChunkListOptions, 
  SimilaritySearchOptions, 
  HybridSearchOptions,
  ChunkStatistics 
} from '../../domain/repositories/ChunkRepository';

export class PostgreSQLChunkRepository implements ChunkRepository {
  constructor(private pool: Pool) {}

  async create(request: CreateChunkRequest): Promise<Chunk> {
    const chunkData = createChunk(request);
    
    const query = `
      INSERT INTO chunks (
        page_id, content, chunk_index, token_count, 
        start_position, end_position, embedding, embedding_model, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, created_at
    `;

    const embeddingValue = chunkData.embedding ? JSON.stringify(chunkData.embedding) : null;

    const result = await this.pool.query(query, [
      chunkData.pageId,
      chunkData.content,
      chunkData.chunkIndex,
      chunkData.tokenCount,
      chunkData.startPosition,
      chunkData.endPosition,
      embeddingValue,
      chunkData.embeddingModel,
      JSON.stringify(chunkData.metadata)
    ]);

    const row = result.rows[0];

    return {
      id: row.id,
      ...chunkData,
      createdAt: row.created_at
    };
  }

  async createBatch(requests: CreateChunkRequest[]): Promise<Chunk[]> {
    if (requests.length === 0) return [];

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const chunks: Chunk[] = [];
      
      for (const request of requests) {
        const chunk = await this.createWithClient(client, request);
        chunks.push(chunk);
      }
      
      await client.query('COMMIT');
      return chunks;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async createWithClient(client: any, request: CreateChunkRequest): Promise<Chunk> {
    const chunkData = createChunk(request);
    
    const query = `
      INSERT INTO chunks (
        page_id, content, chunk_index, token_count, 
        start_position, end_position, embedding, embedding_model, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, created_at
    `;

    const embeddingValue = chunkData.embedding ? JSON.stringify(chunkData.embedding) : null;

    const result = await client.query(query, [
      chunkData.pageId,
      chunkData.content,
      chunkData.chunkIndex,
      chunkData.tokenCount,
      chunkData.startPosition,
      chunkData.endPosition,
      embeddingValue,
      chunkData.embeddingModel,
      JSON.stringify(chunkData.metadata)
    ]);

    const row = result.rows[0];

    return {
      id: row.id,
      ...chunkData,
      createdAt: row.created_at
    };
  }

  async findById(id: string): Promise<Chunk | null> {
    const query = `
      SELECT id, page_id, content, chunk_index, token_count, 
             start_position, end_position, embedding, embedding_model, 
             metadata, created_at
      FROM chunks 
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToChunk(result.rows[0]);
  }

  async update(id: string, updates: UpdateChunkRequest): Promise<Chunk> {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.content !== undefined) {
      setParts.push(`content = $${paramCount++}`);
      values.push(updates.content);
    }

    if (updates.embedding !== undefined) {
      setParts.push(`embedding = $${paramCount++}`);
      values.push(updates.embedding ? JSON.stringify(updates.embedding) : null);
    }

    if (updates.embeddingModel !== undefined) {
      setParts.push(`embedding_model = $${paramCount++}`);
      values.push(updates.embeddingModel);
    }

    if (updates.metadata !== undefined) {
      setParts.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (setParts.length === 0) {
      throw new Error('No updates provided');
    }

    values.push(id);

    const query = `
      UPDATE chunks 
      SET ${setParts.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, page_id, content, chunk_index, token_count, 
                start_position, end_position, embedding, embedding_model, 
                metadata, created_at
    `;

    const result = await this.pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error(`Chunk not found with ID: ${id}`);
    }

    return this.mapRowToChunk(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM chunks WHERE id = $1';
    await this.pool.query(query, [id]);
  }

  async findByPageId(pageId: string, options: ChunkListOptions = {}): Promise<Chunk[]> {
    const {
      limit = 100,
      offset = 0,
      orderBy = 'chunk_index',
      orderDirection = 'asc',
      hasEmbedding
    } = options;

    let query = `
      SELECT id, page_id, content, chunk_index, token_count, 
             start_position, end_position, embedding, embedding_model, 
             metadata, created_at
      FROM chunks 
      WHERE page_id = $1
    `;

    const values: any[] = [pageId];

    if (hasEmbedding !== undefined) {
      query += ` AND embedding IS ${hasEmbedding ? 'NOT NULL' : 'NULL'}`;
    }

    query += ` ORDER BY ${orderBy} ${orderDirection.toUpperCase()}`;
    query += ` LIMIT $2 OFFSET $3`;
    
    values.push(limit, offset);

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.mapRowToChunk(row));
  }

  async findByWebsiteId(websiteId: string, options: ChunkListOptions = {}): Promise<ChunkWithPage[]> {
    const {
      limit = 100,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc',
      hasEmbedding
    } = options;

    let query = `
      SELECT c.id, c.page_id, c.content, c.chunk_index, c.token_count, 
             c.start_position, c.end_position, c.embedding, c.embedding_model, 
             c.metadata, c.created_at,
             p.title as page_title, p.url as page_url, p.priority
      FROM chunks c
      JOIN pages p ON c.page_id = p.id
      WHERE p.website_id = $1
    `;

    const values: any[] = [websiteId];

    if (hasEmbedding !== undefined) {
      query += ` AND c.embedding IS ${hasEmbedding ? 'NOT NULL' : 'NULL'}`;
    }

    query += ` ORDER BY c.${orderBy} ${orderDirection.toUpperCase()}`;
    query += ` LIMIT $2 OFFSET $3`;
    
    values.push(limit, offset);

    const result = await this.pool.query(query, values);
    
    return result.rows.map(row => ({
      chunk: this.mapRowToChunk(row),
      pageTitle: row.page_title,
      pageUrl: row.page_url,
      websiteId: websiteId,
      priority: row.priority
    }));
  }

  async countByPageId(pageId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM chunks WHERE page_id = $1';
    const result = await this.pool.query(query, [pageId]);
    return parseInt(result.rows[0].count);
  }

  async countByWebsiteId(websiteId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count 
      FROM chunks c
      JOIN pages p ON c.page_id = p.id
      WHERE p.website_id = $1
    `;
    const result = await this.pool.query(query, [websiteId]);
    return parseInt(result.rows[0].count);
  }

  async searchSimilar(queryEmbedding: number[], options: SimilaritySearchOptions = {}): Promise<ChunkSearchResult[]> {
    const {
      limit = 20,
      threshold = 0.1,
      websiteIds,
      pageIds,
      excludeChunkIds
    } = options;

    let query = `
      SELECT c.id, c.page_id, c.content, c.chunk_index, c.token_count, 
             c.start_position, c.end_position, c.embedding, c.embedding_model, 
             c.metadata, c.created_at,
             p.title as page_title, p.url as page_url,
             1 - (c.embedding <=> $1::vector) as similarity
      FROM chunks c
      JOIN pages p ON c.page_id = p.id
      WHERE c.embedding IS NOT NULL
    `;

    const values: any[] = [JSON.stringify(queryEmbedding)];
    let paramCount = 2;

    if (websiteIds && websiteIds.length > 0) {
      query += ` AND p.website_id = ANY($${paramCount++})`;
      values.push(websiteIds);
    }

    if (pageIds && pageIds.length > 0) {
      query += ` AND c.page_id = ANY($${paramCount++})`;
      values.push(pageIds);
    }

    if (excludeChunkIds && excludeChunkIds.length > 0) {
      query += ` AND c.id != ALL($${paramCount++})`;
      values.push(excludeChunkIds);
    }

    query += ` AND (1 - (c.embedding <=> $1::vector)) >= $${paramCount++}`;
    values.push(threshold);

    query += ` ORDER BY c.embedding <=> $1::vector ASC`;
    query += ` LIMIT $${paramCount}`;
    values.push(limit);

    const result = await this.pool.query(query, values);
    
    return result.rows.map((row, index) => ({
      chunk: this.mapRowToChunk(row),
      similarity: parseFloat(row.similarity),
      pageTitle: row.page_title,
      pageUrl: row.page_url,
      rank: index + 1
    }));
  }

  async searchHybrid(
    queryEmbedding: number[], 
    textQuery: string, 
    options: HybridSearchOptions = {}
  ): Promise<ChunkSearchResult[]> {
    const {
      limit = 20,
      threshold = 0.1,
      textWeight = 0.3,
      vectorWeight = 0.7,
      minTextScore = 0.1,
      websiteIds,
      pageIds,
      excludeChunkIds
    } = options;

    let query = `
      SELECT c.id, c.page_id, c.content, c.chunk_index, c.token_count, 
             c.start_position, c.end_position, c.embedding, c.embedding_model, 
             c.metadata, c.created_at,
             p.title as page_title, p.url as page_url,
             1 - (c.embedding <=> $1::vector) as vector_similarity,
             ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', $2)) as text_score,
             (${vectorWeight} * (1 - (c.embedding <=> $1::vector)) + ${textWeight} * ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', $2))) as combined_score
      FROM chunks c
      JOIN pages p ON c.page_id = p.id
      WHERE c.embedding IS NOT NULL
        AND to_tsvector('english', c.content) @@ plainto_tsquery('english', $2)
    `;

    const values: any[] = [JSON.stringify(queryEmbedding), textQuery];
    let paramCount = 3;

    if (websiteIds && websiteIds.length > 0) {
      query += ` AND p.website_id = ANY($${paramCount++})`;
      values.push(websiteIds);
    }

    if (pageIds && pageIds.length > 0) {
      query += ` AND c.page_id = ANY($${paramCount++})`;
      values.push(pageIds);
    }

    if (excludeChunkIds && excludeChunkIds.length > 0) {
      query += ` AND c.id != ALL($${paramCount++})`;
      values.push(excludeChunkIds);
    }

    query += ` AND (1 - (c.embedding <=> $1::vector)) >= $${paramCount++}`;
    values.push(threshold);

    query += ` AND ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', $2)) >= $${paramCount++}`;
    values.push(minTextScore);

    query += ` ORDER BY combined_score DESC`;
    query += ` LIMIT $${paramCount}`;
    values.push(limit);

    const result = await this.pool.query(query, values);
    
    return result.rows.map((row, index) => ({
      chunk: this.mapRowToChunk(row),
      similarity: parseFloat(row.combined_score),
      pageTitle: row.page_title,
      pageUrl: row.page_url,
      rank: index + 1
    }));
  }

  async findWithoutEmbeddings(limit: number = 100): Promise<Chunk[]> {
    const query = `
      SELECT id, page_id, content, chunk_index, token_count, 
             start_position, end_position, embedding, embedding_model, 
             metadata, created_at
      FROM chunks 
      WHERE embedding IS NULL
      ORDER BY created_at ASC
      LIMIT $1
    `;

    const result = await this.pool.query(query, [limit]);
    return result.rows.map(row => this.mapRowToChunk(row));
  }

  async updateEmbedding(id: string, embedding: number[], model: string): Promise<void> {
    const query = `
      UPDATE chunks 
      SET embedding = $1, embedding_model = $2
      WHERE id = $3
    `;

    await this.pool.query(query, [JSON.stringify(embedding), model, id]);
  }

  async deleteByPageId(pageId: string): Promise<number> {
    const query = 'DELETE FROM chunks WHERE page_id = $1';
    const result = await this.pool.query(query, [pageId]);
    return result.rowCount || 0;
  }

  async deleteByWebsiteId(websiteId: string): Promise<number> {
    const query = `
      DELETE FROM chunks 
      WHERE page_id IN (
        SELECT id FROM pages WHERE website_id = $1
      )
    `;
    const result = await this.pool.query(query, [websiteId]);
    return result.rowCount || 0;
  }

  async getStatistics(): Promise<ChunkStatistics> {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_chunks,
        COUNT(embedding) as chunks_with_embeddings,
        AVG(token_count) as avg_tokens_per_chunk,
        (
          SELECT AVG(chunk_count) 
          FROM (
            SELECT COUNT(*) as chunk_count 
            FROM chunks 
            GROUP BY page_id
          ) page_chunks
        ) as avg_chunks_per_page
      FROM chunks
    `;

    const modelsQuery = `
      SELECT 
        embedding_model as model,
        COUNT(*) as count,
        (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM chunks WHERE embedding IS NOT NULL)) as percentage
      FROM chunks 
      WHERE embedding IS NOT NULL
      GROUP BY embedding_model
      ORDER BY count DESC
    `;

    const qualityQuery = `
      SELECT 
        SUM(CASE 
          WHEN (metadata->>'quality'->>'score')::float >= 80 THEN 1 
          ELSE 0 
        END) as high,
        SUM(CASE 
          WHEN (metadata->>'quality'->>'score')::float >= 50 AND (metadata->>'quality'->>'score')::float < 80 THEN 1 
          ELSE 0 
        END) as medium,
        SUM(CASE 
          WHEN (metadata->>'quality'->>'score')::float < 50 THEN 1 
          ELSE 0 
        END) as low
      FROM chunks 
      WHERE metadata->>'quality'->>'score' IS NOT NULL
    `;

    const [statsResult, modelsResult, qualityResult] = await Promise.all([
      this.pool.query(statsQuery),
      this.pool.query(modelsQuery),
      this.pool.query(qualityQuery)
    ]);

    const stats = statsResult.rows[0];
    const models = modelsResult.rows;
    const quality = qualityResult.rows[0];

    return {
      totalChunks: parseInt(stats.total_chunks) || 0,
      chunksWithEmbeddings: parseInt(stats.chunks_with_embeddings) || 0,
      averageTokensPerChunk: parseFloat(stats.avg_tokens_per_chunk) || 0,
      averageChunksPerPage: parseFloat(stats.avg_chunks_per_page) || 0,
      embeddingModels: models.map(model => ({
        model: model.model,
        count: parseInt(model.count),
        percentage: parseFloat(model.percentage)
      })),
      qualityDistribution: {
        high: parseInt(quality.high) || 0,
        medium: parseInt(quality.medium) || 0,
        low: parseInt(quality.low) || 0
      }
    };
  }

  private mapRowToChunk(row: any): Chunk {
    return {
      id: row.id,
      pageId: row.page_id,
      content: row.content,
      chunkIndex: row.chunk_index,
      tokenCount: row.token_count,
      startPosition: row.start_position,
      endPosition: row.end_position,
      embedding: row.embedding ? JSON.parse(row.embedding) : null,
      embeddingModel: row.embedding_model,
      metadata: row.metadata || {},
      createdAt: row.created_at
    };
  }
}
