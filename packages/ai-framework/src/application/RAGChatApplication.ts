/**
 * RAG-Enhanced Chat Application Service
 * 
 * Extends the existing ChatApplication with RAG (Retrieval-Augmented Generation) capabilities.
 * Uses existing chat infrastructure while adding context search from crawled content.
 */

import { ChatApplication } from './ChatApplication';
import { RAGSearchService, SourceMetadata } from '../domain/services/RAGSearchService';
import {
  SendMessageRequest,
  SendMessageResponse,
  StreamMessageRequest,
  StreamMessageResponse,
} from '../domain/use-cases/chat';

export interface RAGSendMessageRequest extends SendMessageRequest {
  useRAG?: boolean;
  websiteIds?: string[];
  maxChunks?: number;
  minSimilarity?: number;
  ragInstructions?: string;
}

export interface RAGSendMessageResponse extends SendMessageResponse {
  ragSources?: SourceMetadata[];
  ragMetrics?: {
    searchTime: number;
    chunksFound: number;
    avgSimilarity: number;
  };
}

export interface RAGStreamMessageRequest extends StreamMessageRequest {
  useRAG?: boolean;
  websiteIds?: string[];
  maxChunks?: number;
  minSimilarity?: number;
  ragInstructions?: string;
}

export interface RAGStreamMessageResponse extends StreamMessageResponse {
  ragSources?: SourceMetadata[];
  ragMetrics?: {
    searchTime: number;
    chunksFound: number;
    avgSimilarity: number;
  };
}

export class RAGChatApplication {
  constructor(
    private chatApplication: ChatApplication,
    private ragSearchService: RAGSearchService
  ) {}

  /**
   * Send a message with optional RAG enhancement
   */
  async sendMessage(request: RAGSendMessageRequest): Promise<RAGSendMessageResponse> {
    if (!request.useRAG) {
      // Standard chat without RAG
      return await this.chatApplication.sendMessage(request);
    }

    // Enhanced chat with RAG
    const ragResult = await this.ragSearchService.searchRelevantContent(
      request.content,
      {
        maxChunks: request.maxChunks || 5,
        minSimilarity: request.minSimilarity || 0.7,
        websiteIds: request.websiteIds
      }
    );

    // Build enhanced prompt with RAG context
    const enhancedContent = this.ragSearchService.buildRAGPrompt(
      request.content,
      ragResult.chunks,
      request.ragInstructions
    );

    // Send enhanced message through regular chat
    const chatResponse = await this.chatApplication.sendMessage({
      ...request,
      content: enhancedContent
    });

    // Extract sources metadata
    const ragSources = this.ragSearchService.extractSourcesMetadata(ragResult.chunks);

    // Add RAG sources to assistant message metadata
    if (ragSources.length > 0) {
      chatResponse.assistantMessage.metadata = {
        ...chatResponse.assistantMessage.metadata,
        ragSources,
        ragMetrics: ragResult.searchMetrics
      };
    }

    return {
      ...chatResponse,
      ragSources,
      ragMetrics: ragResult.searchMetrics
    };
  }

  /**
   * Stream a message with optional RAG enhancement
   */
  async *streamMessage(request: RAGStreamMessageRequest): AsyncGenerator<RAGStreamMessageResponse> {
    if (!request.useRAG) {
      // Standard streaming chat without RAG
      for await (const chunk of this.chatApplication.streamMessage(request)) {
        yield chunk;
      }
      return;
    }

    // Enhanced streaming chat with RAG
    let ragSources: SourceMetadata[] = [];
    let ragMetrics: any = {};

    // First, search for relevant content
    const ragResult = await this.ragSearchService.searchRelevantContent(
      request.content,
      {
        maxChunks: request.maxChunks || 5,
        minSimilarity: request.minSimilarity || 0.7,
        websiteIds: request.websiteIds
      }
    );

    // Build enhanced prompt with RAG context
    const enhancedContent = this.ragSearchService.buildRAGPrompt(
      request.content,
      ragResult.chunks,
      request.ragInstructions
    );

    ragSources = this.ragSearchService.extractSourcesMetadata(ragResult.chunks);
    ragMetrics = ragResult.searchMetrics;

    // Stream enhanced message through regular chat
    for await (const chunk of this.chatApplication.streamMessage({
      ...request,
      content: enhancedContent
    })) {
      // Add RAG metadata to relevant stream chunks
      if (chunk.type === 'complete' && ragSources.length > 0) {
        // Add RAG sources to assistant message metadata
        chunk.assistantMessage.metadata = {
          ...chunk.assistantMessage.metadata,
          ragSources,
          ragMetrics
        };

        yield {
          ...chunk,
          ragSources,
          ragMetrics
        };
      } else if (chunk.type === 'start') {
        // Include RAG metadata in start message
        yield {
          ...chunk,
          ragSources,
          ragMetrics
        };
      } else {
        yield chunk;
      }
    }
  }

  /**
   * Delegate all other methods to the base ChatApplication
   */
  async createChat(request: any) {
    return await this.chatApplication.createChat(request);
  }

  async getChatsByUser(request: any) {
    return await this.chatApplication.getChatsByUser(request);
  }

  async getChatHistory(request: any) {
    return await this.chatApplication.getChatHistory(request);
  }

  /**
   * Preview RAG search results without sending a message
   */
  async previewRAGContext(
    query: string,
    websiteIds?: string[],
    maxChunks: number = 5
  ): Promise<{
    chunks: any[];
    contextPreview: string;
    sources: SourceMetadata[];
    metrics: any;
  }> {
    const ragResult = await this.ragSearchService.searchRelevantContent(
      query,
      {
        maxChunks,
        websiteIds
      }
    );

    const contextPreview = this.ragSearchService.buildRAGPrompt(
      query,
      ragResult.chunks
    );

    const sources = this.ragSearchService.extractSourcesMetadata(ragResult.chunks);

    return {
      chunks: ragResult.chunks,
      contextPreview,
      sources,
      metrics: ragResult.searchMetrics
    };
  }

  /**
   * Get available websites for RAG filtering
   */
  async getAvailableWebsites(): Promise<any[]> {
    // This would need to be implemented based on your WebsiteRepository
    // For now, return empty array
    return [];
  }
}
