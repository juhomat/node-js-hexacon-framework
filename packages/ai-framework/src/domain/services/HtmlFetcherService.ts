/**
 * HTML Fetcher Service
 * 
 * Responsible for fetching raw HTML content from web pages.
 * Handles various scenarios like redirects, timeouts, and different content types.
 */

import axios, { AxiosResponse } from 'axios';
import { URL } from 'url';

export interface FetchHtmlOptions {
  timeout?: number;
  userAgent?: string;
  followRedirects?: boolean;
  maxRedirects?: number;
  acceptLanguage?: string;
  customHeaders?: Record<string, string>;
}

export interface FetchHtmlResult {
  success: boolean;
  url: string;
  finalUrl: string; // After redirects
  html: string;
  statusCode: number;
  contentType: string;
  contentLength: number;
  responseTimeMs: number;
  metadata: {
    redirectCount: number;
    encoding: string;
    lastModified?: string;
    etag?: string;
    cacheControl?: string;
  };
  error?: string;
}

export class HtmlFetcherService {
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private readonly DEFAULT_USER_AGENT = 'AI-Framework-ContentExtractor/1.0 (+https://github.com/ai-framework)';

  async fetchHtml(url: string, options: FetchHtmlOptions = {}): Promise<FetchHtmlResult> {
    const startTime = Date.now();
    
    try {
      // Validate URL
      const urlObj = new URL(url);
      
      const config = {
        timeout: options.timeout || this.DEFAULT_TIMEOUT,
        maxRedirects: options.maxRedirects || 5,
        headers: {
          'User-Agent': options.userAgent || this.DEFAULT_USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': options.acceptLanguage || 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          ...options.customHeaders
        },
        validateStatus: (status: number) => status < 500 // Accept redirects and client errors
      };

      console.log(`🌐 Fetching HTML from: ${url}`);
      
      const response: AxiosResponse = await axios.get(url, config);
      const responseTime = Date.now() - startTime;

      // Check if we got HTML content
      const contentType = response.headers['content-type'] || '';
      if (!this.isHtmlContent(contentType)) {
        return {
          success: false,
          url,
          finalUrl: response.request.res.responseUrl || url,
          html: '',
          statusCode: response.status,
          contentType,
          contentLength: 0,
          responseTimeMs: responseTime,
          metadata: {
            redirectCount: this.getRedirectCount(response),
            encoding: 'utf-8'
          },
          error: `Not HTML content. Content-Type: ${contentType}`
        };
      }

      // Success case
      const html = response.data;
      const contentLength = Buffer.byteLength(html, 'utf8');
      
      console.log(`✅ Fetched ${contentLength} bytes in ${responseTime}ms from ${url}`);

      return {
        success: true,
        url,
        finalUrl: response.request.res.responseUrl || url,
        html,
        statusCode: response.status,
        contentType,
        contentLength,
        responseTimeMs: responseTime,
        metadata: {
          redirectCount: this.getRedirectCount(response),
          encoding: this.getEncoding(response),
          lastModified: response.headers['last-modified'],
          etag: response.headers['etag'],
          cacheControl: response.headers['cache-control']
        }
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      console.error(`❌ Failed to fetch ${url}:`, error.message);

      return {
        success: false,
        url,
        finalUrl: url,
        html: '',
        statusCode: error.response?.status || 0,
        contentType: error.response?.headers?.['content-type'] || '',
        contentLength: 0,
        responseTimeMs: responseTime,
        metadata: {
          redirectCount: 0,
          encoding: 'utf-8'
        },
        error: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Batch fetch multiple URLs with concurrency control
   */
  async fetchMultiple(
    urls: string[], 
    options: FetchHtmlOptions = {}, 
    concurrency: number = 5
  ): Promise<FetchHtmlResult[]> {
    console.log(`🚀 Batch fetching ${urls.length} URLs with concurrency ${concurrency}`);
    
    const results: FetchHtmlResult[] = [];
    
    // Process URLs in batches
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchPromises = batch.map(url => this.fetchHtml(url, options));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      console.log(`📦 Completed batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(urls.length / concurrency)}`);
      
      // Small delay between batches to be respectful
      if (i + concurrency < urls.length) {
        await this.delay(500);
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Batch complete: ${successCount}/${urls.length} successful`);
    
    return results;
  }

  private isHtmlContent(contentType: string): boolean {
    const htmlTypes = [
      'text/html',
      'application/xhtml+xml',
      'application/xml'
    ];
    
    return htmlTypes.some(type => contentType.toLowerCase().includes(type));
  }

  private getRedirectCount(response: AxiosResponse): number {
    // Axios doesn't directly expose redirect count, estimate from response URL difference
    return response.request._redirectable?._redirectCount || 0;
  }

  private getEncoding(response: AxiosResponse): string {
    const contentType = response.headers['content-type'] || '';
    const charsetMatch = contentType.match(/charset=([^;]+)/i);
    return charsetMatch ? charsetMatch[1].toLowerCase() : 'utf-8';
  }

  private getErrorMessage(error: any): string {
    if (error.code === 'ENOTFOUND') {
      return 'Domain not found';
    }
    if (error.code === 'ECONNREFUSED') {
      return 'Connection refused';
    }
    if (error.code === 'ETIMEDOUT') {
      return 'Request timeout';
    }
    if (error.response) {
      return `HTTP ${error.response.status}: ${error.response.statusText}`;
    }
    return error.message || 'Unknown error';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
