/**
 * Chunk Domain Entity
 * 
 * Represents a text chunk extracted from a page for RAG processing.
 * Contains the chunk content, embedding vector, and processing metadata.
 */

export interface Chunk {
  id: string;
  pageId: string;
  content: string;
  chunkIndex: number;
  tokenCount: number;
  startPosition: number;
  endPosition: number;
  embedding: number[] | null;
  embeddingModel: string;
  metadata: ChunkMetadata;
  createdAt: Date;
}

export interface ChunkMetadata {
  hasHeading?: boolean;
  headingLevel?: number;
  headingText?: string;
  paragraphCount?: number;
  sentenceCount?: number;
  containsLists?: boolean;
  containsLinks?: boolean;
  quality?: {
    score: number;
    completeness: number;
    coherence: number;
  };
  splitReason?: 'paragraph' | 'sentence' | 'token_limit' | 'end_of_content';
  overlapStart?: number;
  overlapEnd?: number;
  embedding?: {
    success: boolean;
    dimensions: number;
    tokenCount: number;
    model: string;
    generatedAt?: string;
  };
  processing?: {
    chunkingStrategy?: string;
    embeddingAttempts?: number;
    lastProcessedAt?: string;
    errors?: string[];
  };
  [key: string]: any;
}

export interface CreateChunkRequest {
  pageId: string;
  content: string;
  chunkIndex: number;
  tokenCount: number;
  startPosition: number;
  endPosition: number;
  embedding?: number[] | null;
  embeddingModel?: string;
  metadata?: Partial<ChunkMetadata>;
}

export interface UpdateChunkRequest {
  content?: string;
  embedding?: number[] | null;
  embeddingModel?: string;
  metadata?: Partial<ChunkMetadata>;
}

export interface ChunkWithPage {
  chunk: Chunk;
  pageTitle: string;
  pageUrl: string;
  websiteId: string;
  priority: number;
}

export interface ChunkSearchResult {
  chunk: Chunk;
  similarity: number;
  pageTitle: string;
  pageUrl: string;
  rank: number;
}

/**
 * Factory function to create a new Chunk entity
 */
export function createChunk(request: CreateChunkRequest): Omit<Chunk, 'id' | 'createdAt'> {
  return {
    pageId: request.pageId,
    content: request.content,
    chunkIndex: request.chunkIndex,
    tokenCount: request.tokenCount,
    startPosition: request.startPosition,
    endPosition: request.endPosition,
    embedding: request.embedding || null,
    embeddingModel: request.embeddingModel || 'text-embedding-3-small',
    metadata: {
      ...request.metadata,
      embedding: {
        success: !!request.embedding,
        dimensions: request.embedding?.length || 0,
        tokenCount: request.tokenCount,
        model: request.embeddingModel || 'text-embedding-3-small',
        generatedAt: new Date().toISOString()
      }
    }
  };
}
