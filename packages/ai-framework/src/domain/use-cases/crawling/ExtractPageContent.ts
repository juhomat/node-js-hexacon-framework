/**
 * Extract Page Content Use Case
 * 
 * Orchestrates the content extraction process for discovered pages:
 * 1. Fetches raw HTML from the page URL
 * 2. Extracts main content from the HTML
 * 3. Updates the page record with extracted content
 * 4. Provides detailed extraction results and quality metrics
 */

import { Page } from '../../entities/Page';
import { PageRepository } from '../../repositories/PageRepository';
import { HtmlFetcherService, FetchHtmlOptions, FetchHtmlResult } from '../../services/HtmlFetcherService';
import { ContentExtractionService, ExtractionOptions, ExtractionResult } from '../../services/ContentExtractionService';

export interface ExtractContentRequest {
  pageId?: string;
  url?: string;
  pageTitle?: string;
  fetchOptions?: FetchHtmlOptions;
  extractionOptions?: ExtractionOptions;
  updateDatabase?: boolean;
}

export interface ExtractContentResponse {
  success: boolean;
  page?: Page;
  fetchResult: FetchHtmlResult;
  extractionResult: ExtractionResult;
  processingTimeMs: number;
  message: string;
  error?: string;
}

export class ExtractPageContent {
  constructor(
    private pageRepository: PageRepository,
    private htmlFetcherService: HtmlFetcherService,
    private contentExtractionService: ContentExtractionService
  ) {}

  async execute(request: ExtractContentRequest): Promise<ExtractContentResponse> {
    const startTime = Date.now();

    try {
      // Determine what page to process
      let page: Page | null = null;
      let targetUrl: string;

      if (request.pageId) {
        page = await this.pageRepository.findById(request.pageId);
        if (!page) {
          throw new Error(`Page not found with ID: ${request.pageId}`);
        }
        targetUrl = page.url;
      } else if (request.url) {
        targetUrl = request.url;
      } else {
        throw new Error('Either pageId or url must be provided');
      }

      console.log(`🚀 Starting content extraction for: ${targetUrl}`);

      // Step 1: Fetch HTML content
      console.log(`📥 Fetching HTML...`);
      const fetchResult = await this.htmlFetcherService.fetchHtml(targetUrl, request.fetchOptions);

      if (!fetchResult.success) {
        const processingTime = Date.now() - startTime;
        return {
          success: false,
          page,
          fetchResult,
          extractionResult: this.createFailedExtraction('Failed to fetch HTML'),
          processingTimeMs: processingTime,
          message: `Failed to fetch HTML: ${fetchResult.error}`,
          error: fetchResult.error
        };
      }

      // Step 2: Extract content from HTML
      console.log(`🔍 Extracting content...`);
      const extractionResult = await this.contentExtractionService.extractContent(
        fetchResult.html,
        fetchResult.finalUrl,
        request.extractionOptions
      );

      if (!extractionResult.success) {
        const processingTime = Date.now() - startTime;
        return {
          success: false,
          page,
          fetchResult,
          extractionResult,
          processingTimeMs: processingTime,
          message: `Content extraction failed: ${extractionResult.error}`,
          error: extractionResult.error
        };
      }

      // Step 3: Update database if requested and page exists
      if (request.updateDatabase && page) {
        console.log(`💾 Updating database...`);
        
        const updatedPage = await this.pageRepository.updateContent(page.id, {
          title: extractionResult.title || request.pageTitle || page.title,
          content: extractionResult.cleanText,
          rawHtml: fetchResult.html,
          tokenCount: extractionResult.estimatedTokens,
          crawledAt: new Date(),
          metadata: {
            ...page.metadata,
            extraction: {
              contentLength: extractionResult.characterCount,
              wordCount: extractionResult.wordCount,
              qualityScore: extractionResult.quality.score,
              extractionMethod: extractionResult.metadata.extractionMethod,
              language: extractionResult.metadata.language,
              author: extractionResult.metadata.author,
              description: extractionResult.metadata.description,
              images: extractionResult.metadata.images.length,
              links: extractionResult.metadata.links.length,
              headings: extractionResult.metadata.headings.length,
              extractedAt: new Date().toISOString(),
              fetchTime: fetchResult.responseTimeMs,
              contentRatio: extractionResult.quality.contentRatio
            },
            fetch: {
              finalUrl: fetchResult.finalUrl,
              statusCode: fetchResult.statusCode,
              contentType: fetchResult.contentType,
              contentLength: fetchResult.contentLength,
              responseTime: fetchResult.responseTimeMs,
              redirectCount: fetchResult.metadata.redirectCount,
              lastModified: fetchResult.metadata.lastModified,
              etag: fetchResult.metadata.etag
            }
          }
        });

        // Update page status to completed
        await this.pageRepository.updateStatus(page.id, 'completed', {
          completedAt: new Date().toISOString(),
          extractionQuality: extractionResult.quality.score
        });

        page = updatedPage;
      }

      const processingTime = Date.now() - startTime;

      console.log(`✅ Content extraction completed in ${processingTime}ms`);
      console.log(`📊 Extracted ${extractionResult.wordCount} words, quality score: ${extractionResult.quality.score}`);

      return {
        success: true,
        page,
        fetchResult,
        extractionResult,
        processingTimeMs: processingTime,
        message: `Successfully extracted ${extractionResult.wordCount} words with quality score ${extractionResult.quality.score}`
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Content extraction failed:`, error.message);

      return {
        success: false,
        page: null,
        fetchResult: this.createFailedFetch(request.url || 'unknown'),
        extractionResult: this.createFailedExtraction(error.message),
        processingTimeMs: processingTime,
        message: `Content extraction failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Extract content from multiple pages in batch
   */
  async extractBatch(
    pages: Page[], 
    options: { 
      concurrency?: number;
      fetchOptions?: FetchHtmlOptions;
      extractionOptions?: ExtractionOptions;
      updateDatabase?: boolean;
    } = {}
  ): Promise<ExtractContentResponse[]> {
    const { concurrency = 3, updateDatabase = true } = options;
    
    console.log(`🚀 Starting batch content extraction for ${pages.length} pages with concurrency ${concurrency}`);
    
    const results: ExtractContentResponse[] = [];
    
    // Process pages in batches
    for (let i = 0; i < pages.length; i += concurrency) {
      const batch = pages.slice(i, i + concurrency);
      const batchPromises = batch.map(page => 
        this.execute({
          pageId: page.id,
          updateDatabase,
          fetchOptions: options.fetchOptions,
          extractionOptions: options.extractionOptions
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      console.log(`📦 Completed batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(pages.length / concurrency)}`);
      
      // Small delay between batches to be respectful
      if (i + concurrency < pages.length) {
        await this.delay(1000);
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Batch extraction complete: ${successCount}/${pages.length} successful`);
    
    return results;
  }

  private createFailedFetch(url: string): FetchHtmlResult {
    return {
      success: false,
      url,
      finalUrl: url,
      html: '',
      statusCode: 0,
      contentType: '',
      contentLength: 0,
      responseTimeMs: 0,
      metadata: {
        redirectCount: 0,
        encoding: 'utf-8'
      },
      error: 'Fetch operation failed'
    };
  }

  private createFailedExtraction(error: string): ExtractionResult {
    return {
      success: false,
      title: '',
      content: '',
      cleanText: '',
      wordCount: 0,
      characterCount: 0,
      estimatedTokens: 0,
      metadata: {
        extractionMethod: 'failed',
        images: [],
        links: [],
        headings: []
      },
      quality: {
        score: 0,
        reasons: ['Extraction failed'],
        contentRatio: 0
      },
      error
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
