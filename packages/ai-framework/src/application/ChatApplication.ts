/**
 * Chat Application Service - Orchestrates chat operations
 */

import { ChatRepository } from '../domain/repositories/ChatRepository';
import { MessageRepository } from '../domain/repositories/MessageRepository';
import { AIService } from '../domain/services/AIService';
import {
  SendMessageRequest,
  SendMessageResponse,
  StreamMessageRequest,
  StreamMessageResponse,
  CreateChatResponse,
  GetChatHistoryRequest,
  GetChatHistoryResponse,
} from '../domain/use-cases/chat';
import { Chat, ChatConfiguration, CreateChatRequest } from '../domain/entities/Chat';
import { Message, CreateMessageRequest } from '../domain/entities/Message';

export class ChatApplication {
  constructor(
    private chatRepository: ChatRepository,
    private messageRepository: MessageRepository,
    private aiService: AIService
  ) {}

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    // 1. Validate chat and user permissions
    const chat = await this.validateChatAccess(request.chatId, request.userId);
    
    // 2. Create user message record
    const userMessage = await this.messageRepository.addMessage({
      chatId: request.chatId,
      role: 'user',
      content: request.content,
    });

    try {
      // 3. Get conversation context
      const context = await this.messageRepository.getConversationContext(request.chatId, 20);
      
      // 4. Get effective configuration
      const configuration = this.getEffectiveConfiguration(chat, request.configuration);
      
      // 5. Generate AI response
      const aiResponse = await this.aiService.generateResponse({
        messages: context,
        configuration,
        userId: request.userId,
        chatId: request.chatId,
      });

      // 6. Save AI response
      const assistantMessage = await this.messageRepository.addMessage({
        chatId: request.chatId,
        role: 'assistant',
        content: aiResponse.content,
        model: aiResponse.model,
        metadata: {
          tokenCount: aiResponse.usage.totalTokens,
          processingTimeMs: aiResponse.processingTimeMs,
          cost: aiResponse.cost,
          finishReason: aiResponse.finishReason,
          usage: aiResponse.usage,
        },
      });

      // 7. Update chat metadata
      const newMetadata = {
        totalTokens: chat.metadata.totalTokens + aiResponse.usage.totalTokens,
        totalCost: chat.metadata.totalCost + aiResponse.cost,
        messageCount: chat.metadata.messageCount + 2, // user + assistant
      };
      
      await this.chatRepository.updateChatMetadata(request.chatId, newMetadata);

      return {
        userMessage,
        assistantMessage,
        chatMetadata: newMetadata,
      };
    } catch (error) {
      // If AI response fails, we keep the user message but mark the error
      throw error;
    }
  }

  async *streamMessage(request: StreamMessageRequest): AsyncGenerator<StreamMessageResponse> {
    // 1. Validate chat and user permissions
    const chat = await this.validateChatAccess(request.chatId, request.userId);
    
    // 2. Create user message record
    const userMessage = await this.messageRepository.addMessage({
      chatId: request.chatId,
      role: 'user',
      content: request.content,
    });

    // Yield start message
    yield {
      type: 'start',
      userMessage,
    };

    try {
      // 3. Get conversation context
      const context = await this.messageRepository.getConversationContext(request.chatId, 20);
      
      // 4. Get effective configuration
      const configuration = this.getEffectiveConfiguration(chat, request.configuration);
      configuration.stream = true; // Ensure streaming is enabled
      
      let fullContent = '';
      let finalUsage: any;
      let finalCost = 0;
      let processingStartTime = Date.now();

      // 5. Generate streaming AI response
      for await (const chunk of this.aiService.generateStreamResponse({
        messages: context,
        configuration,
        userId: request.userId,
        chatId: request.chatId,
      })) {
        if (chunk.error) {
          yield {
            type: 'error',
            error: chunk.error,
          };
          return;
        }

        if (chunk.delta) {
          fullContent += chunk.delta;
          yield {
            type: 'chunk',
            delta: chunk.delta,
          };
        }

        if (chunk.isComplete && chunk.usage) {
          finalUsage = chunk.usage;
          finalCost = chunk.cost || 0;
          break;
        }
      }

      // 6. Save complete AI response
      const processingTimeMs = Date.now() - processingStartTime;
      const assistantMessage = await this.messageRepository.addMessage({
        chatId: request.chatId,
        role: 'assistant',
        content: fullContent,
        model: configuration.model,
        metadata: {
          tokenCount: finalUsage?.totalTokens || 0,
          processingTimeMs,
          cost: finalCost,
          usage: finalUsage,
        },
      });

      // 7. Update chat metadata
      const newMetadata = {
        totalTokens: chat.metadata.totalTokens + (finalUsage?.totalTokens || 0),
        totalCost: chat.metadata.totalCost + finalCost,
        messageCount: chat.metadata.messageCount + 2, // user + assistant
      };
      
      await this.chatRepository.updateChatMetadata(request.chatId, newMetadata);

      // Yield completion
      yield {
        type: 'complete',
        assistantMessage,
        chatMetadata: newMetadata,
      };
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async createChat(request: CreateChatRequest): Promise<CreateChatResponse> {
    const chat = await this.chatRepository.createChat(request);
    
    const defaultConfiguration: ChatConfiguration = {
      model: request.model || 'gpt-5',
      temperature: 0.7,
      maxTokens: 4000, // Higher for GPT-5 reasoning tokens
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      stream: false,
    };

    // If system prompt is provided, add it as the first message
    if (request.systemPrompt) {
      await this.messageRepository.addMessage({
        chatId: chat.id,
        role: 'system',
        content: request.systemPrompt,
      });
    }

    return {
      chat,
      defaultConfiguration,
    };
  }

  async getChatsByUser(request: { userId: string; pagination: { page: number; limit: number } }): Promise<Chat[]> {
    return await this.chatRepository.getChatsByUser(request.userId, request.pagination);
  }

  async getChatHistory(request: GetChatHistoryRequest): Promise<GetChatHistoryResponse> {
    // 1. Validate chat access
    const chat = await this.validateChatAccess(request.chatId, request.userId);
    
    // 2. Get messages with pagination
    const messages = await this.messageRepository.getMessagesByChatId(
      request.chatId,
      request.pagination
    );

    // 3. Get total message count for pagination
    const totalMessages = await this.messageRepository.getMessageCount(request.chatId);
    const totalPages = Math.ceil(totalMessages / request.pagination.limit);

    return {
      chat,
      messages: {
        data: messages,
        pagination: {
          page: request.pagination.page,
          limit: request.pagination.limit,
          total: totalMessages,
          totalPages,
          hasNext: request.pagination.page < totalPages,
          hasPrevious: request.pagination.page > 1,
        },
      },
    };
  }

  private async validateChatAccess(chatId: string, userId: string): Promise<Chat> {
    const chat = await this.chatRepository.getChatById(chatId, userId);
    if (!chat) {
      throw new Error(`Chat not found or access denied: ${chatId}`);
    }
    return chat;
  }

  private getEffectiveConfiguration(
    chat: Chat,
    override?: Partial<ChatConfiguration>
  ): ChatConfiguration {
    const model = override?.model || chat.model;
    
    // GPT-5 has specific parameter restrictions
    const isGPT5 = model.startsWith('gpt-5');
    
    const defaultConfig: ChatConfiguration = {
      model,
      temperature: isGPT5 ? 1 : 0.7, // GPT-5 only supports temperature=1
      maxTokens: isGPT5 ? 4000 : 2000, // GPT-5 needs more tokens for reasoning + output
      topP: isGPT5 ? 1 : 1,
      frequencyPenalty: isGPT5 ? 0 : 0,
      presencePenalty: isGPT5 ? 0 : 0,
      stream: false,
    };

    const result = {
      ...defaultConfig,
      ...override,
    };
    
    // Override problematic settings for GPT-5
    if (isGPT5) {
      result.temperature = 1;
      result.topP = 1;
      result.frequencyPenalty = 0;
      result.presencePenalty = 0;
    }
    
    return result;
  }
}
