/**
 * RAG Search Service
 * 
 * Simple service that combines embedding generation with chunk search
 * to find relevant content for RAG-enhanced conversations.
 */

import { EmbeddingService } from './EmbeddingService';
import { ChunkRepository } from '../repositories/ChunkRepository';
import { Chunk } from '../entities/Chunk';

export interface RAGSearchOptions {
  maxChunks?: number;
  minSimilarity?: number;
  websiteIds?: string[];
}

export interface RAGSearchResult {
  chunks: EnhancedChunk[];
  queryEmbedding: number[];
  searchMetrics: {
    searchTime: number;
    chunksFound: number;
    avgSimilarity: number;
  };
}

export interface EnhancedChunk extends Chunk {
  similarity: number;
  pageUrl?: string;
  pageTitle?: string;
  websiteDomain?: string;
}

export class RAGSearchService {
  private embeddingService: EmbeddingService;
  private chunkRepository: ChunkRepository;

  constructor(
    embeddingService: EmbeddingService,
    chunkRepository: ChunkRepository
  ) {
    this.embeddingService = embeddingService;
    this.chunkRepository = chunkRepository;
  }

  /**
   * Search for relevant content chunks based on a query
   */
  async searchRelevantContent(
    query: string, 
    options: RAGSearchOptions = {}
  ): Promise<RAGSearchResult> {
    const startTime = Date.now();
    
    const {
      maxChunks = 5,
      minSimilarity = 0.7,
      websiteIds
    } = options;

    // Generate embedding for the query
    const embeddingResult = await this.embeddingService.generateEmbedding(query);
    const queryEmbedding = embeddingResult.embedding;

    // Search for similar chunks
    let chunks: any[];
    
    if (websiteIds && websiteIds.length > 0) {
      // Search across specific websites (if multi-website search is available)
      chunks = await this.chunkRepository.searchSimilar(
        queryEmbedding, 
        maxChunks,
        websiteIds[0] // For now, use the first website ID
      );
    } else {
      // Search across all chunks
      chunks = await this.chunkRepository.searchSimilar(
        queryEmbedding, 
        maxChunks
      );
    }

    // Filter by similarity threshold
    const filteredChunks = chunks.filter(chunk => 
      (chunk.similarity || 0) >= minSimilarity
    );

    // Calculate metrics
    const searchTime = Date.now() - startTime;
    const avgSimilarity = filteredChunks.length > 0 
      ? filteredChunks.reduce((sum, chunk) => sum + (chunk.similarity || 0), 0) / filteredChunks.length
      : 0;

    return {
      chunks: filteredChunks,
      queryEmbedding,
      searchMetrics: {
        searchTime,
        chunksFound: filteredChunks.length,
        avgSimilarity
      }
    };
  }

  /**
   * Quick search that returns just the chunks (for simple use cases)
   */
  async findRelevantChunks(
    query: string, 
    maxChunks: number = 5,
    websiteIds?: string[]
  ): Promise<EnhancedChunk[]> {
    const result = await this.searchRelevantContent(query, {
      maxChunks,
      websiteIds
    });
    
    return result.chunks;
  }

  /**
   * Build a formatted context string from chunks
   */
  buildContextFromChunks(chunks: EnhancedChunk[], includeMetadata: boolean = true): string {
    if (chunks.length === 0) {
      return '';
    }

    const contextParts = chunks.map((chunk, index) => {
      let context = chunk.content;
      
      if (includeMetadata) {
        const metadata: string[] = [];
        
        if (chunk.pageTitle) {
          metadata.push(`Title: ${chunk.pageTitle}`);
        }
        
        if (chunk.pageUrl) {
          metadata.push(`URL: ${chunk.pageUrl}`);
        }
        
        if (chunk.similarity) {
          metadata.push(`Relevance: ${(chunk.similarity * 100).toFixed(1)}%`);
        }
        
        if (metadata.length > 0) {
          context = `[${metadata.join(', ')}]\n${context}`;
        }
      }
      
      return `--- Source ${index + 1} ---\n${context}`;
    });

    return contextParts.join('\n\n');
  }

  /**
   * Create an enhanced prompt that includes RAG context
   */
  buildRAGPrompt(
    userMessage: string, 
    chunks: EnhancedChunk[], 
    instructions?: string
  ): string {
    const context = this.buildContextFromChunks(chunks);
    
    if (context.length === 0) {
      // No relevant context found, return original message
      return userMessage;
    }

    const defaultInstructions = `Use the following sources to answer the user's question. If the sources don't contain relevant information, say so and answer based on your general knowledge. Always cite which sources you used.`;
    
    const promptInstructions = instructions || defaultInstructions;
    
    return `${promptInstructions}

SOURCES:
${context}

USER QUESTION:
${userMessage}`;
  }

  /**
   * Extract sources from chunks for response metadata
   */
  extractSourcesMetadata(chunks: EnhancedChunk[]): SourceMetadata[] {
    return chunks.map((chunk, index) => {
      const content = chunk.content || '';
      return {
        index: index + 1,
        chunkId: chunk.id,
        pageId: chunk.pageId,
        pageTitle: chunk.pageTitle || 'Unknown',
        pageUrl: chunk.pageUrl || '',
        websiteDomain: chunk.websiteDomain || '',
        similarity: chunk.similarity || 0,
        contentPreview: content.substring(0, 150) + (content.length > 150 ? '...' : '')
      };
    });
  }
}

export interface SourceMetadata {
  index: number;
  chunkId: string;
  pageId: string;
  pageTitle: string;
  pageUrl: string;
  websiteDomain: string;
  similarity: number;
  contentPreview: string;
}
