/**
 * Stateless Chat Application - No database persistence
 * 
 * This provides simple AI interactions without any database storage.
 * Perfect for one-off queries, API responses, or when you don't need conversation history.
 */

import {
  StatelessAIService,
  StatelessChatRequest,
  StatelessChatResponse,
  StatelessStreamChunk,
  StatelessMessage
} from '../domain/services/StatelessAIService';
import { ChatConfiguration } from '../domain/entities/Chat';

export interface QuickChatRequest {
  /**
   * User's message
   */
  message: string;
  
  /**
   * Optional conversation history (not stored, just for context)
   */
  history?: StatelessMessage[];
  
  /**
   * Optional system prompt
   */
  systemPrompt?: string;
  
  /**
   * AI configuration (model, temperature, etc.)
   */
  configuration?: Partial<ChatConfiguration>;
  
  /**
   * Optional user ID for analytics (not stored)
   */
  userId?: string;
}

export interface QuickChatResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  processingTimeMs: number;
}

export interface QuickStreamChunk {
  type: 'start' | 'chunk' | 'complete' | 'error';
  delta?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: number;
  error?: string;
}

export class StatelessChatApplication {
  constructor(private aiService: StatelessAIService) {}

  /**
   * Send a quick message without any persistence
   */
  async quickChat(request: QuickChatRequest): Promise<QuickChatResponse> {
    const messages = this.buildMessages(request);
    const configuration = this.getConfiguration(request.configuration);

    const response = await this.aiService.generateStatelessResponse({
      messages,
      configuration,
      userId: request.userId,
    });

    return {
      content: response.content,
      model: response.model,
      usage: response.usage,
      cost: response.cost,
      processingTimeMs: response.processingTimeMs,
    };
  }

  /**
   * Send a streaming message without any persistence
   */
  async *quickStreamChat(request: QuickChatRequest): AsyncGenerator<QuickStreamChunk> {
    const messages = this.buildMessages(request);
    const configuration = this.getConfiguration(request.configuration);

    for await (const chunk of this.aiService.generateStatelessStreamResponse({
      messages,
      configuration,
      userId: request.userId,
    })) {
      yield {
        type: chunk.type,
        delta: chunk.delta,
        usage: chunk.usage,
        cost: chunk.cost,
        error: chunk.error,
      };
    }
  }

  private buildMessages(request: QuickChatRequest): StatelessMessage[] {
    const messages: StatelessMessage[] = [];

    // Add system prompt if provided
    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt,
      });
    }

    // Add conversation history if provided
    if (request.history) {
      messages.push(...request.history);
    }

    // Add the current user message
    messages.push({
      role: 'user',
      content: request.message,
    });

    return messages;
  }

  private getConfiguration(partial?: Partial<ChatConfiguration>): ChatConfiguration {
    const model = partial?.model || 'gpt-5';
    
    // GPT-5 has specific parameter restrictions
    const isGPT5 = model.startsWith('gpt-5');
    
    const defaults: ChatConfiguration = {
      model,
      temperature: isGPT5 ? 1 : 0.7, // GPT-5 only supports temperature=1
      maxTokens: 1000,
      topP: isGPT5 ? 1 : 1, // GPT-5 might have topP restrictions too
      frequencyPenalty: isGPT5 ? 0 : 0, // GPT-5 might not support frequency penalty
      presencePenalty: isGPT5 ? 0 : 0, // GPT-5 might not support presence penalty
      stream: false,
    };

    const result = { ...defaults, ...partial };
    
    // Override problematic settings for GPT-5
    if (isGPT5) {
      result.temperature = 1;
      result.topP = 1;
      result.frequencyPenalty = 0;
      result.presencePenalty = 0;
    }
    
    return result;
  }
}
