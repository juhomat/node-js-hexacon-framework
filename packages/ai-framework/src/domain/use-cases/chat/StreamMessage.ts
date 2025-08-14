/**
 * Stream Message Use Case
 */

import { ChatConfiguration } from '../../entities/Chat';
import { Message } from '../../entities/Message';

export interface StreamMessageUseCase {
  execute(request: StreamMessageRequest): AsyncGenerator<StreamMessageResponse>;
}

export interface StreamMessageRequest {
  chatId: string;
  userId: string;
  content: string;
  configuration?: Partial<ChatConfiguration>; // Override default config
}

export interface StreamMessageResponse {
  type: 'start' | 'chunk' | 'complete' | 'error';
  userMessage?: Message; // Only in 'start' type
  delta?: string; // Only in 'chunk' type
  assistantMessage?: Message; // Only in 'complete' type
  chatMetadata?: {
    totalTokens: number;
    totalCost: number;
    messageCount: number;
  }; // Only in 'complete' type
  error?: string; // Only in 'error' type
}
