/**
 * Embedding Service
 * 
 * Generates vector embeddings for text chunks using OpenAI's embedding models.
 * Handles batch processing, rate limiting, and embedding storage.
 */

import OpenAI from 'openai';

export interface EmbeddingOptions {
  model?: string;              // Default: 'text-embedding-3-small'
  dimensions?: number;         // Default: 1536 for text-embedding-3-small
  batchSize?: number;          // Default: 100 (OpenAI batch limit)
  rateLimitDelay?: number;     // Default: 100ms between batches
}

export interface EmbeddingRequest {
  text: string;
  id?: string;                 // Optional identifier for tracking
  metadata?: Record<string, any>;
}

export interface EmbeddingResult {
  success: boolean;
  embedding: number[];
  tokenCount: number;
  model: string;
  dimensions: number;
  id?: string;
  metadata?: Record<string, any>;
  error?: string;
}

export interface BatchEmbeddingResult {
  success: boolean;
  results: EmbeddingResult[];
  totalTokens: number;
  processingTimeMs: number;
  costEstimate: number;        // Estimated cost in USD
  successCount: number;
  failureCount: number;
  error?: string;
}

export class EmbeddingService {
  private openai: OpenAI;
  private readonly DEFAULT_OPTIONS: Required<EmbeddingOptions> = {
    model: 'text-embedding-3-small',
    dimensions: 1536,
    batchSize: 100,
    rateLimitDelay: 100
  };

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
  }

  async generateEmbedding(text: string, options: EmbeddingOptions = {}): Promise<EmbeddingResult> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      console.log(`🔢 Generating embedding for ${text.length} characters using ${opts.model}`);

      if (!text || text.trim().length === 0) {
        throw new Error('Text is empty or null');
      }

      // Clean and prepare text
      const cleanText = this.prepareTextForEmbedding(text);

      const response = await this.openai.embeddings.create({
        model: opts.model,
        input: cleanText,
        dimensions: opts.dimensions
      });

      const embedding = response.data[0].embedding;
      const tokenCount = response.usage.total_tokens;

      console.log(`✅ Generated ${embedding.length}D embedding (${tokenCount} tokens)`);

      return {
        success: true,
        embedding,
        tokenCount,
        model: opts.model,
        dimensions: embedding.length
      };

    } catch (error: any) {
      console.error(`❌ Embedding generation failed:`, error.message);

      return {
        success: false,
        embedding: [],
        tokenCount: 0,
        model: opts.model,
        dimensions: opts.dimensions,
        error: this.getErrorMessage(error)
      };
    }
  }

  async generateBatchEmbeddings(
    requests: EmbeddingRequest[], 
    options: EmbeddingOptions = {}
  ): Promise<BatchEmbeddingResult> {
    const startTime = Date.now();
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      console.log(`🚀 Generating embeddings for ${requests.length} texts in batches of ${opts.batchSize}`);

      if (requests.length === 0) {
        throw new Error('No embedding requests provided');
      }

      const results: EmbeddingResult[] = [];
      let totalTokens = 0;

      // Process in batches
      for (let i = 0; i < requests.length; i += opts.batchSize) {
        const batch = requests.slice(i, i + opts.batchSize);
        console.log(`📦 Processing batch ${Math.floor(i / opts.batchSize) + 1}/${Math.ceil(requests.length / opts.batchSize)}`);

        try {
          // Prepare batch texts
          const batchTexts = batch.map(req => this.prepareTextForEmbedding(req.text));

          // Make batch API call
          const response = await this.openai.embeddings.create({
            model: opts.model,
            input: batchTexts,
            dimensions: opts.dimensions
          });

          // Process results
          response.data.forEach((embeddingData, index) => {
            const request = batch[index];
            results.push({
              success: true,
              embedding: embeddingData.embedding,
              tokenCount: Math.round(response.usage.total_tokens / response.data.length), // Approximate per text
              model: opts.model,
              dimensions: embeddingData.embedding.length,
              id: request.id,
              metadata: request.metadata
            });
          });

          totalTokens += response.usage.total_tokens;

        } catch (batchError: any) {
          console.error(`❌ Batch ${Math.floor(i / opts.batchSize) + 1} failed:`, batchError.message);

          // Add failed results for this batch
          batch.forEach(request => {
            results.push({
              success: false,
              embedding: [],
              tokenCount: 0,
              model: opts.model,
              dimensions: opts.dimensions,
              id: request.id,
              metadata: request.metadata,
              error: this.getErrorMessage(batchError)
            });
          });
        }

        // Rate limiting delay between batches
        if (i + opts.batchSize < requests.length) {
          await this.delay(opts.rateLimitDelay);
        }
      }

      const processingTime = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      const costEstimate = this.estimateCost(totalTokens, opts.model);

      console.log(`✅ Batch embedding completed: ${successCount}/${requests.length} successful`);
      console.log(`📊 Total tokens: ${totalTokens.toLocaleString()}, Estimated cost: $${costEstimate.toFixed(4)}`);

      return {
        success: successCount > 0,
        results,
        totalTokens,
        processingTimeMs: processingTime,
        costEstimate,
        successCount,
        failureCount
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Batch embedding failed:`, error.message);

      return {
        success: false,
        results: requests.map(req => ({
          success: false,
          embedding: [],
          tokenCount: 0,
          model: opts.model,
          dimensions: opts.dimensions,
          id: req.id,
          metadata: req.metadata,
          error: this.getErrorMessage(error)
        })),
        totalTokens: 0,
        processingTimeMs: processingTime,
        costEstimate: 0,
        successCount: 0,
        failureCount: requests.length,
        error: this.getErrorMessage(error)
      };
    }
  }

  private prepareTextForEmbedding(text: string): string {
    return text
      .replace(/\n+/g, ' ')        // Replace newlines with spaces
      .replace(/\s+/g, ' ')        // Normalize whitespace
      .trim()                      // Remove leading/trailing space
      .substring(0, 8000);         // Truncate to reasonable length (OpenAI limit is ~8191 tokens)
  }

  private estimateCost(tokens: number, model: string): number {
    // OpenAI pricing (as of 2024) - update these as needed
    const pricing: Record<string, number> = {
      'text-embedding-3-small': 0.00002,  // $0.00002 per 1K tokens
      'text-embedding-3-large': 0.00013,  // $0.00013 per 1K tokens
      'text-embedding-ada-002': 0.0001    // $0.0001 per 1K tokens (legacy)
    };

    const pricePerThousand = pricing[model] || pricing['text-embedding-3-small'];
    return (tokens / 1000) * pricePerThousand;
  }

  private getErrorMessage(error: any): string {
    if (error?.response?.data?.error?.message) {
      return error.response.data.error.message;
    }
    if (error?.message) {
      return error.message;
    }
    return 'Unknown embedding error';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility method to validate embedding dimensions match expected size
   */
  validateEmbedding(embedding: number[], expectedDimensions: number): boolean {
    return Array.isArray(embedding) && 
           embedding.length === expectedDimensions &&
           embedding.every(val => typeof val === 'number' && !isNaN(val));
  }

  /**
   * Utility method to calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}
