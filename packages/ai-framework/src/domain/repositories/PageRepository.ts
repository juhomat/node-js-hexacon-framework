/**
 * Page Repository Interface
 * 
 * Defines the contract for page data persistence operations.
 * Handles discovered pages during crawling and their processing states.
 */

import { Page, CreatePageRequest, PageWithWebsite, PriorityPageQueue } from '../entities/Page';

export interface PageRepository {
  /**
   * Create a new page
   */
  create(request: CreatePageRequest): Promise<Page>;
  
  /**
   * Create multiple pages in batch
   */
  createBatch(requests: CreatePageRequest[]): Promise<Page[]>;
  
  /**
   * Find page by ID
   */
  findById(id: string): Promise<Page | null>;
  
  /**
   * Find page by URL
   */
  findByUrl(url: string): Promise<Page | null>;
  
  /**
   * Find page by URL within a crawl session
   */
  findByUrlInSession(url: string, crawlSessionId: string): Promise<Page | null>;
  
  /**
   * Update page
   */
  update(id: string, updates: Partial<Page>): Promise<Page>;
  
  /**
   * Delete page
   */
  delete(id: string): Promise<void>;
  
  /**
   * Get pages by website ID
   */
  findByWebsiteId(websiteId: string, options?: PageListOptions): Promise<Page[]>;
  
  /**
   * Get pages by crawl session ID
   */
  findByCrawlSessionId(crawlSessionId: string, options?: PageListOptions): Promise<Page[]>;
  
  /**
   * Get pages by status
   */
  findByStatus(status: string, options?: PageListOptions): Promise<Page[]>;
  
  /**
   * Get prioritized page queue for processing
   */
  getPriorityQueue(crawlSessionId: string): Promise<PriorityPageQueue>;
  
  /**
   * Get next pages to process (by priority and status)
   */
  getNextForProcessing(crawlSessionId: string, limit: number): Promise<Page[]>;
  
  /**
   * Update page status
   */
  updateStatus(id: string, status: string, metadata?: Record<string, any>): Promise<void>;
  
  /**
   * Update page content after extraction
   */
  updateContent(id: string, content: PageContentUpdate): Promise<Page>;
  
  /**
   * Get page count by website and status
   */
  countByWebsiteAndStatus(websiteId: string, status?: string): Promise<number>;
  
  /**
   * Get page count by crawl session and status
   */
  countByCrawlSessionAndStatus(crawlSessionId: string, status?: string): Promise<number>;
  
  /**
   * Check if URL exists in crawl session
   */
  existsInSession(url: string, crawlSessionId: string): Promise<boolean>;
  
  /**
   * Get pages with website information
   */
  findWithWebsite(options: PageListOptions): Promise<PageWithWebsite[]>;
  
  /**
   * Delete pages by crawl session
   */
  deleteByCrawlSession(crawlSessionId: string): Promise<number>;
}

export interface PageListOptions {
  status?: string;
  depthLevel?: number;
  minPriority?: number;
  maxPriority?: number;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'priority' | 'depth_level' | 'crawled_at';
  orderDirection?: 'asc' | 'desc';
}

export interface PageContentUpdate {
  title?: string;
  content?: string;
  rawHtml?: string;
  tokenCount?: number;
  metadata?: Record<string, any>;
  crawledAt?: Date;
}
