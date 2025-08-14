/**
 * Dual Mode Chat Example
 * 
 * Demonstrates both persistent (stateful) and stateless chat modes
 */

import { Pool } from 'pg';
import { 
  OpenAIAdapter, 
  PostgreSQLChatRepository, 
  PostgreSQLMessageRepository,
  ChatApplication,
  StatelessChatApplication
} from '../src';

async function dualModeExample() {
  // ============================================
  // Setup
  // ============================================
  
  const openaiAdapter = new OpenAIAdapter(
    process.env.OPENAI_API_KEY || '',
    { defaultModel: 'gpt-5' }
  );

  console.log('🚀 AI Framework - Dual Mode Example\n');

  // ============================================
  // STATELESS MODE - No Database Required
  // ============================================
  
  console.log('⚡ STATELESS MODE (No Database)');
  console.log('=' .repeat(50));
  
  const statelessChat = new StatelessChatApplication(openaiAdapter);
  
  // Quick one-off question
  console.log('📤 Sending: "What is TypeScript?"');
  
  const quickResponse = await statelessChat.quickChat({
    message: 'What is TypeScript?',
    systemPrompt: 'You are a helpful programming assistant.',
    configuration: {
      model: 'gpt-5',
      temperature: 0.7,
      maxTokens: 150,
    }
  });
  
  console.log('📥 Response:', quickResponse.content);
  console.log('💰 Cost:', `$${quickResponse.cost.toFixed(6)}`);
  console.log('⏱️  Time:', `${quickResponse.processingTimeMs}ms`);
  console.log('🔢 Tokens:', quickResponse.usage.totalTokens);
  console.log();
  
  // Follow-up question with context (still no database)
  console.log('📤 Follow-up with manual context: "How is it different from JavaScript?"');
  
  const followUpResponse = await statelessChat.quickChat({
    message: 'How is it different from JavaScript?',
    history: [
      { role: 'user', content: 'What is TypeScript?' },
      { role: 'assistant', content: quickResponse.content }
    ],
    configuration: {
      model: 'gpt-5',
      temperature: 0.7,
      maxTokens: 150,
    }
  });
  
  console.log('📥 Response:', followUpResponse.content);
  console.log('💰 Cost:', `$${followUpResponse.cost.toFixed(6)}`);
  console.log();
  
  // ============================================
  // PERSISTENT MODE - Database Required
  // ============================================
  
  console.log('💾 PERSISTENT MODE (With Database)');
  console.log('=' .repeat(50));
  
  // Only run persistent mode if database is available
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/ai_framework_db',
      max: 5,
    });
    
    const chatRepository = new PostgreSQLChatRepository(pool);
    const messageRepository = new PostgreSQLMessageRepository(pool);
    const persistentChat = new ChatApplication(
      chatRepository,
      messageRepository,
      openaiAdapter
    );
    
    // Create a persistent chat session
    const chatSession = await persistentChat.createChat({
      userId: 'example_user',
      title: 'TypeScript Discussion',
      model: 'gpt-5',
      systemPrompt: 'You are a helpful programming assistant.'
    });
    
    console.log('💬 Created chat session:', chatSession.chat.id);
    
    // Send first message
    console.log('📤 Sending: "What is TypeScript?"');
    
    const persistentResponse1 = await persistentChat.sendMessage({
      chatId: chatSession.chat.id,
      userId: 'example_user',
      content: 'What is TypeScript?',
      configuration: {
        model: 'gpt-5',
        temperature: 0.7,
        maxTokens: 150,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        stream: false,
      }
    });
    
    console.log('📥 Response:', persistentResponse1.assistantMessage.content);
    console.log('💰 Total Chat Cost:', `$${persistentResponse1.chatMetadata.totalCost.toFixed(6)}`);
    console.log();
    
    // Send follow-up (automatically includes conversation history from database)
    console.log('📤 Follow-up: "How is it different from JavaScript?"');
    
    const persistentResponse2 = await persistentChat.sendMessage({
      chatId: chatSession.chat.id,
      userId: 'example_user',
      content: 'How is it different from JavaScript?',
      configuration: {
        model: 'gpt-5',
        temperature: 0.7,
        maxTokens: 150,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        stream: false,
      }
    });
    
    console.log('📥 Response:', persistentResponse2.assistantMessage.content);
    console.log('💰 Total Chat Cost:', `$${persistentResponse2.chatMetadata.totalCost.toFixed(6)}`);
    console.log('📊 Total Messages:', persistentResponse2.chatMetadata.messageCount);
    console.log();
    
    // Get chat history
    const history = await persistentChat.getChatHistory({
      chatId: chatSession.chat.id,
      userId: 'example_user',
      pagination: { page: 1, limit: 10 }
    });
    
    console.log('📜 Chat History:');
    history.messages.data.forEach((msg, i) => {
      console.log(`  ${i + 1}. ${msg.role}: ${msg.content.substring(0, 50)}...`);
    });
    
    await pool.end();
    
  } catch (error) {
    console.log('⚠️  Database not available - skipping persistent mode');
    console.log('   To test persistent mode, set up PostgreSQL and DATABASE_URL');
  }
  
  // ============================================
  // Summary
  // ============================================
  
  console.log('\n🎯 SUMMARY');
  console.log('=' .repeat(50));
  console.log('✅ Stateless Mode:');
  console.log('   • No database required');
  console.log('   • Perfect for APIs and one-off queries');
  console.log('   • Manual context management');
  console.log('   • Fast setup');
  console.log();
  console.log('✅ Persistent Mode:');
  console.log('   • Database required');
  console.log('   • Automatic conversation history');
  console.log('   • Session management');
  console.log('   • Perfect for chat applications');
  console.log();
}

// Run example
dualModeExample().catch(console.error);
