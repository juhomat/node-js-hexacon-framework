/**
 * Page Discovery Service
 * 
 * Handles intelligent page discovery using multiple strategies:
 * 1. Sitemap parsing
 * 2. Intelligent crawling with priority scoring
 * 3. Hybrid approach for optimal results
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

export interface DiscoveryResult {
  discoveredUrls: DiscoveredUrl[];
  method: DiscoveryMethod;
  totalFound: number;
  processingTimeMs: number;
  metadata: DiscoveryMetadata;
}

export interface DiscoveredUrl {
  url: string;
  priority: number;
  depthLevel: number;
  parentUrl?: string;
  linkText?: string;
  discoveryMethod: DiscoveryMethod;
  metadata: UrlMetadata;
}

export enum DiscoveryMethod {
  SITEMAP = 'sitemap',
  CRAWLING = 'crawling',
  ROBOTS_TXT = 'robots_txt',
  HYBRID = 'hybrid'
}

export interface DiscoveryMetadata {
  sitemapUrls?: string[];
  robotsTxtContent?: string;
  crawledPages: number;
  skippedUrls: number;
  errorUrls: string[];
  performanceMetrics: {
    avgResponseTime: number;
    successRate: number;
  };
}

export interface UrlMetadata {
  expectedContentType?: string;
  linkContext?: string;
  httpStatus?: number;
  contentLength?: number;
  lastModified?: string;
  discoveredAt: Date;
}

export interface DiscoveryOptions {
  maxPages: number;
  maxDepth: number;
  userAgent?: string;
  respectRobotsTxt?: boolean;
  timeout?: number;
  concurrency?: number;
  skipPatterns?: RegExp[];
  priorityPatterns?: RegExp[];
}

export class PageDiscoveryService {
  private readonly DEFAULT_USER_AGENT = 'AI-Framework-Bot/1.0 (+https://github.com/ai-framework)';
  private readonly DEFAULT_TIMEOUT = 10000;
  private readonly DEFAULT_CONCURRENCY = 6;

  async discoverPages(baseUrl: string, options: DiscoveryOptions): Promise<DiscoveryResult> {
    const startTime = Date.now();
    
    console.log(`🔍 Starting page discovery for: ${baseUrl}`);
    console.log(`📊 Parameters: ${options.maxPages} pages, depth ${options.maxDepth}`);

    try {
      // Strategy 1: Try sitemap first (fastest and most reliable)
      const sitemapResult = await this.discoverFromSitemap(baseUrl, options);
      if (sitemapResult.discoveredUrls.length >= options.maxPages) {
        console.log(`✅ Sitemap discovery successful: ${sitemapResult.discoveredUrls.length} URLs found`);
        return {
          ...sitemapResult,
          processingTimeMs: Date.now() - startTime
        };
      }

      console.log(`⚠️ Sitemap insufficient (${sitemapResult.discoveredUrls.length} URLs), falling back to crawling`);

      // Strategy 2: Intelligent crawling
      const crawlingResult = await this.discoverByCrawling(baseUrl, options);
      
      // Combine results if we have both
      const combinedUrls = this.combineAndPrioritize([
        ...sitemapResult.discoveredUrls,
        ...crawlingResult.discoveredUrls
      ], options.maxPages);

      return {
        discoveredUrls: combinedUrls,
        method: DiscoveryMethod.HYBRID,
        totalFound: combinedUrls.length,
        processingTimeMs: Date.now() - startTime,
        metadata: {
          ...sitemapResult.metadata,
          ...crawlingResult.metadata,
          crawledPages: (sitemapResult.metadata.crawledPages || 0) + (crawlingResult.metadata.crawledPages || 0)
        }
      };

    } catch (error) {
      console.error(`❌ Page discovery failed for ${baseUrl}:`, error);
      throw new Error(`Page discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async discoverFromSitemap(baseUrl: string, options: DiscoveryOptions): Promise<DiscoveryResult> {
    console.log(`🗺️ Checking for sitemap at: ${baseUrl}`);
    
    const sitemapUrls = this.generateSitemapUrls(baseUrl);
    const allDiscoveredUrls: DiscoveredUrl[] = [];
    const foundSitemaps: string[] = [];

    // Step 1: Collect ALL URLs from sitemap(s) without limiting
    for (const sitemapUrl of sitemapUrls) {
      try {
        console.log(`📄 Checking sitemap: ${sitemapUrl}`);
        const urls = await this.parseSitemap(sitemapUrl, options);
        
        if (urls.length > 0) {
          foundSitemaps.push(sitemapUrl);
          allDiscoveredUrls.push(...urls);
          console.log(`✅ Found ${urls.length} URLs in sitemap: ${sitemapUrl}`);
        }
      } catch (error) {
        console.log(`⚠️ Failed to parse sitemap ${sitemapUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Step 2: Smart prioritization - analyze ALL URLs and select best ones
    if (allDiscoveredUrls.length > 0) {
      console.log(`🧠 Analyzing ${allDiscoveredUrls.length} URLs for smart prioritization...`);
      
      // Enhanced scoring with navigation detection
      const prioritizedUrls = await this.enhancedPrioritization(allDiscoveredUrls, baseUrl, options);
      
      // Select top N pages based on priority scores
      const selectedUrls = prioritizedUrls
        .sort((a, b) => b.priority - a.priority)
        .slice(0, options.maxPages);

      console.log(`🎯 Selected ${selectedUrls.length} highest-priority pages from ${allDiscoveredUrls.length} total`);
      
      return {
        discoveredUrls: selectedUrls,
        method: DiscoveryMethod.SITEMAP,
        totalFound: allDiscoveredUrls.length,
        processingTimeMs: 0, // Will be set by caller
        metadata: {
          sitemapUrls: foundSitemaps,
          crawledPages: 0,
          skippedUrls: allDiscoveredUrls.length - selectedUrls.length,
          errorUrls: [],
          performanceMetrics: {
            avgResponseTime: 0,
            successRate: foundSitemaps.length / sitemapUrls.length
          }
        }
      };
    }

    // No URLs found
    return {
      discoveredUrls: [],
      method: DiscoveryMethod.SITEMAP,
      totalFound: 0,
      processingTimeMs: 0,
      metadata: {
        sitemapUrls: foundSitemaps,
        crawledPages: 0,
        skippedUrls: 0,
        errorUrls: [],
        performanceMetrics: {
          avgResponseTime: 0,
          successRate: foundSitemaps.length / sitemapUrls.length
        }
      }
    };
  }

  private async discoverByCrawling(baseUrl: string, options: DiscoveryOptions): Promise<DiscoveryResult> {
    console.log(`🕷️ Starting intelligent crawling discovery`);
    
    const visited = new Set<string>();
    const discovered = new Map<string, DiscoveredUrl>();
    const queue = new UrlQueue();
    const errors: string[] = [];
    const responseTimes: number[] = [];

    // Start with base URL
    queue.add({
      url: baseUrl,
      priority: 100,
      depthLevel: 0,
      discoveryMethod: DiscoveryMethod.CRAWLING,
      metadata: { discoveredAt: new Date() }
    });

    while (!queue.isEmpty() && discovered.size < options.maxPages) {
      const batch = queue.getNextBatch(options.concurrency || this.DEFAULT_CONCURRENCY);
      
      await Promise.all(batch.map(async (item) => {
        if (visited.has(item.url) || item.depthLevel > options.maxDepth) {
          return;
        }

        visited.add(item.url);

        try {
          const startTime = Date.now();
          const links = await this.extractLinksFromPage(item.url, options);
          const responseTime = Date.now() - startTime;
          responseTimes.push(responseTime);

          // Add current page to discovered
          discovered.set(item.url, item);

          // Add discovered links to queue for next depth level
          if (item.depthLevel < options.maxDepth) {
            for (const link of links) {
              if (!visited.has(link.url) && !discovered.has(link.url)) {
                queue.add({
                  ...link,
                  depthLevel: item.depthLevel + 1,
                  parentUrl: item.url
                });
              }
            }
          }

          console.log(`📄 Processed ${item.url}: found ${links.length} links`);

        } catch (error) {
          errors.push(item.url);
          console.log(`❌ Failed to process ${item.url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }));
    }

    const discoveredUrls = Array.from(discovered.values())
      .sort((a, b) => b.priority - a.priority)
      .slice(0, options.maxPages);

    return {
      discoveredUrls,
      method: DiscoveryMethod.CRAWLING,
      totalFound: discoveredUrls.length,
      processingTimeMs: 0, // Will be set by caller
      metadata: {
        crawledPages: visited.size,
        skippedUrls: queue.size(),
        errorUrls: errors,
        performanceMetrics: {
          avgResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
          successRate: (visited.size - errors.length) / visited.size
        }
      }
    };
  }

  private async extractLinksFromPage(url: string, options: DiscoveryOptions): Promise<DiscoveredUrl[]> {
    try {
      const response = await axios.get(url, {
        timeout: options.timeout || this.DEFAULT_TIMEOUT,
        headers: {
          'User-Agent': options.userAgent || this.DEFAULT_USER_AGENT
        },
        maxRedirects: 3
      });

      const $ = cheerio.load(response.data);
      const baseUrlObj = new URL(url);
      const links: DiscoveredUrl[] = [];

      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        const linkText = $(element).text().trim();

        if (!href) return;

        try {
          // Resolve relative URLs
          const absoluteUrl = new URL(href, url).href;
          
          // Skip if not internal URL
          if (!this.isInternalUrl(absoluteUrl, baseUrlObj.hostname)) {
            return;
          }

          // Skip if matches skip patterns
          if (this.shouldSkipUrl(absoluteUrl, options.skipPatterns)) {
            return;
          }

          // Calculate priority
          const priority = this.calculateUrlPriority(absoluteUrl, linkText, options);

          links.push({
            url: absoluteUrl,
            priority,
            depthLevel: 0, // Will be set by caller
            linkText: linkText.substring(0, 100), // Limit length
            discoveryMethod: DiscoveryMethod.CRAWLING,
            metadata: {
              linkContext: this.getLinkContext($, element),
              discoveredAt: new Date()
            }
          });

        } catch (urlError) {
          // Skip invalid URLs
        }
      });

      // Remove duplicates and return top links
      const uniqueLinks = this.deduplicateUrls(links);
      return uniqueLinks.sort((a, b) => b.priority - a.priority);

    } catch (error) {
      throw new Error(`Failed to extract links from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateSitemapUrls(baseUrl: string): string[] {
    const baseUrlObj = new URL(baseUrl);
    const base = `${baseUrlObj.protocol}//${baseUrlObj.host}`;
    
    return [
      `${base}/sitemap.xml`,
      `${base}/sitemap_index.xml`,
      `${base}/sitemaps.xml`,
      `${base}/sitemap/sitemap.xml`,
      `${base}/sitemap/index.xml`
    ];
  }

  private async parseSitemap(sitemapUrl: string, options: DiscoveryOptions): Promise<DiscoveredUrl[]> {
    try {
      const response = await axios.get(sitemapUrl, {
        timeout: options.timeout || this.DEFAULT_TIMEOUT,
        headers: {
          'User-Agent': options.userAgent || this.DEFAULT_USER_AGENT
        }
      });

      const $ = cheerio.load(response.data, { xmlMode: true });
      const urls: DiscoveredUrl[] = [];

      // Parse sitemap URLs
      $('url > loc').each((_, element) => {
        const url = $(element).text().trim();
        if (url) {
          const priority = this.calculateUrlPriority(url, '', options);
          urls.push({
            url,
            priority,
            depthLevel: 0,
            discoveryMethod: DiscoveryMethod.SITEMAP,
            metadata: {
              lastModified: $(element).siblings('lastmod').text(),
              discoveredAt: new Date()
            }
          });
        }
      });

      // Parse sitemap index (nested sitemaps)
      $('sitemap > loc').each((_, element) => {
        const sitemapUrl = $(element).text().trim();
        if (sitemapUrl) {
          // Note: In a full implementation, we'd recursively parse these
          console.log(`📋 Found nested sitemap: ${sitemapUrl}`);
        }
      });

      return urls;

    } catch (error) {
      throw new Error(`Failed to parse sitemap ${sitemapUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private calculateUrlPriority(url: string, linkText: string, options: DiscoveryOptions): number {
    let score = 50; // Base score

    // URL pattern analysis
    if (/\/(docs|documentation|guide|tutorial|help|api|reference)/.test(url)) score += 30;
    if (/\/(blog|article|post|news)/.test(url)) score += 20;
    if (/\/(about|services|products|features)/.test(url)) score += 15;

    // Negative patterns
    if (/\/(login|register|cart|checkout|admin|user)/.test(url)) score -= 30;
    if (/\/(privacy|terms|legal|contact)/.test(url)) score -= 10;
    if (/\.(pdf|jpg|png|gif|zip|exe)$/.test(url)) score -= 40;

    // Link text analysis
    if (linkText) {
      if (/\b(guide|tutorial|docs|documentation|api)\b/i.test(linkText)) score += 15;
      if (/\b(example|sample|demo)\b/i.test(linkText)) score += 10;
      if (/\b(home|back|next|previous|menu)\b/i.test(linkText)) score -= 10;
    }

    // Query parameters (often less valuable)
    if (url.includes('?')) score -= 5;
    if (/[?&](utm_|fbclid|gclid)/.test(url)) score -= 15;

    // Priority patterns from options
    if (options.priorityPatterns) {
      for (const pattern of options.priorityPatterns) {
        if (pattern.test(url)) score += 20;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Enhanced prioritization with navigation detection and multi-language support
   */
  private async enhancedPrioritization(urls: DiscoveredUrl[], baseUrl: string, options: DiscoveryOptions): Promise<DiscoveredUrl[]> {
    try {
      // Step 1: Quick homepage fetch for navigation analysis (optional enhancement)
      let navigationUrls: string[] = [];
      try {
        console.log(`🏠 Fetching homepage for navigation analysis...`);
        navigationUrls = await this.extractNavigationUrls(baseUrl, options);
        console.log(`🧭 Found ${navigationUrls.length} navigation links`);
      } catch (error) {
        console.log(`⚠️ Could not fetch navigation, using URL patterns only`);
      }

      // Step 2: Re-score all URLs with enhanced algorithm
      const enhancedUrls = urls.map(url => ({
        ...url,
        priority: this.calculateEnhancedPriority(url.url, navigationUrls, baseUrl)
      }));

      return enhancedUrls;
    } catch (error) {
      console.log(`⚠️ Enhanced prioritization failed, using basic scoring:`, error);
      return urls; // Fallback to original scoring
    }
  }

  /**
   * Extract main navigation URLs from homepage
   */
  private async extractNavigationUrls(baseUrl: string, options: DiscoveryOptions): Promise<string[]> {
    const response = await axios.get(baseUrl, {
      timeout: options.timeout || this.DEFAULT_TIMEOUT,
      headers: {
        'User-Agent': options.userAgent || this.DEFAULT_USER_AGENT
      }
    });

    const $ = cheerio.load(response.data);
    const navUrls: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // Common navigation selectors
    const navSelectors = [
      'nav a[href]',
      '.navigation a[href]', 
      '.navbar a[href]',
      '.menu a[href]',
      'header a[href]',
      '.main-nav a[href]',
      '.primary-nav a[href]'
    ];

    navSelectors.forEach(selector => {
      $(selector).each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          try {
            // Convert relative URLs to absolute
            const absoluteUrl = new URL(href, baseUrl).toString();
            // Only include same-domain URLs
            if (new URL(absoluteUrl).hostname === baseUrlObj.hostname) {
              navUrls.push(absoluteUrl);
            }
          } catch (error) {
            // Invalid URL, skip
          }
        }
      });
    });

    // Remove duplicates and return
    return [...new Set(navUrls)];
  }

  /**
   * Enhanced priority calculation with navigation detection and better patterns
   */
  private calculateEnhancedPriority(url: string, navigationUrls: string[], baseUrl: string): number {
    let score = 50; // Base score
    
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.toLowerCase();
      const pathSegments = path.split('/').filter(Boolean);

      // 1. HOMEPAGE BONUS (Highest Priority)
      if (path === '/' || path === '') {
        return 100;
      }

      // 2. NAVIGATION BONUS (Very High Priority)
      if (navigationUrls.includes(url)) {
        score += 45; // Major boost for navigation pages
      }

      // 3. KEY SECTION PATTERNS (High Priority)
      const keyPatterns = {
        // Core business pages
        about: /\b(about|company|team|mission|story|who-we-are|tietoa|yritys|meista)\b/,
        services: /\b(services|products|solutions|offerings|palvelut|tuotteet|ratkaisut)\b/,
        contact: /\b(contact|reach-us|get-in-touch|yhteystiedot|ota-yhteyttä)\b/,
        pricing: /\b(pricing|plans|cost|packages|hinta|hinnoittelu)\b/,
        
        // Documentation & help
        docs: /\b(docs|documentation|api|reference|guide|manual|ohje|dokumentaatio)\b/,
        help: /\b(help|support|faq|tutorial|how-to|getting-started|apu|tuki)\b/,
        
        // Content sections
        blog: /\b(blog|news|articles|insights|resources|blogi|uutiset|artikkelit)\b/,
        features: /\b(features|capabilities|functionality|ominaisuudet|toiminnot)\b/
      };

      // Apply pattern bonuses
      Object.entries(keyPatterns).forEach(([category, pattern]) => {
        if (pattern.test(path)) {
          const bonus = this.getCategoryBonus(category);
          score += bonus;
        }
      });

      // 4. URL STRUCTURE SCORING
      const depth = pathSegments.length;
      if (depth === 1) score += 20; // Top-level pages are important
      else if (depth === 2) score += 10; // Second-level still good
      else if (depth > 4) score -= 15; // Deep pages usually less important

      // 5. LANGUAGE/LOCALE HANDLING
      const langBonus = this.getLanguageBonus(path);
      score += langBonus;

      // 6. NEGATIVE PATTERNS (Lower Priority)
      const negativePatterns = [
        /\b(login|register|signin|signup|cart|checkout|admin|dashboard)\b/,
        /\b(privacy|terms|legal|gdpr|cookie|disclaimer)\b/,
        /\b(404|error|maintenance)\b/,
        /\b(search|sitemap|robots)\b/
      ];

      negativePatterns.forEach(pattern => {
        if (pattern.test(path)) {
          score -= 25;
        }
      });

      // 7. FILE TYPE PENALTIES
      if (/\.(pdf|doc|docx|xls|xlsx|zip|tar|gz|exe|dmg|img|iso)$/i.test(path)) {
        score -= 40;
      }

      // 8. MEDIA FILE PENALTIES  
      if (/\.(jpg|jpeg|png|gif|svg|webp|mp4|mp3|avi|mov|wav)$/i.test(path)) {
        score -= 30;
      }

      // Ensure score is within bounds
      return Math.max(0, Math.min(100, score));

    } catch (error) {
      // Invalid URL, return base score
      return 25;
    }
  }

  /**
   * Get bonus points by content category
   */
  private getCategoryBonus(category: string): number {
    const bonuses: Record<string, number> = {
      about: 35,
      services: 35, 
      contact: 30,
      pricing: 30,
      docs: 25,
      help: 20,
      features: 20,
      blog: 15
    };
    return bonuses[category] || 10;
  }

  /**
   * Handle multi-language sites
   */
  private getLanguageBonus(path: string): number {
    // English or no language prefix = slight bonus (assumed primary)
    if (/^\/en\//.test(path) || !/^\/[a-z]{2}\//.test(path)) {
      return 5;
    }
    // Other languages = neutral (no penalty, no bonus)
    return 0;
  }

  private isInternalUrl(url: string, baseDomain: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === baseDomain || urlObj.hostname.endsWith(`.${baseDomain}`);
    } catch {
      return false;
    }
  }

  private shouldSkipUrl(url: string, skipPatterns?: RegExp[]): boolean {
    const defaultSkipPatterns = [
      /\.(css|js|ico|png|jpg|jpeg|gif|svg|pdf|zip|exe|dmg)$/i,
      /\/(api|webhooks?)\/(?!docs)/i,
      /\/(admin|cms|wp-admin|login|register|logout)/i,
      /#/,
      /^mailto:/i,
      /^tel:/i,
      /^javascript:/i
    ];

    const allPatterns = [...defaultSkipPatterns, ...(skipPatterns || [])];
    return allPatterns.some(pattern => pattern.test(url));
  }

  private getLinkContext($: cheerio.CheerioAPI, element: any): string {
    // Get surrounding text context for better understanding
    const $parent = $(element).parent();
    const context = $parent.text().trim().substring(0, 200);
    return context;
  }

  private deduplicateUrls(urls: DiscoveredUrl[]): DiscoveredUrl[] {
    const seen = new Set<string>();
    return urls.filter(item => {
      if (seen.has(item.url)) {
        return false;
      }
      seen.add(item.url);
      return true;
    });
  }

  private combineAndPrioritize(urls: DiscoveredUrl[], maxPages: number): DiscoveredUrl[] {
    // Deduplicate and prioritize
    const uniqueUrls = this.deduplicateUrls(urls);
    return uniqueUrls
      .sort((a, b) => b.priority - a.priority)
      .slice(0, maxPages);
  }
}

/**
 * Simple priority queue for URL processing
 */
class UrlQueue {
  private items: DiscoveredUrl[] = [];

  add(item: DiscoveredUrl): void {
    this.items.push(item);
    // Keep sorted by priority (highest first)
    this.items.sort((a, b) => b.priority - a.priority);
  }

  getNextBatch(size: number): DiscoveredUrl[] {
    return this.items.splice(0, size);
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }
}
