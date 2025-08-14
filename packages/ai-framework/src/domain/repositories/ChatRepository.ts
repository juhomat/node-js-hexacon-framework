/**
 * Chat Repository Interface - Port for chat data persistence
 */

import { Chat, CreateChatRequest, ChatStatistics } from '../entities/Chat';
import { Pagination } from '../../shared/types/Pagination';

export interface ChatRepository {
  /**
   * Create a new chat
   */
  createChat(request: CreateChatRequest): Promise<Chat>;

  /**
   * Get chat by ID with user verification
   */
  getChatById(chatId: string, userId: string): Promise<Chat | null>;

  /**
   * Get all chats for a user with pagination
   */
  getChatsByUser(userId: string, pagination: Pagination): Promise<Chat[]>;

  /**
   * Update chat details
   */
  updateChat(chatId: string, updates: Partial<Chat>): Promise<Chat>;

  /**
   * Delete a chat (soft delete)
   */
  deleteChat(chatId: string, userId: string): Promise<boolean>;

  /**
   * Get chat statistics for a user
   */
  getChatStatistics(userId: string): Promise<ChatStatistics>;

  /**
   * Update chat metadata (tokens, cost, message count)
   */
  updateChatMetadata(chatId: string, metadata: Partial<Chat['metadata']>): Promise<void>;
}
