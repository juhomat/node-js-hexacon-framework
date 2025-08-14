/**
 * Create Chat Use Case
 */

import { Chat, CreateChatRequest, ChatConfiguration } from '../../entities/Chat';

export interface CreateChatUseCase {
  execute(request: CreateChatRequest): Promise<CreateChatResponse>;
}

export interface CreateChatResponse {
  chat: Chat;
  defaultConfiguration: ChatConfiguration;
}
