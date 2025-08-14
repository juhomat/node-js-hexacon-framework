/**
 * Chat Entity - Represents a conversation between user and AI
 */

export interface Chat {
  id: string;
  userId: string;
  title: string;
  model: string; // Default: 'gpt-4o', configurable per chat
  systemPrompt?: string; // Optional system message
  metadata: ChatMetadata;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface ChatMetadata {
  totalTokens: number;
  totalCost: number;
  messageCount: number;
  lastMessageAt?: Date;
}

export interface CreateChatRequest {
  userId: string;
  title?: string;
  model?: string;
  systemPrompt?: string;
  configuration?: ChatConfiguration;
}

export interface ChatConfiguration {
  model: string; // 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo', etc.
  temperature: number; // 0.0 - 2.0
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stream: boolean; // Enable/disable streaming
  responseFormat?: 'text' | 'json_object';
}

export interface ChatStatistics {
  totalChats: number;
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  averageMessagesPerChat: number;
  mostUsedModel: string;
}
