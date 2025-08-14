/**
 * Message Entity - Represents individual messages in a conversation
 */

export interface Message {
  id: string;
  chatId: string;
  role: MessageRole;
  content: string;
  model?: string; // Track which model generated this response
  metadata: MessageMetadata;
  createdAt: Date;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface MessageMetadata {
  tokenCount: number;
  processingTimeMs: number;
  cost: number;
  finishReason?: FinishReason;
  usage?: TokenUsage;
}

export type FinishReason = 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  promptTokensDetails?: {
    cachedTokens: number;
  };
  completionTokensDetails?: {
    reasoningTokens: number;
  };
}

export interface CreateMessageRequest {
  chatId: string;
  role: MessageRole;
  content: string;
  model?: string;
  metadata?: Partial<MessageMetadata>;
}

export interface MessageStatistics {
  totalMessages: number;
  averageTokensPerMessage: number;
  averageProcessingTime: number;
  totalCost: number;
  messagesByRole: Record<MessageRole, number>;
}
