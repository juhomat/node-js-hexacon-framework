/**
 * PostgreSQL Message Repository Implementation
 */

import { Pool, PoolClient } from 'pg';
import { MessageRepository } from '../../domain/repositories/MessageRepository';
import { Message, CreateMessageRequest, MessageStatistics, MessageRole } from '../../domain/entities/Message';
import { Pagination } from '../../shared/types/Pagination';

export class PostgreSQLMessageRepository implements MessageRepository {
  constructor(private pool: Pool) {}

  async addMessage(request: CreateMessageRequest): Promise<Message> {
    const client = await this.pool.connect();
    
    try {
      const id = this.generateId();
      const now = new Date();
      
      const query = `
        INSERT INTO messages (
          id, chat_id, role, content, model,
          token_count, processing_time_ms, cost, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const values = [
        id,
        request.chatId,
        request.role,
        request.content,
        request.model,
        request.metadata?.tokenCount || 0,
        request.metadata?.processingTimeMs || 0,
        request.metadata?.cost || 0,
        now,
      ];

      const result = await client.query(query, values);
      return this.mapRowToMessage(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getMessagesByChatId(chatId: string, pagination: Pagination): Promise<Message[]> {
    const client = await this.pool.connect();
    
    try {
      const offset = (pagination.page - 1) * pagination.limit;
      
      const query = `
        SELECT * FROM messages 
        WHERE chat_id = $1
        ORDER BY created_at ASC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await client.query(query, [chatId, pagination.limit, offset]);
      
      return result.rows.map(row => this.mapRowToMessage(row));
    } finally {
      client.release();
    }
  }

  async getMessageById(messageId: string): Promise<Message | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `SELECT * FROM messages WHERE id = $1`;
      const result = await client.query(query, [messageId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToMessage(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async updateMessage(messageId: string, updates: Partial<Message>): Promise<Message> {
    const client = await this.pool.connect();
    
    try {
      const { query, values } = this.buildUpdateQuery(messageId, updates);
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error(`Message with id ${messageId} not found`);
      }
      
      return this.mapRowToMessage(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      const query = `DELETE FROM messages WHERE id = $1`;
      const result = await client.query(query, [messageId]);
      
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async getMessageStatistics(chatId: string): Promise<MessageStatistics> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT 
          COUNT(*) as total_messages,
          COALESCE(AVG(token_count), 0) as avg_tokens_per_message,
          COALESCE(AVG(processing_time_ms), 0) as avg_processing_time,
          COALESCE(SUM(cost), 0) as total_cost,
          COUNT(CASE WHEN role = 'user' THEN 1 END) as user_messages,
          COUNT(CASE WHEN role = 'assistant' THEN 1 END) as assistant_messages,
          COUNT(CASE WHEN role = 'system' THEN 1 END) as system_messages
        FROM messages 
        WHERE chat_id = $1
      `;
      
      const result = await client.query(query, [chatId]);
      const row = result.rows[0];
      
      return {
        totalMessages: parseInt(row.total_messages),
        averageTokensPerMessage: parseFloat(row.avg_tokens_per_message),
        averageProcessingTime: parseFloat(row.avg_processing_time),
        totalCost: parseFloat(row.total_cost),
        messagesByRole: {
          user: parseInt(row.user_messages),
          assistant: parseInt(row.assistant_messages),
          system: parseInt(row.system_messages),
        },
      };
    } finally {
      client.release();
    }
  }

  async getConversationContext(chatId: string, limit: number): Promise<Message[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM messages 
        WHERE chat_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      
      const result = await client.query(query, [chatId, limit]);
      
      // Reverse to get chronological order (oldest first)
      return result.rows.reverse().map(row => this.mapRowToMessage(row));
    } finally {
      client.release();
    }
  }

  async getMessageCount(chatId: string): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      const query = `SELECT COUNT(*) as count FROM messages WHERE chat_id = $1`;
      const result = await client.query(query, [chatId]);
      
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  private mapRowToMessage(row: any): Message {
    return {
      id: row.id,
      chatId: row.chat_id,
      role: row.role as MessageRole,
      content: row.content,
      model: row.model,
      metadata: {
        tokenCount: parseInt(row.token_count) || 0,
        processingTimeMs: parseInt(row.processing_time_ms) || 0,
        cost: parseFloat(row.cost) || 0,
        finishReason: row.finish_reason,
        usage: row.usage_data ? JSON.parse(row.usage_data) : undefined,
      },
      createdAt: new Date(row.created_at),
    };
  }

  private buildUpdateQuery(messageId: string, updates: Partial<Message>): { query: string; values: any[] } {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.content !== undefined) {
      updateFields.push(`content = $${paramIndex++}`);
      values.push(updates.content);
    }
    
    if (updates.metadata !== undefined) {
      if (updates.metadata.tokenCount !== undefined) {
        updateFields.push(`token_count = $${paramIndex++}`);
        values.push(updates.metadata.tokenCount);
      }
      
      if (updates.metadata.processingTimeMs !== undefined) {
        updateFields.push(`processing_time_ms = $${paramIndex++}`);
        values.push(updates.metadata.processingTimeMs);
      }
      
      if (updates.metadata.cost !== undefined) {
        updateFields.push(`cost = $${paramIndex++}`);
        values.push(updates.metadata.cost);
      }
      
      if (updates.metadata.finishReason !== undefined) {
        updateFields.push(`finish_reason = $${paramIndex++}`);
        values.push(updates.metadata.finishReason);
      }
      
      if (updates.metadata.usage !== undefined) {
        updateFields.push(`usage_data = $${paramIndex++}`);
        values.push(JSON.stringify(updates.metadata.usage));
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(messageId);

    const query = `
      UPDATE messages 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    return { query, values };
  }

  private generateId(): string {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}
