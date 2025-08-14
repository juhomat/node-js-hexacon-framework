/**
 * OpenAI Adapter - Implementation using OpenAI Responses API
 */

import OpenAI from 'openai';
import {
  AIService,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  ModelInfo,
  OpenAIMessage,
  AIServiceError,
  ModelNotSupportedError,
  TokenLimitExceededError,
  RateLimitError,
} from '../../domain/services/AIService';
import {
  StatelessAIService,
  StatelessChatRequest,
  StatelessChatResponse,
  StatelessStreamChunk,
  StatelessMessage
} from '../../domain/services/StatelessAIService';
import { TokenUsage, FinishReason } from '../../domain/entities/Message';

export class OpenAIAdapter implements AIService, StatelessAIService {
  private openai: OpenAI;
  private defaultModel: string = 'gpt-5';
  private supportedModels: Map<string, ModelInfo> = new Map();

  constructor(apiKey: string, options?: { baseURL?: string; defaultModel?: string }) {
    this.openai = new OpenAI({
      apiKey,
      baseURL: options?.baseURL,
    });

    if (options?.defaultModel) {
      this.defaultModel = options.defaultModel;
    }

    this.initializeSupportedModels();
  }

  private initializeSupportedModels(): void {
    this.supportedModels = new Map([
      [
        'gpt-5',
        {
          id: 'gpt-5',
          name: 'GPT-5',
          description: 'Latest and most advanced AI model',
          maxTokens: 200000,
          supportsStreaming: true,
          inputCostPer1K: 0.005,
          outputCostPer1K: 0.015,
          capabilities: ['chat', 'vision', 'function_calling', 'json_mode'],
        },
      ],
      [
        'gpt-4o',
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          description: 'Most advanced multimodal model',
          maxTokens: 128000,
          supportsStreaming: true,
          inputCostPer1K: 0.0025,
          outputCostPer1K: 0.01,
          capabilities: ['chat', 'vision', 'function_calling', 'json_mode'],
        },
      ],
      [
        'gpt-4o-mini',
        {
          id: 'gpt-4o-mini',
          name: 'GPT-4o Mini',
          description: 'Affordable and intelligent small model',
          maxTokens: 128000,
          supportsStreaming: true,
          inputCostPer1K: 0.00015,
          outputCostPer1K: 0.0006,
          capabilities: ['chat', 'vision', 'function_calling', 'json_mode'],
        },
      ],
      [
        'gpt-4-turbo',
        {
          id: 'gpt-4-turbo',
          name: 'GPT-4 Turbo',
          description: 'Previous generation advanced model',
          maxTokens: 128000,
          supportsStreaming: true,
          inputCostPer1K: 0.01,
          outputCostPer1K: 0.03,
          capabilities: ['chat', 'vision', 'function_calling', 'json_mode'],
        },
      ],
      [
        'gpt-3.5-turbo',
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          description: 'Fast and affordable model',
          maxTokens: 16385,
          supportsStreaming: true,
          inputCostPer1K: 0.0005,
          outputCostPer1K: 0.0015,
          capabilities: ['chat', 'function_calling', 'json_mode'],
        },
      ],
    ]);
  }

  async generateResponse(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      const model = request.configuration.model || this.defaultModel;
      this.validateModelOrThrow(model);

      const messages = this.buildOpenAIMessages(request.messages);
      
      // Use the responses API for non-streaming
      const tokenLimitParam = this.getTokenLimitParam(model, request.configuration.maxTokens);
      const response = await this.openai.chat.completions.create({
        model,
        messages,
        temperature: request.configuration.temperature,
        ...tokenLimitParam,
        top_p: request.configuration.topP,
        frequency_penalty: request.configuration.frequencyPenalty,
        presence_penalty: request.configuration.presencePenalty,
        response_format: request.configuration.responseFormat 
          ? { type: request.configuration.responseFormat }
          : undefined,
        stream: false,
      });

      const choice = response.choices[0];
      if (!choice || !choice.message) {
        throw new AIServiceError('No response from OpenAI', 'NO_RESPONSE');
      }

      const usage: TokenUsage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
        promptTokensDetails: response.usage?.prompt_tokens_details
          ? { cachedTokens: response.usage.prompt_tokens_details.cached_tokens || 0 }
          : undefined,
        completionTokensDetails: response.usage?.completion_tokens_details
          ? { reasoningTokens: response.usage.completion_tokens_details.reasoning_tokens || 0 }
          : undefined,
      };

      const processingTimeMs = Date.now() - startTime;
      const cost = this.calculateCost(usage, model);

      return {
        content: choice.message.content || '',
        model,
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage,
        cost,
        processingTimeMs,
        responseId: response.id,
      };
    } catch (error) {
      this.handleError(error);
      throw error; // This will never execute due to handleError throwing
    }
  }

  async *generateStreamResponse(request: ChatRequest): AsyncGenerator<ChatStreamChunk> {
    try {
      const model = request.configuration.model || this.defaultModel;
      this.validateModelOrThrow(model);

      const messages = this.buildOpenAIMessages(request.messages);
      
      // Use the responses streaming API
      const tokenLimitParam = this.getTokenLimitParam(model, request.configuration.maxTokens);
      const stream = await this.openai.chat.completions.create({
        model,
        messages,
        temperature: request.configuration.temperature,
        ...tokenLimitParam,
        top_p: request.configuration.topP,
        frequency_penalty: request.configuration.frequencyPenalty,
        presence_penalty: request.configuration.presencePenalty,
        response_format: request.configuration.responseFormat 
          ? { type: request.configuration.responseFormat }
          : undefined,
        stream: true,
        stream_options: { include_usage: true }, // Get usage stats at the end
      });

      let fullContent = '';
      let responseId: string | undefined;

      for await (const chunk of stream) {
        responseId = chunk.id;
        const choice = chunk.choices[0];
        
        if (choice?.delta?.content) {
          const delta = choice.delta.content;
          fullContent += delta;
          
          yield {
            delta,
            isComplete: false,
            responseId,
          };
        }

        // Check if we have usage information (final chunk)
        if (chunk.usage) {
          const usage: TokenUsage = {
            promptTokens: chunk.usage.prompt_tokens || 0,
            completionTokens: chunk.usage.completion_tokens || 0,
            totalTokens: chunk.usage.total_tokens || 0,
            promptTokensDetails: chunk.usage.prompt_tokens_details
              ? { cachedTokens: chunk.usage.prompt_tokens_details.cached_tokens || 0 }
              : undefined,
            completionTokensDetails: chunk.usage.completion_tokens_details
              ? { reasoningTokens: chunk.usage.completion_tokens_details.reasoning_tokens || 0 }
              : undefined,
          };

          const cost = this.calculateCost(usage, model);
          const finishReason = this.mapFinishReason(choice?.finish_reason);

          yield {
            delta: '',
            isComplete: true,
            finishReason,
            usage,
            cost,
            responseId,
          };
        }
      }
    } catch (error) {
      yield {
        delta: '',
        isComplete: true,
        error: this.getErrorMessage(error),
      };
    }
  }

  validateModel(model: string): boolean {
    return this.supportedModels.has(model);
  }

  private validateModelOrThrow(model: string): void {
    if (!this.validateModel(model)) {
      throw new ModelNotSupportedError(model);
    }
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    return Array.from(this.supportedModels.values());
  }

  estimateTokens(text: string, model?: string): number {
    // Rough estimation: ~4 characters per token for most models
    // More accurate estimation would require tiktoken library
    return Math.ceil(text.length / 4);
  }

  calculateCost(usage: TokenUsage, model: string): number {
    const modelInfo = this.supportedModels.get(model);
    if (!modelInfo) return 0;

    const inputCost = (usage.promptTokens / 1000) * modelInfo.inputCostPer1K;
    const outputCost = (usage.completionTokens / 1000) * modelInfo.outputCostPer1K;
    
    return inputCost + outputCost;
  }

  private buildOpenAIMessages(messages: any[]): OpenAIMessage[] {
    return messages.map((message) => ({
      role: message.role as 'system' | 'user' | 'assistant',
      content: message.content,
    }));
  }

  /**
   * Get the correct token limit parameter based on model
   * GPT-4o and newer models use max_completion_tokens
   * Older models use max_tokens
   */
  private getTokenLimitParam(model: string, maxTokens: number) {
    const newModels = ['gpt-5', 'gpt-4o', 'gpt-4o-mini'];
    const isNewModel = newModels.some(newModel => model.startsWith(newModel));
    
    if (isNewModel) {
      return { max_completion_tokens: maxTokens };
    } else {
      return { max_tokens: maxTokens };
    }
  }

  private mapFinishReason(reason: string | null | undefined): FinishReason {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      case 'tool_calls':
        return 'tool_calls';
      case 'function_call':
        return 'function_call';
      default:
        return 'stop';
    }
  }

  private handleError(error: any): never {
    if (error instanceof OpenAI.APIError) {
      switch (error.status) {
        case 400:
          throw new AIServiceError(error.message, 'BAD_REQUEST', 400, error);
        case 401:
          throw new AIServiceError('Invalid API key', 'UNAUTHORIZED', 401, error);
        case 429:
          throw new RateLimitError(error.headers?.['retry-after']);
        case 500:
        case 502:
        case 503:
          throw new AIServiceError('OpenAI service unavailable', 'SERVICE_UNAVAILABLE', 503, error);
        default:
          throw new AIServiceError(error.message, 'OPENAI_ERROR', error.status || 500, error);
      }
    }

    if (error instanceof Error) {
      throw new AIServiceError(error.message, 'UNKNOWN_ERROR', 500, error);
    }

    throw new AIServiceError('Unknown error occurred', 'UNKNOWN_ERROR', 500, error);
  }

  private getErrorMessage(error: any): string {
    if (error instanceof AIServiceError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error occurred';
  }

  // ==========================================
  // Stateless AI Service Implementation
  // ==========================================

  async generateStatelessResponse(request: StatelessChatRequest): Promise<StatelessChatResponse> {
    const startTime = Date.now();

    try {
      const model = request.configuration.model || this.defaultModel;
      this.validateModelOrThrow(model);

      const messages = this.buildStatelessMessages(request.messages);
      
      const tokenLimitParam = this.getTokenLimitParam(model, request.configuration.maxTokens);
      const response = await this.openai.chat.completions.create({
        model,
        messages,
        temperature: request.configuration.temperature,
        ...tokenLimitParam,
        top_p: request.configuration.topP,
        frequency_penalty: request.configuration.frequencyPenalty,
        presence_penalty: request.configuration.presencePenalty,
        response_format: request.configuration.responseFormat 
          ? { type: request.configuration.responseFormat }
          : undefined,
        stream: false,
      });

      const choice = response.choices[0];
      if (!choice || !choice.message) {
        throw new AIServiceError('No response from OpenAI', 'NO_RESPONSE');
      }

      const usage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      };

      const processingTimeMs = Date.now() - startTime;
      const cost = this.calculateCost({
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
      }, model);

      return {
        content: choice.message.content || '',
        model,
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage,
        cost,
        processingTimeMs,
        responseId: response.id,
      };
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async *generateStatelessStreamResponse(request: StatelessChatRequest): AsyncGenerator<StatelessStreamChunk> {
    try {
      const model = request.configuration.model || this.defaultModel;
      this.validateModelOrThrow(model);

      const messages = this.buildStatelessMessages(request.messages);
      
      const tokenLimitParam = this.getTokenLimitParam(model, request.configuration.maxTokens);
      const stream = await this.openai.chat.completions.create({
        model,
        messages,
        temperature: request.configuration.temperature,
        ...tokenLimitParam,
        top_p: request.configuration.topP,
        frequency_penalty: request.configuration.frequencyPenalty,
        presence_penalty: request.configuration.presencePenalty,
        response_format: request.configuration.responseFormat 
          ? { type: request.configuration.responseFormat }
          : undefined,
        stream: true,
        stream_options: { include_usage: true },
      });

      let responseId: string | undefined;

      // Emit start chunk
      yield { type: 'start' };

      for await (const chunk of stream) {
        responseId = chunk.id;
        const choice = chunk.choices[0];
        
        if (choice?.delta?.content) {
          yield {
            type: 'chunk',
            delta: choice.delta.content,
            responseId,
          };
        }

        if (choice?.finish_reason) {
          const finishReason = this.mapFinishReason(choice.finish_reason);
          const usage = chunk.usage ? {
            promptTokens: chunk.usage.prompt_tokens || 0,
            completionTokens: chunk.usage.completion_tokens || 0,
            totalTokens: chunk.usage.total_tokens || 0,
          } : undefined;

          const cost = usage ? this.calculateCost({
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          }, model) : 0;

          yield {
            type: 'complete',
            finishReason,
            usage,
            cost,
            responseId,
          };
          break;
        }
      }
    } catch (error) {
      this.handleError(error);
      yield {
        type: 'error',
        error: this.getErrorMessage(error),
      };
    }
  }

  private buildStatelessMessages(messages: StatelessMessage[]): OpenAIMessage[] {
    return messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
  }
}
