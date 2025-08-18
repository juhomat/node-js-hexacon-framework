/**
 * Website Discovery Application Service
 * 
 * Orchestrates the website discovery process:
 * 1. Creates/finds website in database
 * 2. Creates crawl session
 * 3. Discovers pages using PageDiscoveryService
 * 4. Stores discovered pages in database
 * 
 * This is a standalone component that prepares data for content extraction.
 */

import { WebsiteRepository } from '../domain/repositories/WebsiteRepository';
import { PageRepository } from '../domain/repositories/PageRepository';
import { CrawlSessionRepository } from '../domain/repositories/CrawlSessionRepository';
import { PageDiscoveryService, DiscoveryOptions } from '../domain/services/PageDiscoveryService';
import { Website, CreateWebsiteRequest } from '../domain/entities/Website';
import { CrawlSession, CreateCrawlSessionRequest, CrawlSessionStatus } from '../domain/entities/CrawlSession';
import { Page, CreatePageRequest, DiscoveryMethod } from '../domain/entities/Page';

export interface DiscoveryRequest {
  websiteUrl: string;
  maxPages: number;
  maxDepth: number;
  websiteTitle?: string;
  websiteDescription?: string;
  options?: Partial<DiscoveryOptions>;
}

export interface DiscoveryProgress {
  type: 'discovery_start' | 'discovery_progress' | 'discovery_complete' | 'storage_start' | 'storage_progress' | 'storage_complete' | 'complete' | 'error';
  message: string;
  current?: number;
  total?: number;
  percentage?: number;
  website?: Website;
  crawlSession?: CrawlSession;
  discoveredPages?: number;
  storedPages?: number;
  processingTimeMs?: number;
}

export interface DiscoveryResult {
  website: Website;
  crawlSession: CrawlSession;
  discoveredPages: Page[];
  summary: DiscoverySummary;
}

export interface DiscoverySummary {
  totalDiscovered: number;
  totalStored: number;
  highPriorityPages: number;
  mediumPriorityPages: number;
  lowPriorityPages: number;
  discoveryMethod: string;
  processingTimeMs: number;
  avgPagePriority: number;
}

export class WebsiteDiscoveryApplication {
  constructor(
    private websiteRepository: WebsiteRepository,
    private pageRepository: PageRepository,
    private crawlSessionRepository: CrawlSessionRepository,
    private pageDiscoveryService: PageDiscoveryService
  ) {}

  async *discoverWebsite(request: DiscoveryRequest): AsyncGenerator<DiscoveryProgress> {
    const startTime = Date.now();
    
    try {
      yield {
        type: 'discovery_start',
        message: `Starting discovery for: ${request.websiteUrl}`,
        current: 0,
        total: 100,
        percentage: 0
      };

      // Step 1: Create or find website
      console.log(`🌐 Processing website: ${request.websiteUrl}`);
      const website = await this.ensureWebsite(request);
      
      yield {
        type: 'discovery_progress',
        message: `Website registered: ${website.domain}`,
        current: 10,
        total: 100,
        percentage: 10,
        website
      };

      // Step 2: Create crawl session
      console.log(`📊 Creating crawl session for ${website.domain}`);
      const crawlSession = await this.createCrawlSession(website.id, request);

      yield {
        type: 'discovery_progress',
        message: `Crawl session created`,
        current: 20,
        total: 100,
        percentage: 20,
        crawlSession
      };

      // Step 3: Update crawl session status to discovering
      await this.crawlSessionRepository.updateStatus(
        crawlSession.id, 
        CrawlSessionStatus.DISCOVERING,
        { startedAt: new Date() }
      );

      // Step 4: Discover pages
      console.log(`🔍 Starting page discovery...`);
      yield {
        type: 'discovery_progress',
        message: `Discovering pages (max: ${request.maxPages}, depth: ${request.maxDepth})...`,
        current: 30,
        total: 100,
        percentage: 30
      };

      const discoveryOptions: DiscoveryOptions = {
        maxPages: request.maxPages,
        maxDepth: request.maxDepth,
        userAgent: 'AI-Framework-Bot/1.0',
        respectRobotsTxt: true,
        timeout: 10000,
        concurrency: 6,
        ...request.options
      };

      const discoveryResult = await this.pageDiscoveryService.discoverPages(
        request.websiteUrl,
        discoveryOptions
      );

      yield {
        type: 'discovery_complete',
        message: `Discovery complete: ${discoveryResult.totalFound} pages found`,
        current: 70,
        total: 100,
        percentage: 70,
        discoveredPages: discoveryResult.totalFound,
        processingTimeMs: discoveryResult.processingTimeMs
      };

      // Step 5: Store discovered pages in database
      console.log(`💾 Storing ${discoveryResult.discoveredUrls.length} pages in database...`);
      yield {
        type: 'storage_start',
        message: `Storing discovered pages in database...`,
        current: 75,
        total: 100,
        percentage: 75
      };

      const storedPages = await this.storeDiscoveredPages(
        website.id,
        crawlSession.id,
        discoveryResult.discoveredUrls
      );

      // Step 6: Update crawl session with discovery results
      await this.crawlSessionRepository.updateStats(crawlSession.id, {
        pagesDiscovered: storedPages.length,
        startedAt: new Date(startTime)
      });

      await this.crawlSessionRepository.updateStatus(
        crawlSession.id,
        CrawlSessionStatus.PENDING, // Ready for content extraction
        {
          discoveryCompleted: true,
          discoveryMethod: discoveryResult.method,
          discoveryMetadata: discoveryResult.metadata
        }
      );

      // Step 7: Update website statistics
      await this.websiteRepository.updateStats(website.id, {
        totalPages: await this.pageRepository.countByWebsiteAndStatus(website.id),
        lastCrawledAt: new Date()
      });

      const processingTimeMs = Date.now() - startTime;

      yield {
        type: 'storage_complete',
        message: `Stored ${storedPages.length} pages successfully`,
        current: 90,
        total: 100,
        percentage: 90,
        storedPages: storedPages.length
      };

      // Final result
      const summary = this.createSummary(discoveryResult, storedPages, processingTimeMs);

      yield {
        type: 'complete',
        message: `Discovery completed: ${storedPages.length} pages ready for content extraction`,
        current: 100,
        total: 100,
        percentage: 100,
        website,
        crawlSession,
        discoveredPages: storedPages.length,
        processingTimeMs
      };

      return {
        website,
        crawlSession,
        discoveredPages: storedPages,
        summary
      };

    } catch (error) {
      console.error(`❌ Discovery failed for ${request.websiteUrl}:`, error);
      
      yield {
        type: 'error',
        message: `Discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        current: 0,
        total: 100,
        percentage: 0
      };

      throw error;
    }
  }

  private async ensureWebsite(request: DiscoveryRequest): Promise<Website> {
    try {
      const url = new URL(request.websiteUrl);
      const domain = url.hostname;

      // Check if website already exists
      const existingWebsite = await this.websiteRepository.findByDomain(domain);
      if (existingWebsite) {
        console.log(`✅ Website already exists: ${existingWebsite.domain}`);
        return existingWebsite;
      }

      // Create new website
      console.log(`🆕 Creating new website: ${domain}`);
      const createRequest: CreateWebsiteRequest = {
        baseUrl: `${url.protocol}//${url.host}`,
        title: request.websiteTitle || domain,
        description: request.websiteDescription,
        metadata: {
          discoveryMethod: 'manual',
          userAgent: 'AI-Framework-Bot/1.0'
        }
      };

      return await this.websiteRepository.create(createRequest);

    } catch (error) {
      throw new Error(`Failed to ensure website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async createCrawlSession(websiteId: string, request: DiscoveryRequest): Promise<CrawlSession> {
    const createRequest: CreateCrawlSessionRequest = {
      websiteId,
      maxPages: request.maxPages,
      maxDepth: request.maxDepth,
      metadata: {
        userAgent: 'AI-Framework-Bot/1.0',
        discoveryMethod: 'hybrid',
        requestedAt: new Date(),
        ...request.options
      }
    };

    return await this.crawlSessionRepository.create(createRequest);
  }

  private async storeDiscoveredPages(
    websiteId: string,
    crawlSessionId: string,
    discoveredUrls: any[]
  ): Promise<Page[]> {
    
    const pageRequests: CreatePageRequest[] = discoveredUrls.map(url => ({
      websiteId,
      crawlSessionId,
      url: url.url,
      depthLevel: url.depthLevel,
      priority: url.priority,
      discoveryMethod: url.discoveryMethod as DiscoveryMethod,
      parentUrl: url.parentUrl,
      linkText: url.linkText,
      metadata: {
        ...url.metadata,
        expectedContentType: this.predictContentType(url.url),
        qualityPrediction: url.priority
      }
    }));

    // Store pages in batches for better performance
    const batchSize = 50;
    const storedPages: Page[] = [];

    for (let i = 0; i < pageRequests.length; i += batchSize) {
      const batch = pageRequests.slice(i, i + batchSize);
      const batchResults = await this.pageRepository.createBatch(batch);
      storedPages.push(...batchResults);
      
      console.log(`💾 Stored batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(pageRequests.length/batchSize)}: ${batchResults.length} pages`);
    }

    return storedPages;
  }

  private predictContentType(url: string): string {
    if (/\/(docs|documentation|guide|tutorial|help|api|reference)/.test(url)) return 'documentation';
    if (/\/(blog|article|post|news)/.test(url)) return 'blog';
    if (/\/(about|services|products|features)/.test(url)) return 'general';
    return 'general';
  }

  private createSummary(discoveryResult: any, storedPages: Page[], processingTimeMs: number): DiscoverySummary {
    const priorities = storedPages.map(p => p.priority);
    const avgPriority = priorities.length > 0 ? priorities.reduce((a, b) => a + b, 0) / priorities.length : 0;

    const highPriority = storedPages.filter(p => p.priority >= 70).length;
    const mediumPriority = storedPages.filter(p => p.priority >= 40 && p.priority < 70).length;
    const lowPriority = storedPages.filter(p => p.priority < 40).length;

    return {
      totalDiscovered: discoveryResult.totalFound,
      totalStored: storedPages.length,
      highPriorityPages: highPriority,
      mediumPriorityPages: mediumPriority,
      lowPriorityPages: lowPriority,
      discoveryMethod: discoveryResult.method,
      processingTimeMs,
      avgPagePriority: Math.round(avgPriority * 100) / 100
    };
  }

  // Utility methods for external use
  async getWebsiteByDomain(domain: string): Promise<Website | null> {
    return await this.websiteRepository.findByDomain(domain);
  }

  async getCrawlSession(sessionId: string): Promise<CrawlSession | null> {
    return await this.crawlSessionRepository.findById(sessionId);
  }

  async getDiscoveredPages(crawlSessionId: string): Promise<Page[]> {
    return await this.pageRepository.findByCrawlSessionId(crawlSessionId);
  }
}
