/**
 * CrawlSession Repository Interface
 * 
 * Defines the contract for crawl session data persistence operations.
 * Manages crawling sessions and their progress tracking.
 */

import { CrawlSession, CreateCrawlSessionRequest, CrawlSessionProgress } from '../entities/CrawlSession';

export interface CrawlSessionRepository {
  /**
   * Create a new crawl session
   */
  create(request: CreateCrawlSessionRequest): Promise<CrawlSession>;
  
  /**
   * Find crawl session by ID
   */
  findById(id: string): Promise<CrawlSession | null>;
  
  /**
   * Update crawl session
   */
  update(id: string, updates: Partial<CrawlSession>): Promise<CrawlSession>;
  
  /**
   * Delete crawl session and associated pages
   */
  delete(id: string): Promise<void>;
  
  /**
   * Get crawl sessions by website ID
   */
  findByWebsiteId(websiteId: string, options?: CrawlSessionListOptions): Promise<CrawlSession[]>;
  
  /**
   * Get active crawl sessions
   */
  findActive(): Promise<CrawlSession[]>;
  
  /**
   * Get crawl session with progress information
   */
  getWithProgress(id: string): Promise<CrawlSessionProgress | null>;
  
  /**
   * Update crawl session status
   */
  updateStatus(id: string, status: string, metadata?: Record<string, any>): Promise<void>;
  
  /**
   * Update crawl session statistics
   */
  updateStats(id: string, stats: CrawlSessionStatsUpdate): Promise<void>;
  
  /**
   * Get latest crawl session for website
   */
  getLatestForWebsite(websiteId: string): Promise<CrawlSession | null>;
  
  /**
   * Get crawl session statistics
   */
  getStats(id: string): Promise<CrawlSessionStats>;
  
  /**
   * Mark crawl session as completed
   */
  markCompleted(id: string, completionMetadata?: Record<string, any>): Promise<CrawlSession>;
  
  /**
   * Mark crawl session as failed
   */
  markFailed(id: string, error: string, metadata?: Record<string, any>): Promise<CrawlSession>;
  
  /**
   * Get crawl sessions by status
   */
  findByStatus(status: string, options?: CrawlSessionListOptions): Promise<CrawlSession[]>;
}

export interface CrawlSessionListOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'started_at' | 'completed_at';
  orderDirection?: 'asc' | 'desc';
  status?: string;
}

export interface CrawlSessionStatsUpdate {
  pagesDiscovered?: number;
  pagesCompleted?: number;
  chunksCreated?: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface CrawlSessionStats {
  totalPages: number;
  completedPages: number;
  failedPages: number;
  skippedPages: number;
  totalChunks: number;
  averagePageQuality?: number;
  processingTimeMs?: number;
}
