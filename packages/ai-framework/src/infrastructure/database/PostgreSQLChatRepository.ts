/**
 * PostgreSQL Chat Repository Implementation
 */

import { Pool, PoolClient } from 'pg';
import { ChatRepository } from '../../domain/repositories/ChatRepository';
import { Chat, CreateChatRequest, ChatStatistics, ChatConfiguration } from '../../domain/entities/Chat';
import { Pagination } from '../../shared/types/Pagination';

export class PostgreSQLChatRepository implements ChatRepository {
  constructor(private pool: Pool) {}

  async createChat(request: CreateChatRequest): Promise<Chat> {
    const client = await this.pool.connect();
    
    try {
      const id = this.generateId();
      const now = new Date();
      const model = request.model || 'gpt-5';
      
      const query = `
        INSERT INTO chats (
          id, user_id, title, model, system_prompt, 
          total_tokens, total_cost, message_count, 
          is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const values = [
        id,
        request.userId,
        request.title || 'New Chat',
        model,
        request.systemPrompt,
        0, // total_tokens
        0, // total_cost
        0, // message_count
        true, // is_active
        now, // created_at
        now, // updated_at
      ];

      const result = await client.query(query, values);
      return this.mapRowToChat(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getChatById(chatId: string, userId: string): Promise<Chat | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM chats 
        WHERE id = $1 AND user_id = $2 AND is_active = true
      `;
      
      const result = await client.query(query, [chatId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToChat(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getChatsByUser(userId: string, pagination: Pagination): Promise<Chat[]> {
    const client = await this.pool.connect();
    
    try {
      const offset = (pagination.page - 1) * pagination.limit;
      
      const query = `
        SELECT * FROM chats 
        WHERE user_id = $1 AND is_active = true
        ORDER BY updated_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await client.query(query, [userId, pagination.limit, offset]);
      
      return result.rows.map(row => this.mapRowToChat(row));
    } finally {
      client.release();
    }
  }

  async updateChat(chatId: string, updates: Partial<Chat>): Promise<Chat> {
    const client = await this.pool.connect();
    
    try {
      const { query, values } = this.buildUpdateQuery(chatId, updates);
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error(`Chat with id ${chatId} not found`);
      }
      
      return this.mapRowToChat(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async deleteChat(chatId: string, userId: string): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE chats 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await client.query(query, [chatId, userId]);
      
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async getChatStatistics(userId: string): Promise<ChatStatistics> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT 
          COUNT(*) as total_chats,
          COALESCE(SUM(message_count), 0) as total_messages,
          COALESCE(SUM(total_tokens), 0) as total_tokens,
          COALESCE(SUM(total_cost), 0) as total_cost,
          COALESCE(AVG(message_count), 0) as avg_messages_per_chat,
          MODE() WITHIN GROUP (ORDER BY model) as most_used_model
        FROM chats 
        WHERE user_id = $1 AND is_active = true
      `;
      
      const result = await client.query(query, [userId]);
      const row = result.rows[0];
      
      return {
        totalChats: parseInt(row.total_chats),
        totalMessages: parseInt(row.total_messages),
        totalTokens: parseInt(row.total_tokens),
        totalCost: parseFloat(row.total_cost),
        averageMessagesPerChat: parseFloat(row.avg_messages_per_chat),
        mostUsedModel: row.most_used_model || 'gpt-4o',
      };
    } finally {
      client.release();
    }
  }

  async updateChatMetadata(chatId: string, metadata: Partial<Chat['metadata']>): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (metadata.totalTokens !== undefined) {
        updateFields.push(`total_tokens = $${paramIndex++}`);
        values.push(metadata.totalTokens);
      }
      
      if (metadata.totalCost !== undefined) {
        updateFields.push(`total_cost = $${paramIndex++}`);
        values.push(metadata.totalCost);
      }
      
      if (metadata.messageCount !== undefined) {
        updateFields.push(`message_count = $${paramIndex++}`);
        values.push(metadata.messageCount);
      }

      if (updateFields.length === 0) {
        return; // Nothing to update
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(chatId);

      const query = `
        UPDATE chats 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
      `;
      
      await client.query(query, values);
    } finally {
      client.release();
    }
  }

  private mapRowToChat(row: any): Chat {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      model: row.model,
      systemPrompt: row.system_prompt,
      metadata: {
        totalTokens: parseInt(row.total_tokens) || 0,
        totalCost: parseFloat(row.total_cost) || 0,
        messageCount: parseInt(row.message_count) || 0,
        lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : undefined,
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      isActive: row.is_active,
    };
  }

  private buildUpdateQuery(chatId: string, updates: Partial<Chat>): { query: string; values: any[] } {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    
    if (updates.model !== undefined) {
      updateFields.push(`model = $${paramIndex++}`);
      values.push(updates.model);
    }
    
    if (updates.systemPrompt !== undefined) {
      updateFields.push(`system_prompt = $${paramIndex++}`);
      values.push(updates.systemPrompt);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(chatId);

    const query = `
      UPDATE chats 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    return { query, values };
  }

  private generateId(): string {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}
