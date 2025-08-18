/**
 * Website Repository Interface
 * 
 * Defines the contract for website data persistence operations.
 * Follows the repository pattern for clean separation of concerns.
 */

import { Website, CreateWebsiteRequest, WebsiteWithStats } from '../entities/Website';

export interface WebsiteRepository {
  /**
   * Create a new website
   */
  create(request: CreateWebsiteRequest): Promise<Website>;
  
  /**
   * Find website by ID
   */
  findById(id: string): Promise<Website | null>;
  
  /**
   * Find website by domain
   */
  findByDomain(domain: string): Promise<Website | null>;
  
  /**
   * Find website by base URL
   */
  findByBaseUrl(baseUrl: string): Promise<Website | null>;
  
  /**
   * Update website
   */
  update(id: string, updates: Partial<Website>): Promise<Website>;
  
  /**
   * Delete website and all associated data
   */
  delete(id: string): Promise<void>;
  
  /**
   * List websites with optional filtering
   */
  list(options?: WebsiteListOptions): Promise<Website[]>;
  
  /**
   * Get website with statistics
   */
  getWithStats(id: string): Promise<WebsiteWithStats | null>;
  
  /**
   * Update website statistics (total pages, last crawled, etc.)
   */
  updateStats(id: string, stats: WebsiteStatsUpdate): Promise<void>;
  
  /**
   * Check if website exists by domain
   */
  existsByDomain(domain: string): Promise<boolean>;
}

export interface WebsiteListOptions {
  status?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'updated_at' | 'last_crawled_at' | 'total_pages';
  orderDirection?: 'asc' | 'desc';
  search?: string;
}

export interface WebsiteStatsUpdate {
  totalPages?: number;
  lastCrawledAt?: Date;
  averagePageQuality?: number;
}
