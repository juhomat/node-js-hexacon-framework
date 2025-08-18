/**
 * Chunk Repository Interface
 * 
 * Defines the contract for chunk data persistence operations.
 * Handles chunk storage, vector similarity search, and retrieval operations.
 */

import { Chunk, CreateChunkRequest, UpdateChunkRequest, ChunkWithPage, ChunkSearchResult } from '../entities/Chunk';

export interface ChunkRepository {
  /**
   * Create a new chunk
   */
  create(request: CreateChunkRequest): Promise<Chunk>;
  
  /**
   * Create multiple chunks in batch
   */
  createBatch(requests: CreateChunkRequest[]): Promise<Chunk[]>;
  
  /**
   * Find chunk by ID
   */
  findById(id: string): Promise<Chunk | null>;
  
  /**
   * Update chunk
   */
  update(id: string, updates: UpdateChunkRequest): Promise<Chunk>;
  
  /**
   * Delete chunk
   */
  delete(id: string): Promise<void>;
  
  /**
   * Get chunks by page ID
   */
  findByPageId(pageId: string, options?: ChunkListOptions): Promise<Chunk[]>;
  
  /**
   * Get chunks by website ID (across all pages)
   */
  findByWebsiteId(websiteId: string, options?: ChunkListOptions): Promise<ChunkWithPage[]>;
  
  /**
   * Count chunks by page ID
   */
  countByPageId(pageId: string): Promise<number>;
  
  /**
   * Count chunks by website ID
   */
  countByWebsiteId(websiteId: string): Promise<number>;
  
  /**
   * Vector similarity search
   */
  searchSimilar(
    queryEmbedding: number[], 
    options?: SimilaritySearchOptions
  ): Promise<ChunkSearchResult[]>;
  
  /**
   * Hybrid search (vector + text)
   */
  searchHybrid(
    queryEmbedding: number[], 
    textQuery: string,
    options?: HybridSearchOptions
  ): Promise<ChunkSearchResult[]>;
  
  /**
   * Get chunks with missing embeddings
   */
  findWithoutEmbeddings(limit?: number): Promise<Chunk[]>;
  
  /**
   * Update embedding for a chunk
   */
  updateEmbedding(id: string, embedding: number[], model: string): Promise<void>;
  
  /**
   * Delete chunks by page ID
   */
  deleteByPageId(pageId: string): Promise<number>;
  
  /**
   * Delete chunks by website ID
   */
  deleteByWebsiteId(websiteId: string): Promise<number>;
  
  /**
   * Get chunk statistics
   */
  getStatistics(): Promise<ChunkStatistics>;
}

export interface ChunkListOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'chunk_index' | 'token_count';
  orderDirection?: 'asc' | 'desc';
  hasEmbedding?: boolean;
}

export interface SimilaritySearchOptions {
  limit?: number;
  threshold?: number;      // Minimum similarity score (0-1)
  websiteIds?: string[];   // Limit search to specific websites
  pageIds?: string[];      // Limit search to specific pages
  excludeChunkIds?: string[]; // Exclude specific chunks
}

export interface HybridSearchOptions extends SimilaritySearchOptions {
  textWeight?: number;     // Weight for text search (0-1, default 0.3)
  vectorWeight?: number;   // Weight for vector search (0-1, default 0.7)
  minTextScore?: number;   // Minimum text search score
}

export interface ChunkStatistics {
  totalChunks: number;
  chunksWithEmbeddings: number;
  averageTokensPerChunk: number;
  averageChunksPerPage: number;
  embeddingModels: {
    model: string;
    count: number;
    percentage: number;
  }[];
  qualityDistribution: {
    high: number;    // Quality >= 80
    medium: number;  // Quality 50-79
    low: number;     // Quality < 50
  };
}
