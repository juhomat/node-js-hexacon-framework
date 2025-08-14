/**
 * Send Message Use Case
 */

import { ChatConfiguration } from '../../entities/Chat';
import { Message } from '../../entities/Message';

export interface SendMessageUseCase {
  execute(request: SendMessageRequest): Promise<SendMessageResponse>;
}

export interface SendMessageRequest {
  chatId: string;
  userId: string;
  content: string;
  configuration?: Partial<ChatConfiguration>; // Override default config
}

export interface SendMessageResponse {
  userMessage: Message;
  assistantMessage: Message;
  chatMetadata: {
    totalTokens: number;
    totalCost: number;
    messageCount: number;
  };
}
