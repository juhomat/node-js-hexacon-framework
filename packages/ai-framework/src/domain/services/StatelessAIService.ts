/**
 * Stateless AI Service Interface - Direct AI interactions without persistence
 */

import { ChatConfiguration } from '../entities/Chat';

export interface StatelessAIService {
  /**
   * Generate a single response without database storage
   */
  generateStatelessResponse(request: StatelessChatRequest): Promise<StatelessChatResponse>;

  /**
   * Generate streaming response without database storage
   */
  generateStatelessStreamResponse(request: StatelessChatRequest): AsyncGenerator<StatelessStreamChunk>;
}

export interface StatelessChatRequest {
  /**
   * Array of messages for the conversation
   * No database IDs - just role and content
   */
  messages: StatelessMessage[];
  
  /**
   * AI model configuration
   */
  configuration: ChatConfiguration;
  
  /**
   * Optional user identifier for logging/analytics (not stored)
   */
  userId?: string;
}

export interface StatelessMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StatelessChatResponse {
  content: string;
  model: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  processingTimeMs: number;
  responseId?: string;
}

export interface StatelessStreamChunk {
  type: 'start' | 'chunk' | 'complete' | 'error';
  delta?: string;
  finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: number;
  error?: string;
  responseId?: string;
}
