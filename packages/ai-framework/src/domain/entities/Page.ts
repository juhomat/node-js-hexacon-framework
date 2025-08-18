/**
 * Page Domain Entity
 * 
 * Represents a discovered web page that can be crawled for content.
 * Pages are discovered during the discovery phase and processed during extraction.
 */

export interface Page {
  id: string;
  websiteId: string;
  crawlSessionId?: string;
  url: string;
  title?: string;
  content?: string;
  rawHtml?: string;
  depthLevel: number;
  tokenCount?: number;
  status: PageStatus;
  priority: number;
  discoveryMethod: DiscoveryMethod;
  errorMessage?: string;
  crawledAt?: Date;
  metadata: PageMetadata;
  createdAt: Date;
}

export enum PageStatus {
  DISCOVERED = 'discovered',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

export enum DiscoveryMethod {
  MANUAL = 'manual',
  SITEMAP = 'sitemap',
  CRAWLING = 'crawling',
  ROBOTS_TXT = 'robots_txt'
}

export interface PageMetadata {
  contentType?: string;
  language?: string;
  charset?: string;
  httpStatus?: number;
  responseHeaders?: Record<string, string>;
  parentUrl?: string;
  linkText?: string;
  expectedContentType?: 'documentation' | 'blog' | 'api' | 'guide' | 'general';
  qualityPrediction?: number;
  discoveredAt: Date;
  [key: string]: any;
}

export interface CreatePageRequest {
  websiteId: string;
  crawlSessionId?: string;
  url: string;
  depthLevel: number;
  priority: number;
  discoveryMethod: DiscoveryMethod;
  parentUrl?: string;
  linkText?: string;
  metadata?: Partial<PageMetadata>;
}

export interface PageWithWebsite extends Page {
  website: {
    domain: string;
    title: string;
    baseUrl: string;
  };
}

export interface PriorityPageQueue {
  pages: Page[];
  totalDiscovered: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
}

/**
 * Factory function to create a new Page entity
 */
export function createPage(request: CreatePageRequest): Omit<Page, 'id' | 'createdAt'> {
  return {
    websiteId: request.websiteId,
    crawlSessionId: request.crawlSessionId,
    url: request.url,
    depthLevel: request.depthLevel,
    status: PageStatus.DISCOVERED,
    priority: request.priority,
    discoveryMethod: request.discoveryMethod,
    metadata: {
      parentUrl: request.parentUrl,
      linkText: request.linkText,
      discoveredAt: new Date(),
      ...request.metadata
    }
  };
}

/**
 * Utility functions for Page entity
 */
export class PageUtils {
  static calculatePriority(url: string, context: PriorityContext): number {
    let score = 0;
    
    // URL pattern analysis
    score += this.analyzeUrlPatterns(url);
    
    // Context from parent page
    if (context.linkText) {
      score += this.analyzeLinkText(context.linkText);
    }
    
    // Depth penalty
    score -= context.depthLevel * 5;
    
    return Math.max(0, Math.min(100, score));
  }
  
  private static analyzeUrlPatterns(url: string): number {
    let score = 0;
    
    // High-value content patterns
    if (/\/(docs|documentation|guide|tutorial|help|api|reference)/.test(url)) score += 40;
    if (/\/(blog|article|post|news)/.test(url)) score += 30;
    if (/\/(about|services|products|features)/.test(url)) score += 20;
    
    // Negative patterns
    if (/\/(login|register|cart|checkout|admin|user)/.test(url)) score -= 30;
    if (/\/(privacy|terms|legal|contact)/.test(url)) score -= 10;
    if (/\.(pdf|jpg|png|gif|zip|exe|css|js)$/.test(url)) score -= 50;
    
    // Query parameters (often dynamic/low value)
    if (url.includes('?')) score -= 10;
    if (/[?&](utm_|fbclid|gclid)/.test(url)) score -= 20;
    
    return score;
  }
  
  private static analyzeLinkText(linkText: string): number {
    let score = 0;
    
    // Content indicators in link text
    if (/\b(guide|tutorial|docs|documentation|api)\b/i.test(linkText)) score += 15;
    if (/\b(example|sample|demo)\b/i.test(linkText)) score += 10;
    if (/\b(read more|learn more|details)\b/i.test(linkText)) score += 5;
    
    // Navigation indicators (lower value)
    if (/\b(home|back|next|previous|menu)\b/i.test(linkText)) score -= 10;
    if (/\b(click here|more|link)\b/i.test(linkText)) score -= 5;
    
    return score;
  }
  
  static normalizeUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).href;
    } catch (error) {
      throw new Error(`Invalid URL: ${url} (base: ${baseUrl})`);
    }
  }
  
  static isInternalUrl(url: string, domain: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`);
    } catch {
      return false;
    }
  }
  
  static shouldSkipUrl(url: string): boolean {
    // Skip non-content URLs
    const skipPatterns = [
      /\.(css|js|ico|png|jpg|jpeg|gif|svg|pdf|zip|exe|dmg)$/i,
      /\/(api|webhooks?)\/(?!docs)/i,
      /\/(admin|cms|wp-admin|login|register|logout)/i,
      /#/,  // Fragment-only links
      /^mailto:/i,
      /^tel:/i,
      /^javascript:/i
    ];
    
    return skipPatterns.some(pattern => pattern.test(url));
  }
}

export interface PriorityContext {
  depthLevel: number;
  linkText?: string;
  parentUrl?: string;
  contentHints?: string[];
}
