/**
 * Content Extraction Service
 * 
 * Extracts main content from HTML pages, removing navigation, headers, footers,
 * and other boilerplate elements to get clean, readable content.
 */

import * as cheerio from 'cheerio';
import { URL } from 'url';

export interface ExtractionOptions {
  preserveFormatting?: boolean;
  includeLinks?: boolean;
  includeImages?: boolean;
  minTextLength?: number;
  removeSelectors?: string[];
  preserveSelectors?: string[];
  extractTitle?: boolean;
  extractMetadata?: boolean;
}

export interface ExtractionResult {
  success: boolean;
  title: string;
  content: string;
  cleanText: string;
  wordCount: number;
  characterCount: number;
  estimatedTokens: number;
  metadata: {
    extractionMethod: string;
    language?: string;
    author?: string;
    publishDate?: string;
    description?: string;
    keywords?: string[];
    canonicalUrl?: string;
    images: ImageInfo[];
    links: LinkInfo[];
    headings: HeadingInfo[];
  };
  quality: {
    score: number; // 0-100
    reasons: string[];
    contentRatio: number; // ratio of content to total HTML
  };
  error?: string;
}

export interface ImageInfo {
  src: string;
  alt: string;
  title?: string;
}

export interface LinkInfo {
  href: string;
  text: string;
  isInternal: boolean;
}

export interface HeadingInfo {
  level: number; // 1-6
  text: string;
  id?: string;
}

export class ContentExtractionService {
  private readonly DEFAULT_OPTIONS: ExtractionOptions = {
    preserveFormatting: true,
    includeLinks: true,
    includeImages: false,
    minTextLength: 100,
    removeSelectors: [],
    preserveSelectors: [],
    extractTitle: true,
    extractMetadata: true
  };

  async extractContent(html: string, url: string, options: ExtractionOptions = {}): Promise<ExtractionResult> {
    try {
      const opts = { ...this.DEFAULT_OPTIONS, ...options };
      const $ = cheerio.load(html);
      const originalSize = html.length;

      console.log(`🔍 Extracting content from ${url}`);

      // Remove script and style elements first
      $('script, style, noscript').remove();

      // Remove common boilerplate selectors
      this.removeBoilerplate($);

      // Remove user-specified selectors
      if (opts.removeSelectors?.length) {
        opts.removeSelectors.forEach(selector => $(selector).remove());
      }

      // Extract title
      const title = this.extractTitle($, url);

      // Extract metadata
      const metadata = opts.extractMetadata ? this.extractMetadata($, url) : {
        extractionMethod: 'basic',
        images: [],
        links: [],
        headings: []
      };

      // Try different content extraction strategies
      let content = '';
      let extractionMethod = 'basic';

      // Strategy 1: Look for article/main content
      content = this.tryMainContentExtraction($);
      if (content) {
        extractionMethod = 'semantic';
      }

      // Strategy 2: Look for content by common patterns
      if (!content || content.length < opts.minTextLength!) {
        content = this.tryPatternBasedExtraction($);
        if (content) {
          extractionMethod = 'pattern-based';
        }
      }

      // Strategy 3: Fallback to body content with aggressive cleaning
      if (!content || content.length < opts.minTextLength!) {
        content = this.tryAggressiveExtraction($);
        extractionMethod = 'aggressive';
      }

      // Clean up the extracted content
      const cleanText = this.cleanText(content);
      const wordCount = this.countWords(cleanText);
      const characterCount = cleanText.length;
      const estimatedTokens = Math.ceil(wordCount * 1.3); // Rough estimate

      // Calculate quality score
      const quality = this.assessQuality(cleanText, originalSize, extractionMethod);

      console.log(`✅ Extracted ${wordCount} words (${characterCount} chars) using ${extractionMethod} method`);

      return {
        success: true,
        title,
        content: opts.preserveFormatting ? content : cleanText,
        cleanText,
        wordCount,
        characterCount,
        estimatedTokens,
        metadata: {
          ...metadata,
          extractionMethod
        },
        quality
      };

    } catch (error: any) {
      console.error(`❌ Content extraction failed for ${url}:`, error.message);

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
        error: error.message
      };
    }
  }

  private removeBoilerplate($: cheerio.CheerioAPI): void {
    // Remove common navigation and boilerplate elements
    const boilerplateSelectors = [
      'nav, .nav, .navigation, .navbar, .menu',
      'header, .header, .site-header, .page-header',
      'footer, .footer, .site-footer, .page-footer',
      '.sidebar, .side-bar, aside',
      '.advertisement, .ad, .ads, .banner',
      '.social, .social-media, .share, .sharing',
      '.comments, .comment-section',
      '.related, .related-posts, .recommendations',
      '.breadcrumb, .breadcrumbs',
      '.pagination, .pager',
      '.cookie-notice, .cookie-banner',
      '.search, .search-form, .search-box',
      '.newsletter, .subscription',
      '.popup, .modal, .overlay',
      '.skip-link, .screen-reader-text'
    ];

    boilerplateSelectors.forEach(selector => {
      $(selector).remove();
    });
  }

  private extractTitle($: cheerio.CheerioAPI, url: string): string {
    // Try different title sources in order of preference
    const titleSources = [
      'h1',
      'title',
      '.title, .page-title, .post-title, .article-title',
      '[property="og:title"]',
      '[name="twitter:title"]'
    ];

    for (const selector of titleSources) {
      const element = $(selector).first();
      if (element.length) {
        const title = element.attr('content') || element.text().trim();
        if (title && title.length > 3) {
          return this.cleanTitle(title);
        }
      }
    }

    // Fallback to URL-based title
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      return pathParts[pathParts.length - 1]?.replace(/[-_]/g, ' ') || 'Untitled';
    } catch {
      return 'Untitled';
    }
  }

  private extractMetadata($: cheerio.CheerioAPI, url: string): ExtractionResult['metadata'] {
    const metadata: ExtractionResult['metadata'] = {
      extractionMethod: 'metadata',
      images: [],
      links: [],
      headings: []
    };

    // Extract language
    metadata.language = $('html').attr('lang') || 
                      $('[property="og:locale"]').attr('content') || 
                      'en';

    // Extract author
    metadata.author = $('[name="author"]').attr('content') ||
                     $('[property="article:author"]').attr('content') ||
                     $('.author, .byline').first().text().trim();

    // Extract description
    metadata.description = $('[name="description"]').attr('content') ||
                          $('[property="og:description"]').attr('content');

    // Extract canonical URL
    metadata.canonicalUrl = $('[rel="canonical"]').attr('href') ||
                           $('[property="og:url"]').attr('content');

    // Extract images (if enabled)
    $('img').each((_, img) => {
      const $img = $(img);
      const src = $img.attr('src');
      if (src) {
        metadata.images.push({
          src,
          alt: $img.attr('alt') || '',
          title: $img.attr('title')
        });
      }
    });

    // Extract links
    $('a[href]').each((_, link) => {
      const $link = $(link);
      const href = $link.attr('href');
      const text = $link.text().trim();
      if (href && text) {
        try {
          const isInternal = this.isInternalLink(href, url);
          metadata.links.push({ href, text, isInternal });
        } catch {
          // Invalid URL, skip
        }
      }
    });

    // Extract headings
    $('h1, h2, h3, h4, h5, h6').each((_, heading) => {
      const $heading = $(heading);
      const level = parseInt(heading.tagName.charAt(1));
      const text = $heading.text().trim();
      if (text) {
        metadata.headings.push({
          level,
          text,
          id: $heading.attr('id')
        });
      }
    });

    return metadata;
  }

  private tryMainContentExtraction($: cheerio.CheerioAPI): string {
    // Try semantic HTML5 elements first
    const semanticSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.main-content, .content-main, .page-content',
      '.post-content, .article-content, .entry-content',
      '.content, .body, .text'
    ];

    for (const selector of semanticSelectors) {
      const element = $(selector).first();
      if (element.length) {
        const text = element.text().trim();
        if (text.length > 200) { // Minimum threshold
          return element.html() || '';
        }
      }
    }

    return '';
  }

  private tryPatternBasedExtraction($: cheerio.CheerioAPI): string {
    // Remove elements with low content value
    const lowValueSelectors = [
      '.meta, .metadata, .post-meta',
      '.tags, .categories',
      '.share, .sharing',
      '.author-bio, .about-author'
    ];

    lowValueSelectors.forEach(selector => $(selector).remove());

    // Look for content containers
    const contentSelectors = [
      'div[class*="content"]',
      'div[class*="article"]',
      'div[class*="post"]',
      'div[class*="text"]',
      'div[class*="body"]'
    ];

    let bestContent = '';
    let bestScore = 0;

    contentSelectors.forEach(selector => {
      $(selector).each((_, element) => {
        const $element = $(element);
        const text = $element.text().trim();
        const score = this.scoreContentElement($element, text);
        
        if (score > bestScore && text.length > 100) {
          bestScore = score;
          bestContent = $element.html() || '';
        }
      });
    });

    return bestContent;
  }

  private tryAggressiveExtraction($: cheerio.CheerioAPI): string {
    // Last resort: get all text from body, excluding known bad elements
    const badSelectors = [
      'nav, header, footer, aside',
      '.nav, .menu, .sidebar',
      'script, style, noscript'
    ];

    badSelectors.forEach(selector => $(selector).remove());

    return $('body').html() || '';
  }

  private scoreContentElement($element: cheerio.Cheerio<any>, text: string): number {
    let score = 0;

    // Text length bonus
    score += Math.min(text.length / 100, 50);

    // Paragraph count bonus
    const paragraphs = $element.find('p').length;
    score += paragraphs * 2;

    // Negative scores for certain patterns
    const className = $element.attr('class') || '';
    if (className.match(/nav|menu|sidebar|footer|header/i)) score -= 20;
    if (className.match(/ad|advertisement|banner/i)) score -= 30;

    return score;
  }

  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s*\n/g, '\n\n') // Normalize line breaks
      .trim();
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/\s*[|\-–—]\s*.*$/, '') // Remove site name after separator
      .trim();
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private isInternalLink(href: string, baseUrl: string): boolean {
    try {
      if (href.startsWith('/') || href.startsWith('#')) return true;
      if (href.startsWith('mailto:') || href.startsWith('tel:')) return false;
      
      const linkUrl = new URL(href, baseUrl);
      const baseUrlObj = new URL(baseUrl);
      return linkUrl.hostname === baseUrlObj.hostname;
    } catch {
      return false;
    }
  }

  private assessQuality(content: string, originalSize: number, method: string): ExtractionResult['quality'] {
    let score = 50; // Base score
    const reasons: string[] = [];

    // Content length scoring
    const wordCount = this.countWords(content);
    if (wordCount > 500) {
      score += 20;
      reasons.push('Good content length');
    } else if (wordCount < 100) {
      score -= 20;
      reasons.push('Short content');
    }

    // Extraction method scoring
    if (method === 'semantic') {
      score += 20;
      reasons.push('Used semantic extraction');
    } else if (method === 'aggressive') {
      score -= 15;
      reasons.push('Used fallback extraction');
    }

    // Content ratio
    const contentRatio = content.length / originalSize;
    if (contentRatio > 0.1) {
      score += 10;
      reasons.push('Good content ratio');
    } else {
      score -= 10;
      reasons.push('Low content ratio');
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    return {
      score,
      reasons,
      contentRatio
    };
  }
}
