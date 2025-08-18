/**
 * Text Chunking Service
 * 
 * Splits extracted page content into semantically meaningful chunks for RAG.
 * Uses intelligent boundary detection and token-based sizing with overlap.
 * 
 * Strategy:
 * - Chunk size: 300-400 tokens
 * - Overlap: 15-20% (≈ 50-80 tokens)
 * - Split on: paragraph/sentence boundaries (never mid-sentence)
 */

export interface ChunkingOptions {
  minTokens?: number;        // Default: 300
  maxTokens?: number;        // Default: 400
  overlapPercent?: number;   // Default: 17.5% (midpoint of 15-20%)
  preserveFormatting?: boolean;
  includeMetadata?: boolean;
}

export interface TextChunk {
  content: string;
  tokenCount: number;
  chunkIndex: number;
  startPosition: number;
  endPosition: number;
  overlapStart?: number;     // Tokens of overlap with previous chunk
  overlapEnd?: number;       // Tokens of overlap with next chunk
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  hasHeading: boolean;
  headingLevel?: number;
  headingText?: string;
  paragraphCount: number;
  sentenceCount: number;
  containsLists: boolean;
  containsLinks: boolean;
  quality: {
    score: number;           // 0-100
    completeness: number;    // How complete the chunk feels
    coherence: number;       // How well sentences flow together
  };
  splitReason: 'paragraph' | 'sentence' | 'token_limit' | 'end_of_content';
}

export interface ChunkingResult {
  success: boolean;
  chunks: TextChunk[];
  originalLength: number;
  totalChunks: number;
  averageTokens: number;
  processingTimeMs: number;
  quality: {
    averageScore: number;
    chunkSizeConsistency: number;  // How consistent chunk sizes are
    overlapEffectiveness: number;  // How well overlaps preserve context
  };
  error?: string;
}

export class TextChunkingService {
  private readonly DEFAULT_OPTIONS: ChunkingOptions = {
    minTokens: 300,
    maxTokens: 400,
    overlapPercent: 17.5, // 17.5% = midpoint of 15-20%
    preserveFormatting: false,
    includeMetadata: true
  };

  async chunkText(content: string, options: ChunkingOptions = {}): Promise<ChunkingResult> {
    const startTime = Date.now();
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      console.log(`📝 Chunking text (${content.length} chars) with ${opts.minTokens}-${opts.maxTokens} token chunks`);

      // Validate input
      if (!content || content.trim().length === 0) {
        throw new Error('Content is empty or null');
      }

      // Preprocess content
      const cleanContent = this.preprocessContent(content);
      
      // Split into potential boundaries (paragraphs first, then sentences)
      const boundaries = this.identifyBoundaries(cleanContent);
      
      // Create chunks respecting token limits and boundaries
      const chunks = await this.createChunks(boundaries, opts);
      
      // Add overlaps between chunks
      const chunksWithOverlap = this.addOverlaps(chunks, opts);
      
      // Calculate quality metrics
      const quality = this.assessChunkingQuality(chunksWithOverlap);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Created ${chunksWithOverlap.length} chunks in ${processingTime}ms`);
      console.log(`📊 Average tokens: ${Math.round(chunksWithOverlap.reduce((sum, c) => sum + c.tokenCount, 0) / chunksWithOverlap.length)}`);

      return {
        success: true,
        chunks: chunksWithOverlap,
        originalLength: content.length,
        totalChunks: chunksWithOverlap.length,
        averageTokens: chunksWithOverlap.reduce((sum, c) => sum + c.tokenCount, 0) / chunksWithOverlap.length,
        processingTimeMs: processingTime,
        quality
      };

    } catch (error: any) {
      console.error(`❌ Chunking failed:`, error.message);
      
      return {
        success: false,
        chunks: [],
        originalLength: content.length,
        totalChunks: 0,
        averageTokens: 0,
        processingTimeMs: Date.now() - startTime,
        quality: {
          averageScore: 0,
          chunkSizeConsistency: 0,
          overlapEffectiveness: 0
        },
        error: error.message
      };
    }
  }

  private preprocessContent(content: string): string {
    return content
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')      // Normalize multiple line breaks
      .replace(/[ \t]+/g, ' ')         // Normalize spaces
      .trim();
  }

  private identifyBoundaries(content: string): ContentBoundary[] {
    const boundaries: ContentBoundary[] = [];
    const lines = content.split('\n');
    let currentPosition = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.length === 0) {
        // Empty line - potential paragraph boundary
        if (boundaries.length > 0) {
          boundaries[boundaries.length - 1].isParagraphEnd = true;
        }
      } else {
        // Check if this line looks like a heading
        const headingMatch = this.detectHeading(line);
        
        // Split line into sentences
        const sentences = this.splitIntoSentences(line);
        
        for (let j = 0; j < sentences.length; j++) {
          const sentence = sentences[j].trim();
          if (sentence.length > 0) {
            boundaries.push({
              text: sentence,
              startPosition: currentPosition,
              endPosition: currentPosition + sentence.length,
              isHeading: headingMatch.isHeading,
              headingLevel: headingMatch.level,
              isParagraphEnd: j === sentences.length - 1 && i < lines.length - 1 && lines[i + 1].trim() === '',
              isSentenceEnd: true,
              estimatedTokens: this.estimateTokens(sentence)
            });
            currentPosition += sentence.length + 1; // +1 for space/newline
          }
        }
      }
    }

    return boundaries;
  }

  private detectHeading(line: string): { isHeading: boolean; level?: number } {
    // Check for markdown-style headings
    const markdownMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (markdownMatch) {
      return { isHeading: true, level: markdownMatch[1].length };
    }

    // Check for title-case lines that look like headings
    if (line.length < 100 && 
        line.charAt(0) === line.charAt(0).toUpperCase() &&
        !line.endsWith('.') && 
        !line.includes(',')) {
      const words = line.split(' ');
      const titleCaseWords = words.filter(word => 
        word.length > 0 && word.charAt(0) === word.charAt(0).toUpperCase()
      );
      
      if (titleCaseWords.length / words.length > 0.7) {
        return { isHeading: true, level: 2 }; // Assume H2 for detected headings
      }
    }

    return { isHeading: false };
  }

  private splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries while preserving the sentence-ending punctuation
    return text
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .filter(sentence => sentence.trim().length > 0);
  }

  private async createChunks(boundaries: ContentBoundary[], options: ChunkingOptions): Promise<TextChunk[]> {
    const chunks: TextChunk[] = [];
    let currentChunk: ContentBoundary[] = [];
    let currentTokens = 0;
    let chunkIndex = 0;

    for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i];
      const wouldExceedMax = currentTokens + boundary.estimatedTokens > options.maxTokens!;
      const hasMinimumContent = currentTokens >= options.minTokens!;

      // Decide whether to start a new chunk
      const shouldStartNewChunk = wouldExceedMax && hasMinimumContent && currentChunk.length > 0;

      if (shouldStartNewChunk) {
        // Create chunk from current boundaries
        chunks.push(await this.createChunkFromBoundaries(currentChunk, chunkIndex));
        chunkIndex++;
        
        // Start new chunk
        currentChunk = [boundary];
        currentTokens = boundary.estimatedTokens;
      } else {
        // Add to current chunk
        currentChunk.push(boundary);
        currentTokens += boundary.estimatedTokens;
      }
    }

    // Handle remaining content
    if (currentChunk.length > 0) {
      chunks.push(await this.createChunkFromBoundaries(currentChunk, chunkIndex));
    }

    return chunks;
  }

  private async createChunkFromBoundaries(boundaries: ContentBoundary[], chunkIndex: number): Promise<TextChunk> {
    const content = boundaries.map(b => b.text).join(' ');
    const tokenCount = this.estimateTokens(content);
    
    const metadata: ChunkMetadata = {
      hasHeading: boundaries.some(b => b.isHeading),
      headingLevel: boundaries.find(b => b.isHeading)?.headingLevel,
      headingText: boundaries.find(b => b.isHeading)?.text,
      paragraphCount: boundaries.filter(b => b.isParagraphEnd).length || 1,
      sentenceCount: boundaries.filter(b => b.isSentenceEnd).length,
      containsLists: content.includes('•') || content.includes('-') || /\d+\.\s/.test(content),
      containsLinks: content.includes('http') || content.includes('www.'),
      quality: this.assessChunkQuality(content, boundaries),
      splitReason: this.determineSplitReason(boundaries)
    };

    return {
      content,
      tokenCount,
      chunkIndex,
      startPosition: boundaries[0]?.startPosition || 0,
      endPosition: boundaries[boundaries.length - 1]?.endPosition || 0,
      metadata
    };
  }

  private addOverlaps(chunks: TextChunk[], options: ChunkingOptions): TextChunk[] {
    if (chunks.length <= 1) return chunks;

    const overlapTokens = Math.round(options.maxTokens! * (options.overlapPercent! / 100));
    
    return chunks.map((chunk, index) => {
      const updatedChunk = { ...chunk };
      
      // Add overlap with previous chunk
      if (index > 0) {
        const prevChunk = chunks[index - 1];
        const overlapText = this.extractOverlapText(prevChunk.content, overlapTokens, 'end');
        updatedChunk.content = overlapText + ' ' + chunk.content;
        updatedChunk.overlapStart = this.estimateTokens(overlapText);
      }
      
      // Add overlap with next chunk
      if (index < chunks.length - 1) {
        const nextChunk = chunks[index + 1];
        const overlapText = this.extractOverlapText(nextChunk.content, overlapTokens, 'start');
        updatedChunk.content = chunk.content + ' ' + overlapText;
        updatedChunk.overlapEnd = this.estimateTokens(overlapText);
      }

      // Recalculate token count
      updatedChunk.tokenCount = this.estimateTokens(updatedChunk.content);
      
      return updatedChunk;
    });
  }

  private extractOverlapText(content: string, maxTokens: number, from: 'start' | 'end'): string {
    const sentences = this.splitIntoSentences(content);
    let selectedSentences: string[] = [];
    let currentTokens = 0;

    if (from === 'end') {
      // Take sentences from the end
      for (let i = sentences.length - 1; i >= 0; i--) {
        const sentenceTokens = this.estimateTokens(sentences[i]);
        if (currentTokens + sentenceTokens <= maxTokens) {
          selectedSentences.unshift(sentences[i]);
          currentTokens += sentenceTokens;
        } else {
          break;
        }
      }
    } else {
      // Take sentences from the start
      for (let i = 0; i < sentences.length; i++) {
        const sentenceTokens = this.estimateTokens(sentences[i]);
        if (currentTokens + sentenceTokens <= maxTokens) {
          selectedSentences.push(sentences[i]);
          currentTokens += sentenceTokens;
        } else {
          break;
        }
      }
    }

    return selectedSentences.join(' ');
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 0.75 words for English text
    // This is a simplified estimation - for production, consider using tiktoken
    const words = text.split(/\s+/).filter(word => word.length > 0);
    return Math.ceil(words.length * 1.33); // 1/0.75 = 1.33
  }

  private assessChunkQuality(content: string, boundaries: ContentBoundary[]): ChunkMetadata['quality'] {
    let score = 70; // Base score

    // Completeness: Does the chunk feel complete?
    const hasHeading = boundaries.some(b => b.isHeading);
    const endsAtParagraph = boundaries[boundaries.length - 1]?.isParagraphEnd;
    
    if (hasHeading) score += 15;
    if (endsAtParagraph) score += 10;
    
    // Coherence: Do sentences flow well?
    const sentenceCount = boundaries.filter(b => b.isSentenceEnd).length;
    if (sentenceCount >= 2 && sentenceCount <= 8) score += 10; // Sweet spot
    if (sentenceCount > 15) score -= 10; // Too many sentences
    
    // Length appropriateness
    const tokenCount = this.estimateTokens(content);
    if (tokenCount >= 300 && tokenCount <= 400) score += 10;
    if (tokenCount < 200) score -= 15;
    if (tokenCount > 500) score -= 10;

    const completeness = hasHeading && endsAtParagraph ? 90 : 70;
    const coherence = sentenceCount >= 2 && sentenceCount <= 8 ? 85 : 60;

    return {
      score: Math.max(0, Math.min(100, score)),
      completeness,
      coherence
    };
  }

  private determineSplitReason(boundaries: ContentBoundary[]): ChunkMetadata['splitReason'] {
    const lastBoundary = boundaries[boundaries.length - 1];
    
    if (!lastBoundary) return 'end_of_content';
    if (lastBoundary.isParagraphEnd) return 'paragraph';
    if (lastBoundary.isSentenceEnd) return 'sentence';
    return 'token_limit';
  }

  private assessChunkingQuality(chunks: TextChunk[]): ChunkingResult['quality'] {
    if (chunks.length === 0) {
      return { averageScore: 0, chunkSizeConsistency: 0, overlapEffectiveness: 0 };
    }

    // Average quality score
    const averageScore = chunks.reduce((sum, chunk) => sum + chunk.metadata.quality.score, 0) / chunks.length;

    // Chunk size consistency (lower standard deviation = higher consistency)
    const tokenCounts = chunks.map(c => c.tokenCount);
    const avgTokens = tokenCounts.reduce((sum, count) => sum + count, 0) / tokenCounts.length;
    const variance = tokenCounts.reduce((sum, count) => sum + Math.pow(count - avgTokens, 2), 0) / tokenCounts.length;
    const stdDev = Math.sqrt(variance);
    const chunkSizeConsistency = Math.max(0, 100 - (stdDev / avgTokens) * 100);

    // Overlap effectiveness (how many chunks have good overlap)
    const chunksWithOverlap = chunks.filter(c => c.overlapStart || c.overlapEnd).length;
    const overlapEffectiveness = chunks.length > 1 ? (chunksWithOverlap / chunks.length) * 100 : 100;

    return {
      averageScore: Math.round(averageScore),
      chunkSizeConsistency: Math.round(chunkSizeConsistency),
      overlapEffectiveness: Math.round(overlapEffectiveness)
    };
  }
}

interface ContentBoundary {
  text: string;
  startPosition: number;
  endPosition: number;
  isHeading: boolean;
  headingLevel?: number;
  isParagraphEnd: boolean;
  isSentenceEnd: boolean;
  estimatedTokens: number;
}
