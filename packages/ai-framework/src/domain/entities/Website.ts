/**
 * Website Domain Entity
 * 
 * Represents a website that can be crawled for content.
 * Each website can have multiple crawl sessions and pages.
 */

export interface Website {
  id: string;
  domain: string;
  baseUrl: string;
  title?: string;
  description?: string;
  status: WebsiteStatus;
  totalPages: number;
  lastCrawledAt?: Date;
  metadata: WebsiteMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export enum WebsiteStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CRAWLING = 'crawling',
  ERROR = 'error'
}

export interface WebsiteMetadata {
  robotsTxt?: string;
  sitemap?: string[];
  language?: string;
  charset?: string;
  contentType?: string;
  discoveryMethod?: 'manual' | 'sitemap' | 'crawling';
  [key: string]: any;
}

export interface CreateWebsiteRequest {
  baseUrl: string;
  title?: string;
  description?: string;
  metadata?: Partial<WebsiteMetadata>;
}

export interface WebsiteWithStats extends Website {
  activeCrawlSessions: number;
  totalCrawlSessions: number;
  averagePageQuality?: number;
  lastCrawlStatus?: string;
}

/**
 * Factory function to create a new Website entity
 */
export function createWebsite(request: CreateWebsiteRequest): Omit<Website, 'id' | 'createdAt' | 'updatedAt'> {
  const url = new URL(request.baseUrl);
  const domain = url.hostname;
  
  return {
    domain,
    baseUrl: request.baseUrl,
    title: request.title || domain,
    description: request.description,
    status: WebsiteStatus.ACTIVE,
    totalPages: 0,
    metadata: {
      discoveryMethod: 'manual',
      ...request.metadata
    }
  };
}

/**
 * Utility functions for Website entity
 */
export class WebsiteUtils {
  static extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch (error) {
      throw new Error(`Invalid URL: ${url}`);
    }
  }
  
  static normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove trailing slash, ensure https
      return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/$/, '')}`;
    } catch (error) {
      throw new Error(`Invalid URL: ${url}`);
    }
  }
  
  static isValidWebsiteUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}
