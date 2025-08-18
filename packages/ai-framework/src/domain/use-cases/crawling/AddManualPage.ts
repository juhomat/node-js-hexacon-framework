/**
 * Add Manual Page Use Case
 * 
 * Allows users to manually add specific pages to a website for content extraction.
 * This is useful for:
 * - Adding pages not discoverable through crawling
 * - Including specific high-value content
 * - Adding pages from password-protected sections
 * - Including external content that should be part of the knowledge base
 */

import { Page, CreatePageRequest } from '../../entities/Page';
import { Website } from '../../entities/Website';
import { CrawlSession, CrawlSessionStatus } from '../../entities/CrawlSession';
import { PageRepository } from '../../repositories/PageRepository';
import { WebsiteRepository } from '../../repositories/WebsiteRepository';
import { CrawlSessionRepository } from '../../repositories/CrawlSessionRepository';

export interface AddManualPageRequest {
  websiteUrl: string;
  pageUrl: string;
  title?: string;
  description?: string;
  priority?: number;
  metadata?: Record<string, any>;
}

export interface AddManualPageResponse {
  success: boolean;
  page: Page;
  website: Website;
  crawlSession: CrawlSession;
  message: string;
}

export class AddManualPage {
  constructor(
    private pageRepository: PageRepository,
    private websiteRepository: WebsiteRepository,
    private crawlSessionRepository: CrawlSessionRepository
  ) {}

  async execute(request: AddManualPageRequest): Promise<AddManualPageResponse> {
    try {
      // Validate URLs
      const websiteUrlObj = new URL(request.websiteUrl);
      const pageUrlObj = new URL(request.pageUrl);
      
      // Ensure page URL belongs to the website domain
      if (pageUrlObj.hostname !== websiteUrlObj.hostname) {
        throw new Error(`Page URL domain (${pageUrlObj.hostname}) doesn't match website domain (${websiteUrlObj.hostname})`);
      }

      // Step 1: Get or create website
      const website = await this.ensureWebsite(request.websiteUrl, request.description);

      // Step 2: Get or create a manual crawl session
      const crawlSession = await this.ensureManualCrawlSession(website.id);

      // Step 3: Check if page already exists
      const existingPage = await this.pageRepository.findByUrlInSession(request.pageUrl, crawlSession.id);
      if (existingPage) {
        return {
          success: true,
          page: existingPage,
          website,
          crawlSession,
          message: `Page already exists in session: ${existingPage.url}`
        };
      }

      // Step 4: Calculate priority for the manual page
      const priority = request.priority ?? this.calculateManualPagePriority(request.pageUrl);

      // Step 5: Create the page entry
      const pageRequest: CreatePageRequest = {
        websiteId: website.id,
        crawlSessionId: crawlSession.id,
        url: request.pageUrl,
        title: request.title,
        depthLevel: 0, // Manual pages are considered root level
        status: 'discovered',
        priority,
        discoveryMethod: 'manual',
        metadata: {
          ...request.metadata,
          addedManually: true,
          addedAt: new Date().toISOString(),
          originalWebsiteUrl: request.websiteUrl
        }
      };

      const page = await this.pageRepository.create(pageRequest);

      // Step 6: Update crawl session statistics
      await this.updateCrawlSessionStats(crawlSession.id);

      return {
        success: true,
        page,
        website,
        crawlSession,
        message: `Manual page added successfully: ${page.url}`
      };

    } catch (error) {
      throw new Error(`Failed to add manual page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async ensureWebsite(websiteUrl: string, description?: string): Promise<Website> {
    const websiteUrlObj = new URL(websiteUrl);
    const domain = websiteUrlObj.hostname;

    // Check if website already exists
    let website = await this.websiteRepository.findByDomain(domain);
    
    if (!website) {
      // Create new website
      website = await this.websiteRepository.create({
        domain,
        baseUrl: websiteUrl,
        title: domain,
        description: description || `Website for ${domain}`,
        metadata: {
          createdVia: 'manual_page_addition'
        }
      });
    }

    return website;
  }

  private async ensureManualCrawlSession(websiteId: string): Promise<CrawlSession> {
    // Look for existing manual crawl session
    const existingSessions = await this.crawlSessionRepository.findByWebsiteId(websiteId);
    const manualSession = existingSessions.find(session => 
      session.metadata && 
      typeof session.metadata === 'object' && 
      'type' in session.metadata && 
      session.metadata.type === 'manual' && 
      session.status !== 'cancelled'
    );

    if (manualSession) {
      return manualSession;
    }

    // Create new manual crawl session
    return await this.crawlSessionRepository.create({
      websiteId,
      maxPages: 999, // High limit for manual additions
      maxDepth: 0,   // Not applicable for manual additions
      metadata: {
        type: 'manual',
        description: 'Manual page additions',
        createdAt: new Date().toISOString()
      }
    });
  }

  private calculateManualPagePriority(url: string): number {
    // Manual pages get high priority by default since user specifically selected them
    let priority = 80; // High base priority

    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.toLowerCase();

      // Boost for key page types
      if (path === '/' || path === '') priority = 100;
      else if (path.includes('about')) priority = 90;
      else if (path.includes('contact')) priority = 90;
      else if (path.includes('docs') || path.includes('documentation')) priority = 85;
      else if (path.includes('api')) priority = 85;
      else if (path.includes('guide') || path.includes('tutorial')) priority = 80;
      else if (path.includes('blog') || path.includes('news')) priority = 75;

      return Math.min(100, priority);
    } catch {
      return 80; // Default high priority for manual additions
    }
  }

  private async updateCrawlSessionStats(crawlSessionId: string): Promise<void> {
    // The database triggers should handle this automatically,
    // but we can explicitly update the session status
    await this.crawlSessionRepository.update(crawlSessionId, {
      status: CrawlSessionStatus.PROCESSING // Keep session active for more manual additions
    });
  }
}
