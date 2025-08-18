/**
 * Crawling Pipeline Application
 * 
 * Orchestrates the complete end-to-end crawling and processing pipeline:
 * 1. Website discovery and page prioritization
 * 2. Content extraction from discovered pages
 * 3. Text chunking with intelligent boundaries
 * 4. Vector embedding generation
 * 5. Database storage with metadata
 * 
 * Provides two main workflows:
 * - Full website crawling (URL + depth + page limit)
 * - Manual page addition (website + specific page URL)
 */

import { WebsiteDiscoveryApplication } from './WebsiteDiscoveryApplication';
import { ExtractPageContent } from '../domain/use-cases/crawling/ExtractPageContent';
import { ChunkAndEmbedContent } from '../domain/use-cases/crawling/ChunkAndEmbedContent';
import { AddManualPage } from '../domain/use-cases/crawling/AddManualPage';

// Repositories
import { WebsiteRepository } from '../domain/repositories/WebsiteRepository';
import { PageRepository } from '../domain/repositories/PageRepository';
import { CrawlSessionRepository } from '../domain/repositories/CrawlSessionRepository';
import { ChunkRepository } from '../domain/repositories/ChunkRepository';

// Services
import { PageDiscoveryService } from '../domain/services/PageDiscoveryService';
import { HtmlFetcherService } from '../domain/services/HtmlFetcherService';
import { ContentExtractionService } from '../domain/services/ContentExtractionService';
import { TextChunkingService } from '../domain/services/TextChunkingService';
import { EmbeddingService } from '../domain/services/EmbeddingService';

// Types
import { Website } from '../domain/entities/Website';
import { Page } from '../domain/entities/Page';
import { CrawlSession } from '../domain/entities/CrawlSession';

export interface FullCrawlRequest {
  websiteUrl: string;
  maxPages?: number;        // Default: 10
  maxDepth?: number;        // Default: 1
  description?: string;     // Optional website description
  sessionMetadata?: Record<string, any>;
}

export interface AddPageRequest {
  websiteUrl: string;
  pageUrl: string;
  title?: string;
  description?: string;
  priority?: number;        // Default: 80 for manual pages
}

export interface PipelineProgress {
  stage: 'discovery' | 'extraction' | 'chunking' | 'embedding' | 'completed';
  message: string;
  progress: number;         // 0-100
  details: {
    websiteId?: string;
    sessionId?: string;
    pagesDiscovered?: number;
    pagesProcessed?: number;
    chunksCreated?: number;
    embeddingsGenerated?: number;
    totalCost?: number;
    errors?: string[];
  };
  timestamp: string;
}

export interface PipelineResult {
  success: boolean;
  website: Website;
  session?: CrawlSession;
  summary: {
    pagesDiscovered: number;
    pagesProcessed: number;
    chunksCreated: number;
    embeddingsGenerated: number;
    processingTimeMs: number;
    totalCost: number;
    averageQuality: number;
  };
  pages: ProcessedPageSummary[];
  message: string;
  error?: string;
}

export interface ProcessedPageSummary {
  id: string;
  url: string;
  title: string;
  status: 'completed' | 'failed';
  chunksCreated: number;
  embeddingsGenerated: number;
  quality: number;
  tokenCount: number;
  processingTimeMs: number;
  error?: string;
}

export class CrawlingPipelineApplication {
  private websiteDiscoveryApp: WebsiteDiscoveryApplication;
  private extractPageContentUseCase: ExtractPageContent;
  private chunkAndEmbedUseCase: ChunkAndEmbedContent;
  private addManualPageUseCase: AddManualPage;

  constructor(
    // Repositories
    private websiteRepository: WebsiteRepository,
    private pageRepository: PageRepository,
    private crawlSessionRepository: CrawlSessionRepository,
    private chunkRepository: ChunkRepository,
    // Services
    private pageDiscoveryService: PageDiscoveryService,
    private htmlFetcherService: HtmlFetcherService,
    private contentExtractionService: ContentExtractionService,
    private textChunkingService: TextChunkingService,
    private embeddingService: EmbeddingService
  ) {
    // Initialize application services and use cases
    this.websiteDiscoveryApp = new WebsiteDiscoveryApplication(
      this.websiteRepository,
      this.pageRepository,
      this.crawlSessionRepository,
      this.pageDiscoveryService
    );

    this.extractPageContentUseCase = new ExtractPageContent(
      this.pageRepository,
      this.htmlFetcherService,
      this.contentExtractionService,
      this.crawlSessionRepository,
      this.websiteRepository
    );

    this.chunkAndEmbedUseCase = new ChunkAndEmbedContent(
      this.pageRepository,
      this.chunkRepository,
      this.textChunkingService,
      this.embeddingService
    );

    this.addManualPageUseCase = new AddManualPage(
      this.websiteRepository,
      this.pageRepository,
      this.crawlSessionRepository
    );
  }

  /**
   * Full website crawling pipeline
   * URL + depth + page limit → complete processing
   */
  async executeFullCrawl(
    request: FullCrawlRequest,
    progressCallback?: (progress: PipelineProgress) => void
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    
    try {
      this.emitProgress(progressCallback, {
        stage: 'discovery',
        message: `Starting website discovery for ${request.websiteUrl}`,
        progress: 0,
        details: {},
        timestamp: new Date().toISOString()
      });

      // Stage 1: Website Discovery and Page Prioritization
      console.log(`🚀 Starting full crawl pipeline for: ${request.websiteUrl}`);
      console.log(`📊 Parameters: maxPages=${request.maxPages || 10}, maxDepth=${request.maxDepth || 1}`);

      const discoveryResult = await this.websiteDiscoveryApp.discoverWebsiteSimple({
        websiteUrl: request.websiteUrl,
        maxPages: request.maxPages || 10,
        maxDepth: request.maxDepth || 1,
        description: request.description,
        metadata: request.sessionMetadata
      });

      if (!discoveryResult.success) {
        throw new Error(`Website discovery failed: ${discoveryResult.message}`);
      }

      this.emitProgress(progressCallback, {
        stage: 'discovery',
        message: `Discovered ${discoveryResult.pages.length} pages`,
        progress: 20,
        details: {
          websiteId: discoveryResult.website.id,
          sessionId: discoveryResult.session?.id,
          pagesDiscovered: discoveryResult.pages.length
        },
        timestamp: new Date().toISOString()
      });

      // Stage 2: Content Extraction for all discovered pages
      this.emitProgress(progressCallback, {
        stage: 'extraction',
        message: 'Starting content extraction...',
        progress: 25,
        details: {
          websiteId: discoveryResult.website.id,
          sessionId: discoveryResult.session?.id,
          pagesDiscovered: discoveryResult.pages.length
        },
        timestamp: new Date().toISOString()
      });

      const extractionResults = await this.extractContentForPages(
        discoveryResult.pages,
        (completed, total) => {
          this.emitProgress(progressCallback, {
            stage: 'extraction',
            message: `Extracting content: ${completed}/${total} pages`,
            progress: 25 + (completed / total) * 25, // 25-50%
            details: {
              websiteId: discoveryResult.website.id,
              sessionId: discoveryResult.session?.id,
              pagesDiscovered: total,
              pagesProcessed: completed
            },
            timestamp: new Date().toISOString()
          });
        }
      );

      const successfulExtractions = extractionResults.filter(r => r.success);
      console.log(`✅ Content extraction completed: ${successfulExtractions.length}/${extractionResults.length} successful`);

      // Stage 3: Chunking and Embedding for extracted pages
      this.emitProgress(progressCallback, {
        stage: 'chunking',
        message: 'Starting chunking and embedding...',
        progress: 50,
        details: {
          websiteId: discoveryResult.website.id,
          sessionId: discoveryResult.session?.id,
          pagesDiscovered: discoveryResult.pages.length,
          pagesProcessed: successfulExtractions.length
        },
        timestamp: new Date().toISOString()
      });

      // Get pages with extracted content
      const pagesWithContent = await this.pageRepository.findByCrawlSessionId(
        discoveryResult.session!.id,
        { 
          limit: 100,
          hasContent: true,
          orderBy: 'priority',
          orderDirection: 'desc'
        }
      );

      const chunkingResults = await this.chunkAndEmbedUseCase.processBatch(
        pagesWithContent,
        {
          concurrency: 2,
          updateDatabase: true,
          chunkingOptions: {
            minTokens: 300,
            maxTokens: 400,
            overlapPercent: 17.5
          },
          embeddingOptions: {
            model: 'text-embedding-3-small'
          }
        }
      );

      const successfulChunking = chunkingResults.filter(r => r.success);
      const totalChunks = successfulChunking.reduce((sum, r) => sum + r.chunksCreated, 0);
      const totalEmbeddings = successfulChunking.reduce((sum, r) => sum + r.embeddingsGenerated, 0);
      const totalCost = chunkingResults.reduce((sum, r) => sum + r.estimatedCost, 0);

      this.emitProgress(progressCallback, {
        stage: 'embedding',
        message: `Generated ${totalEmbeddings} embeddings in ${totalChunks} chunks`,
        progress: 90,
        details: {
          websiteId: discoveryResult.website.id,
          sessionId: discoveryResult.session?.id,
          pagesDiscovered: discoveryResult.pages.length,
          pagesProcessed: successfulExtractions.length,
          chunksCreated: totalChunks,
          embeddingsGenerated: totalEmbeddings,
          totalCost
        },
        timestamp: new Date().toISOString()
      });

      // Stage 4: Final summary and completion
      const processingTime = Date.now() - startTime;
      const avgQuality = successfulChunking.length > 0 
        ? successfulChunking.reduce((sum, r) => sum + r.quality.averageChunkQuality, 0) / successfulChunking.length
        : 0;

      const processedPages: ProcessedPageSummary[] = pagesWithContent.map(page => {
        const extractionResult = extractionResults.find(r => r.page?.id === page.id);
        const chunkingResult = chunkingResults.find(r => r.page?.id === page.id);
        
        return {
          id: page.id,
          url: page.url,
          title: page.title || 'Unknown',
          status: (extractionResult?.success && chunkingResult?.success) ? 'completed' : 'failed',
          chunksCreated: chunkingResult?.chunksCreated || 0,
          embeddingsGenerated: chunkingResult?.embeddingsGenerated || 0,
          quality: chunkingResult?.quality.averageChunkQuality || 0,
          tokenCount: page.tokenCount || 0,
          processingTimeMs: (chunkingResult?.processingTimeMs || 0) + (extractionResult?.processingTimeMs || 0),
          error: extractionResult?.error || chunkingResult?.error
        };
      });

      this.emitProgress(progressCallback, {
        stage: 'completed',
        message: `Pipeline completed successfully! ${totalChunks} chunks, ${totalEmbeddings} embeddings`,
        progress: 100,
        details: {
          websiteId: discoveryResult.website.id,
          sessionId: discoveryResult.session?.id,
          pagesDiscovered: discoveryResult.pages.length,
          pagesProcessed: successfulExtractions.length,
          chunksCreated: totalChunks,
          embeddingsGenerated: totalEmbeddings,
          totalCost
        },
        timestamp: new Date().toISOString()
      });

      console.log(`🎉 Full crawl pipeline completed in ${processingTime}ms`);
      console.log(`📊 Summary: ${discoveryResult.pages.length} pages discovered, ${successfulExtractions.length} extracted, ${totalChunks} chunks, ${totalEmbeddings} embeddings`);
      console.log(`💰 Total cost: $${totalCost.toFixed(4)}`);

      return {
        success: true,
        website: discoveryResult.website,
        session: discoveryResult.session,
        summary: {
          pagesDiscovered: discoveryResult.pages.length,
          pagesProcessed: successfulExtractions.length,
          chunksCreated: totalChunks,
          embeddingsGenerated: totalEmbeddings,
          processingTimeMs: processingTime,
          totalCost,
          averageQuality: avgQuality
        },
        pages: processedPages,
        message: `Successfully processed ${successfulExtractions.length} pages with ${totalChunks} chunks and ${totalEmbeddings} embeddings`
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Full crawl pipeline failed:`, error.message);

      this.emitProgress(progressCallback, {
        stage: 'completed',
        message: `Pipeline failed: ${error.message}`,
        progress: 0,
        details: {
          errors: [error.message]
        },
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        website: {} as Website,
        summary: {
          pagesDiscovered: 0,
          pagesProcessed: 0,
          chunksCreated: 0,
          embeddingsGenerated: 0,
          processingTimeMs: processingTime,
          totalCost: 0,
          averageQuality: 0
        },
        pages: [],
        message: `Pipeline failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Manual page addition pipeline
   * Website + Page URL → add + extract + chunk + embed
   */
  async executeAddPage(
    request: AddPageRequest,
    progressCallback?: (progress: PipelineProgress) => void
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    
    try {
      this.emitProgress(progressCallback, {
        stage: 'discovery',
        message: `Adding page ${request.pageUrl} to ${request.websiteUrl}`,
        progress: 0,
        details: {},
        timestamp: new Date().toISOString()
      });

      // Stage 1: Add manual page
      console.log(`🚀 Starting manual page addition pipeline`);
      console.log(`🌐 Website: ${request.websiteUrl}`);
      console.log(`📄 Page: ${request.pageUrl}`);

      const addPageResult = await this.addManualPageUseCase.execute({
        websiteUrl: request.websiteUrl,
        pageUrl: request.pageUrl,
        title: request.title,
        description: request.description,
        priority: request.priority || 80
      });

      if (!addPageResult.success) {
        throw new Error(`Failed to add page: ${addPageResult.message}`);
      }

      this.emitProgress(progressCallback, {
        stage: 'discovery',
        message: 'Page added successfully',
        progress: 25,
        details: {
          websiteId: addPageResult.website.id,
          sessionId: addPageResult.session.id,
          pagesDiscovered: 1
        },
        timestamp: new Date().toISOString()
      });

      // Stage 2: Extract content
      this.emitProgress(progressCallback, {
        stage: 'extraction',
        message: 'Extracting page content...',
        progress: 30,
        details: {
          websiteId: addPageResult.website.id,
          sessionId: addPageResult.session.id,
          pagesDiscovered: 1
        },
        timestamp: new Date().toISOString()
      });

      const extractionResult = await this.extractPageContentUseCase.execute({
        pageId: addPageResult.page.id,
        updateDatabase: true
      });

      if (!extractionResult.success) {
        throw new Error(`Content extraction failed: ${extractionResult.error}`);
      }

      this.emitProgress(progressCallback, {
        stage: 'extraction',
        message: 'Content extracted successfully',
        progress: 60,
        details: {
          websiteId: addPageResult.website.id,
          sessionId: addPageResult.session.id,
          pagesDiscovered: 1,
          pagesProcessed: 1
        },
        timestamp: new Date().toISOString()
      });

      // Stage 3: Chunk and embed
      this.emitProgress(progressCallback, {
        stage: 'chunking',
        message: 'Chunking and generating embeddings...',
        progress: 65,
        details: {
          websiteId: addPageResult.website.id,
          sessionId: addPageResult.session.id,
          pagesDiscovered: 1,
          pagesProcessed: 1
        },
        timestamp: new Date().toISOString()
      });

      const chunkingResult = await this.chunkAndEmbedUseCase.execute({
        pageId: addPageResult.page.id,
        updateDatabase: true,
        chunkingOptions: {
          minTokens: 300,
          maxTokens: 400,
          overlapPercent: 17.5
        },
        embeddingOptions: {
          model: 'text-embedding-3-small'
        }
      });

      if (!chunkingResult.success) {
        throw new Error(`Chunking and embedding failed: ${chunkingResult.error}`);
      }

      const processingTime = Date.now() - startTime;

      this.emitProgress(progressCallback, {
        stage: 'completed',
        message: `Page processing completed! ${chunkingResult.chunksCreated} chunks, ${chunkingResult.embeddingsGenerated} embeddings`,
        progress: 100,
        details: {
          websiteId: addPageResult.website.id,
          sessionId: addPageResult.session.id,
          pagesDiscovered: 1,
          pagesProcessed: 1,
          chunksCreated: chunkingResult.chunksCreated,
          embeddingsGenerated: chunkingResult.embeddingsGenerated,
          totalCost: chunkingResult.estimatedCost
        },
        timestamp: new Date().toISOString()
      });

      console.log(`🎉 Manual page addition pipeline completed in ${processingTime}ms`);
      console.log(`📊 Summary: ${chunkingResult.chunksCreated} chunks, ${chunkingResult.embeddingsGenerated} embeddings`);
      console.log(`💰 Total cost: $${chunkingResult.estimatedCost.toFixed(4)}`);

      const processedPage: ProcessedPageSummary = {
        id: addPageResult.page.id,
        url: addPageResult.page.url,
        title: addPageResult.page.title || request.title || 'Unknown',
        status: 'completed',
        chunksCreated: chunkingResult.chunksCreated,
        embeddingsGenerated: chunkingResult.embeddingsGenerated,
        quality: chunkingResult.quality.averageChunkQuality,
        tokenCount: extractionResult.tokenCount || 0,
        processingTimeMs: processingTime
      };

      return {
        success: true,
        website: addPageResult.website,
        session: addPageResult.session,
        summary: {
          pagesDiscovered: 1,
          pagesProcessed: 1,
          chunksCreated: chunkingResult.chunksCreated,
          embeddingsGenerated: chunkingResult.embeddingsGenerated,
          processingTimeMs: processingTime,
          totalCost: chunkingResult.estimatedCost,
          averageQuality: chunkingResult.quality.averageChunkQuality
        },
        pages: [processedPage],
        message: `Successfully processed page with ${chunkingResult.chunksCreated} chunks and ${chunkingResult.embeddingsGenerated} embeddings`
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Manual page addition pipeline failed:`, error.message);

      this.emitProgress(progressCallback, {
        stage: 'completed',
        message: `Pipeline failed: ${error.message}`,
        progress: 0,
        details: {
          errors: [error.message]
        },
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        website: {} as Website,
        summary: {
          pagesDiscovered: 0,
          pagesProcessed: 0,
          chunksCreated: 0,
          embeddingsGenerated: 0,
          processingTimeMs: processingTime,
          totalCost: 0,
          averageQuality: 0
        },
        pages: [],
        message: `Pipeline failed: ${error.message}`,
        error: error.message
      };
    }
  }

  private async extractContentForPages(
    pages: Page[],
    progressCallback?: (completed: number, total: number) => void
  ): Promise<any[]> {
    const results: any[] = [];
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      
      try {
        const result = await this.extractPageContentUseCase.execute({
          pageId: page.id,
          updateDatabase: true
        });
        
        results.push(result);
        
        if (progressCallback) {
          progressCallback(i + 1, pages.length);
        }
        
        // Small delay between extractions to be respectful
        if (i < pages.length - 1) {
          await this.delay(500);
        }
        
      } catch (error: any) {
        console.error(`❌ Failed to extract content for page ${page.url}:`, error.message);
        results.push({
          success: false,
          page,
          error: error.message
        });
      }
    }
    
    return results;
  }

  private emitProgress(
    callback: ((progress: PipelineProgress) => void) | undefined,
    progress: PipelineProgress
  ): void {
    if (callback) {
      callback(progress);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
