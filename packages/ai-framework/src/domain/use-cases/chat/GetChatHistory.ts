/**
 * Get Chat History Use Case
 */

import { Chat } from '../../entities/Chat';
import { Message } from '../../entities/Message';
import { Pagination, PaginatedResponse } from '../../../shared/types/Pagination';

export interface GetChatHistoryUseCase {
  execute(request: GetChatHistoryRequest): Promise<GetChatHistoryResponse>;
}

export interface GetChatHistoryRequest {
  chatId: string;
  userId: string;
  pagination: Pagination;
}

export interface GetChatHistoryResponse {
  chat: Chat;
  messages: PaginatedResponse<Message>;
}
