/**
 * Message Repository Interface - Port for message data persistence
 */

import { Message, CreateMessageRequest, MessageStatistics } from '../entities/Message';
import { Pagination } from '../../shared/types/Pagination';

export interface MessageRepository {
  /**
   * Add a new message to a chat
   */
  addMessage(request: CreateMessageRequest): Promise<Message>;

  /**
   * Get messages for a specific chat with pagination
   */
  getMessagesByChatId(chatId: string, pagination: Pagination): Promise<Message[]>;

  /**
   * Get a specific message by ID
   */
  getMessageById(messageId: string): Promise<Message | null>;

  /**
   * Update message details
   */
  updateMessage(messageId: string, updates: Partial<Message>): Promise<Message>;

  /**
   * Delete a message
   */
  deleteMessage(messageId: string): Promise<boolean>;

  /**
   * Get message statistics for a chat
   */
  getMessageStatistics(chatId: string): Promise<MessageStatistics>;

  /**
   * Get conversation context (recent messages for AI)
   */
  getConversationContext(chatId: string, limit: number): Promise<Message[]>;

  /**
   * Count total messages in a chat
   */
  getMessageCount(chatId: string): Promise<number>;
}
