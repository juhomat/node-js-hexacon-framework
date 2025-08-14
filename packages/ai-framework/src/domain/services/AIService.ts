/**
 * AI Service Interface - Port for AI response generation
 */

import { Message, TokenUsage, FinishReason } from '../entities/Message';
import { ChatConfiguration } from '../entities/Chat';

export interface AIService {
  /**
   * Generate a single response (non-streaming)
   */
  generateResponse(request: ChatRequest): Promise<ChatResponse>;

  /**
   * Generate streaming response
   */
  generateStreamResponse(request: ChatRequest): AsyncGenerator<ChatStreamChunk>;

  /**
   * Validate if a model is supported
   */
  validateModel(model: string): boolean;

  /**
   * Get available models
   */
  getAvailableModels(): Promise<ModelInfo[]>;

  /**
   * Estimate token count for text
   */
  estimateTokens(text: string, model?: string): number;

  /**
   * Calculate cost for token usage
   */
  calculateCost(usage: TokenUsage, model: string): number;
}

export interface ChatRequest {
  messages: Message[];
  configuration: ChatConfiguration;
  userId: string;
  chatId: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  finishReason: FinishReason;
  usage: TokenUsage;
  cost: number;
  processingTimeMs: number;
  responseId?: string;
}

export interface ChatStreamChunk {
  delta: string;
  isComplete: boolean;
  finishReason?: FinishReason;
  usage?: TokenUsage;
  cost?: number;
  error?: string;
  responseId?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  supportsStreaming: boolean;
  inputCostPer1K: number;
  outputCostPer1K: number;
  capabilities: ModelCapability[];
}

export type ModelCapability = 'chat' | 'vision' | 'function_calling' | 'json_mode';

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class AIServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public originalError?: any
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class ModelNotSupportedError extends AIServiceError {
  constructor(model: string) {
    super(`Model ${model} is not supported`, 'MODEL_NOT_SUPPORTED', 400);
  }
}

export class TokenLimitExceededError extends AIServiceError {
  constructor(tokenCount: number, limit: number) {
    super(
      `Token count ${tokenCount} exceeds limit ${limit}`,
      'TOKEN_LIMIT_EXCEEDED',
      400
    );
  }
}

export class RateLimitError extends AIServiceError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429);
    if (retryAfter) {
      this.message += `. Retry after ${retryAfter} seconds`;
    }
  }
}
