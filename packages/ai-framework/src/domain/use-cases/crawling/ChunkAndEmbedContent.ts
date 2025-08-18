/**
 * Chunk and Embed Content Use Case
 * 
 * Orchestrates the chunking and embedding process for extracted page content:
 * 1. Takes extracted page content and chunks it into manageable pieces
 * 2. Generates embeddings for each chunk using OpenAI
 * 3. Stores chunks and embeddings in the database
 * 4. Updates page status and statistics
 */

import { Page } from '../../entities/Page';
import { CreateChunkRequest } from '../../entities/Chunk';
import { PageRepository } from '../../repositories/PageRepository';
import { ChunkRepository } from '../../repositories/ChunkRepository';
import { TextChunkingService, ChunkingOptions, TextChunk } from '../../services/TextChunkingService';
import { EmbeddingService, EmbeddingOptions, EmbeddingRequest } from '../../services/EmbeddingService';

export interface ChunkAndEmbedRequest {
  pageId?: string;
  content?: string;
  pageTitle?: string;
  chunkingOptions?: ChunkingOptions;
  embeddingOptions?: EmbeddingOptions;
  updateDatabase?: boolean;
}

export interface ChunkAndEmbedResponse {
  success: boolean;
  page?: Page;
  chunksCreated: number;
  embeddingsGenerated: number;
  totalTokensUsed: number;
  estimatedCost: number;
  processingTimeMs: number;
  quality: {
    averageChunkQuality: number;
    chunkSizeConsistency: number;
    embeddingSuccessRate: number;
  };
  chunks: ProcessedChunk[];
  message: string;
  error?: string;
}

export interface ProcessedChunk {
  chunkIndex: number;
  content: string;
  tokenCount: number;
  embeddingSuccess: boolean;
  embeddingDimensions: number;
  quality: number;
  metadata: any;
}

export class ChunkAndEmbedContent {
  constructor(
    private pageRepository: PageRepository,
    private chunkRepository: ChunkRepository,
    private textChunkingService: TextChunkingService,
    private embeddingService: EmbeddingService
  ) {}

  async execute(request: ChunkAndEmbedRequest): Promise<ChunkAndEmbedResponse> {
    const startTime = Date.now();

    try {
      // Determine source content
      let page: Page | null = null;
      let sourceContent: string;
      let pageTitle: string = request.pageTitle || 'Unknown';

      if (request.pageId) {
        page = await this.pageRepository.findById(request.pageId);
        if (!page) {
          throw new Error(`Page not found with ID: ${request.pageId}`);
        }
        sourceContent = page.content || '';
        pageTitle = page.title || pageTitle;
      } else if (request.content) {
        sourceContent = request.content;
      } else {
        throw new Error('Either pageId or content must be provided');
      }

      if (!sourceContent || sourceContent.trim().length === 0) {
        throw new Error('No content available for chunking');
      }

      console.log(`🚀 Starting chunking and embedding for: ${pageTitle}`);
      console.log(`📝 Content length: ${sourceContent.length} characters`);

      // Step 1: Chunk the content
      console.log(`✂️ Chunking content...`);
      const chunkingResult = await this.textChunkingService.chunkText(sourceContent, request.chunkingOptions);

      if (!chunkingResult.success) {
        throw new Error(`Chunking failed: ${chunkingResult.error}`);
      }

      console.log(`✅ Created ${chunkingResult.chunks.length} chunks`);

      // Step 2: Generate embeddings for all chunks
      console.log(`🔢 Generating embeddings...`);
      const embeddingRequests: EmbeddingRequest[] = chunkingResult.chunks.map((chunk, index) => ({
        text: chunk.content,
        id: `chunk_${index}`,
        metadata: {
          chunkIndex: chunk.chunkIndex,
          tokenCount: chunk.tokenCount,
          quality: chunk.metadata.quality.score
        }
      }));

      const embeddingResult = await this.embeddingService.generateBatchEmbeddings(
        embeddingRequests, 
        request.embeddingOptions
      );

      console.log(`✅ Generated ${embeddingResult.successCount}/${embeddingRequests.length} embeddings`);

      // Step 3: Store chunks and embeddings in database (if requested)
      let chunksStored = 0;
      if (request.updateDatabase && page) {
        console.log(`💾 Storing chunks in database...`);
        chunksStored = await this.storeChunksInDatabase(
          page, 
          chunkingResult.chunks, 
          embeddingResult.results
        );
        console.log(`✅ Stored ${chunksStored} chunks in database`);

        // Update page status and statistics
        await this.updatePageStatistics(page.id, chunksStored, embeddingResult.totalTokens);
      }

      // Step 4: Prepare response data
      const processedChunks: ProcessedChunk[] = chunkingResult.chunks.map((chunk, index) => {
        const embeddingRes = embeddingResult.results[index];
        return {
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          tokenCount: chunk.tokenCount,
          embeddingSuccess: embeddingRes?.success || false,
          embeddingDimensions: embeddingRes?.dimensions || 0,
          quality: chunk.metadata.quality.score,
          metadata: chunk.metadata
        };
      });

      const processingTime = Date.now() - startTime;

      console.log(`🎉 Chunking and embedding completed in ${processingTime}ms`);

      return {
        success: true,
        page,
        chunksCreated: chunkingResult.chunks.length,
        embeddingsGenerated: embeddingResult.successCount,
        totalTokensUsed: embeddingResult.totalTokens,
        estimatedCost: embeddingResult.costEstimate,
        processingTimeMs: processingTime,
        quality: {
          averageChunkQuality: chunkingResult.quality.averageScore,
          chunkSizeConsistency: chunkingResult.quality.chunkSizeConsistency,
          embeddingSuccessRate: (embeddingResult.successCount / embeddingRequests.length) * 100
        },
        chunks: processedChunks,
        message: `Successfully created ${chunkingResult.chunks.length} chunks and ${embeddingResult.successCount} embeddings`
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Chunking and embedding failed:`, error.message);

      return {
        success: false,
        chunksCreated: 0,
        embeddingsGenerated: 0,
        totalTokensUsed: 0,
        estimatedCost: 0,
        processingTimeMs: processingTime,
        quality: {
          averageChunkQuality: 0,
          chunkSizeConsistency: 0,
          embeddingSuccessRate: 0
        },
        chunks: [],
        message: `Chunking and embedding failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Process multiple pages in batch
   */
  async processBatch(
    pages: Page[], 
    options: {
      concurrency?: number;
      chunkingOptions?: ChunkingOptions;
      embeddingOptions?: EmbeddingOptions;
      updateDatabase?: boolean;
    } = {}
  ): Promise<ChunkAndEmbedResponse[]> {
    const { concurrency = 2, updateDatabase = true } = options;
    
    console.log(`🚀 Starting batch chunking and embedding for ${pages.length} pages with concurrency ${concurrency}`);
    
    const results: ChunkAndEmbedResponse[] = [];
    
    // Process pages in batches
    for (let i = 0; i < pages.length; i += concurrency) {
      const batch = pages.slice(i, i + concurrency);
      const batchPromises = batch.map(page => 
        this.execute({
          pageId: page.id,
          updateDatabase,
          chunkingOptions: options.chunkingOptions,
          embeddingOptions: options.embeddingOptions
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      console.log(`📦 Completed batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(pages.length / concurrency)}`);
      
      // Small delay between batches to respect rate limits
      if (i + concurrency < pages.length) {
        await this.delay(2000); // 2 second delay for embedding API
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const totalChunks = results.reduce((sum, r) => sum + r.chunksCreated, 0);
    const totalCost = results.reduce((sum, r) => sum + r.estimatedCost, 0);
    
    console.log(`✅ Batch processing complete: ${successCount}/${pages.length} pages successful`);
    console.log(`📊 Total chunks created: ${totalChunks}, Total cost: $${totalCost.toFixed(4)}`);
    
    return results;
  }

  private async storeChunksInDatabase(
    page: Page, 
    chunks: TextChunk[], 
    embeddingResults: any[]
  ): Promise<number> {
    let storedCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embeddingResult = embeddingResults[i];

      try {
        const chunkRequest: CreateChunkRequest = {
          pageId: page.id,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          tokenCount: chunk.tokenCount,
          startPosition: chunk.startPosition,
          endPosition: chunk.endPosition,
          embedding: embeddingResult?.success ? embeddingResult.embedding : null,
          embeddingModel: embeddingResult?.model || 'text-embedding-3-small',
          metadata: {
            ...chunk.metadata,
            embedding: {
              success: embeddingResult?.success || false,
              dimensions: embeddingResult?.dimensions || 0,
              tokenCount: embeddingResult?.tokenCount || 0,
              model: embeddingResult?.model
            },
            overlapStart: chunk.overlapStart,
            overlapEnd: chunk.overlapEnd
          }
        };

        await this.chunkRepository.create(chunkRequest);
        storedCount++;

      } catch (error: any) {
        console.error(`❌ Failed to store chunk ${i} for page ${page.id}:`, error.message);
      }
    }

    return storedCount;
  }

  private async updatePageStatistics(pageId: string, chunksCreated: number, tokensUsed: number): Promise<void> {
    try {
      await this.pageRepository.updateStatus(pageId, 'completed', {
        chunksCreated,
        tokensUsed,
        chunkingCompletedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error(`❌ Failed to update page statistics for ${pageId}:`, error.message);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
