/**
 * Chat Feature Usage Example
 * 
 * This example demonstrates how to use the AI Framework's chat functionality
 */

import { Pool } from 'pg';
import { 
  OpenAIAdapter, 
  PostgreSQLChatRepository, 
  PostgreSQLMessageRepository,
  ChatApplication 
} from '../src';

async function chatExample() {
  // 1. Initialize infrastructure dependencies
  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/ai_framework_db'
  });

  const openaiAdapter = new OpenAIAdapter(
    process.env.OPENAI_API_KEY || 'your-api-key',
    { defaultModel: 'gpt-5' }
  );

  const chatRepository = new PostgreSQLChatRepository(dbPool);
  const messageRepository = new PostgreSQLMessageRepository(dbPool);

  // 2. Initialize application service
  const chatApplication = new ChatApplication(
    chatRepository,
    messageRepository,
    openaiAdapter
  );

  try {
    // 3. Create a new chat
    const { chat } = await chatApplication.createChat({
      userId: 'user_123',
      title: 'Test Chat',
      model: 'gpt-5', // Can override default model
      systemPrompt: 'You are a helpful assistant.',
    });

    console.log('Created chat:', chat.id);

    // 4. Send a message (non-streaming)
    const response = await chatApplication.sendMessage({
      chatId: chat.id,
      userId: 'user_123',
      content: 'Hello! Can you help me with TypeScript?',
      configuration: {
        temperature: 0.7,
        maxTokens: 1000,
      }
    });

    console.log('User message:', response.userMessage.content);
    console.log('AI response:', response.assistantMessage.content);
    console.log('Tokens used:', response.assistantMessage.metadata.tokenCount);
    console.log('Cost:', response.assistantMessage.metadata.cost);

    // 5. Send a streaming message
    console.log('\n--- Streaming Example ---');
    console.log('User: Can you explain async/await in TypeScript?');
    console.log('AI: ');

    for await (const chunk of chatApplication.streamMessage({
      chatId: chat.id,
      userId: 'user_123',
      content: 'Can you explain async/await in TypeScript?',
    })) {
      if (chunk.type === 'chunk' && chunk.delta) {
        process.stdout.write(chunk.delta);
      } else if (chunk.type === 'complete') {
        console.log('\n\nMessage complete!');
        console.log('Total tokens:', chunk.chatMetadata?.totalTokens);
        console.log('Total cost:', chunk.chatMetadata?.totalCost);
      } else if (chunk.type === 'error') {
        console.error('Error:', chunk.error);
        break;
      }
    }

    // 6. Get chat history
    const history = await chatApplication.getChatHistory({
      chatId: chat.id,
      userId: 'user_123',
      pagination: { page: 1, limit: 10 }
    });

    console.log('\n--- Chat History ---');
    console.log(`Total messages: ${history.messages.pagination.total}`);
    history.messages.data.forEach((msg, index) => {
      console.log(`${index + 1}. [${msg.role}]: ${msg.content.substring(0, 50)}...`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await dbPool.end();
  }
}

// Example with different models
async function multiModelExample() {
  // Initialize dependencies (same as above)
  const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
  const openaiAdapter = new OpenAIAdapter(process.env.OPENAI_API_KEY!);
  const chatRepository = new PostgreSQLChatRepository(dbPool);
  const messageRepository = new PostgreSQLMessageRepository(dbPool);
  const chatApplication = new ChatApplication(chatRepository, messageRepository, openaiAdapter);

  try {
    // Test different models
    const models = ['gpt-5', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'];
    
    for (const model of models) {
      console.log(`\n=== Testing ${model} ===`);
      
      const { chat } = await chatApplication.createChat({
        userId: 'user_123',
        title: `${model} Test`,
        model,
      });

      const response = await chatApplication.sendMessage({
        chatId: chat.id,
        userId: 'user_123',
        content: 'Write a haiku about TypeScript',
        configuration: { model } // Override at message level
      });

      console.log('Model used:', response.assistantMessage.model);
      console.log('Response:', response.assistantMessage.content);
      console.log('Cost:', response.assistantMessage.metadata.cost);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await dbPool.end();
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  console.log('Running Chat Framework Example...\n');
  
  chatExample()
    .then(() => console.log('\nBasic example completed!'))
    .then(() => multiModelExample())
    .then(() => console.log('\nMulti-model example completed!'))
    .catch(console.error);
}
