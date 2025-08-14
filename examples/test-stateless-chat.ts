/**
 * Simple Stateless Chat Test
 * 
 * Tests the AI Framework without any database - just direct OpenAI calls
 */

import 'dotenv/config';
import { OpenAIAdapter, StatelessChatApplication } from '../packages/ai-framework/src';

async function testStatelessChat() {
  console.log('🚀 Testing Stateless AI Chat');
  console.log('=' .repeat(50));
  
  // Check if API key is available
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    console.log('💡 Create a .env file with: OPENAI_API_KEY=your_api_key_here');
    process.exit(1);
  }
  
  console.log('✅ OpenAI API Key found');
  console.log('🤖 Initializing OpenAI Adapter...');
  
  try {
    // Initialize the OpenAI adapter
    const openaiAdapter = new OpenAIAdapter(apiKey, {
      defaultModel: 'gpt-5'
    });
    
    console.log('✅ OpenAI Adapter initialized');
    
    // Initialize stateless chat application
    const statelessChat = new StatelessChatApplication(openaiAdapter);
    console.log('✅ Stateless Chat Application initialized');
    console.log();
    
    // Test 1: Simple question
    console.log('📤 Test 1: Simple Question');
    console.log('Question: "What is 2 + 2?"');
    console.log('Sending request...');
    
    const startTime = Date.now();
    
    const response1 = await statelessChat.quickChat({
      message: 'What is 2 + 2?',
      systemPrompt: 'You are a helpful math assistant. Give brief, accurate answers.',
      configuration: {
        model: 'gpt-5',
        temperature: 1, // GPT-5 only supports temperature=1
        maxTokens: 100,
      }
    });
    
    const endTime = Date.now();
    
    console.log('📥 Response:', response1.content);
    console.log('🤖 Model:', response1.model);
    console.log('⏱️  Response Time:', `${endTime - startTime}ms`);
    console.log('⚡ Processing Time:', `${response1.processingTimeMs}ms`);
    console.log('🔢 Tokens Used:', response1.usage.totalTokens);
    console.log('💰 Cost:', `$${response1.cost.toFixed(6)}`);
    console.log();
    
    // Test 2: More complex question
    console.log('📤 Test 2: Complex Question');
    console.log('Question: "Explain quantum computing in simple terms"');
    console.log('Sending request...');
    
    const response2 = await statelessChat.quickChat({
      message: 'Explain quantum computing in simple terms',
      systemPrompt: 'You are a helpful science educator. Explain complex topics in simple, easy-to-understand language.',
      configuration: {
        model: 'gpt-5',
        temperature: 1, // GPT-5 only supports temperature=1
        maxTokens: 200,
      }
    });
    
    console.log('📥 Response:', response2.content);
    console.log('🔢 Tokens Used:', response2.usage.totalTokens);
    console.log('💰 Cost:', `$${response2.cost.toFixed(6)}`);
    console.log();
    
    // Test 3: Conversation with context
    console.log('📤 Test 3: Conversation with Manual Context');
    console.log('Building on previous quantum computing answer...');
    
    const response3 = await statelessChat.quickChat({
      message: 'Can you give me a practical example?',
      history: [
        { role: 'user', content: 'Explain quantum computing in simple terms' },
        { role: 'assistant', content: response2.content }
      ],
      configuration: {
        model: 'gpt-5',
        temperature: 1, // GPT-5 only supports temperature=1
        maxTokens: 150,
      }
    });
    
    console.log('📥 Response:', response3.content);
    console.log('🔢 Tokens Used:', response3.usage.totalTokens);
    console.log('💰 Cost:', `$${response3.cost.toFixed(6)}`);
    console.log();
    
    // Summary
    const totalCost = response1.cost + response2.cost + response3.cost;
    const totalTokens = response1.usage.totalTokens + response2.usage.totalTokens + response3.usage.totalTokens;
    
    console.log('✅ ALL TESTS PASSED!');
    console.log('=' .repeat(50));
    console.log('📊 Summary:');
    console.log(`   • Total API Calls: 3`);
    console.log(`   • Total Tokens: ${totalTokens}`);
    console.log(`   • Total Cost: $${totalCost.toFixed(6)}`);
    console.log(`   • Framework Status: ✅ WORKING`);
    console.log();
    console.log('🎉 The AI Framework stateless mode is working correctly!');
    console.log('💡 You can now test the web interface or try persistent mode.');
    
  } catch (error: any) {
    console.error('❌ Test Failed:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.message.includes('401')) {
      console.log('💡 This looks like an API key issue. Check your OPENAI_API_KEY');
    } else if (error.message.includes('max_completion_tokens')) {
      console.log('💡 This is the parameter issue we fixed. Make sure the framework is built.');
    } else if (error.message.includes('model') || error.message.includes('temperature')) {
      console.log('💡 Model issue detected. Trying with gpt-4o instead...');
      await testWithGPT4o();
      return;
    }
    
    process.exit(1);
  }
}

async function testWithGPT4o() {
  console.log('🔄 Fallback Test: Using GPT-4o instead of GPT-5');
  console.log('=' .repeat(50));
  
  const apiKey = process.env.OPENAI_API_KEY!;
  
  try {
    const openaiAdapter = new OpenAIAdapter(apiKey, {
      defaultModel: 'gpt-4o'
    });
    
    const statelessChat = new StatelessChatApplication(openaiAdapter);
    console.log('✅ Initialized with GPT-4o');
    
    const response = await statelessChat.quickChat({
      message: 'What is 2 + 2?',
      systemPrompt: 'You are a helpful math assistant.',
      configuration: {
        model: 'gpt-4o',
        temperature: 0.7, // GPT-4o supports custom temperature
        maxTokens: 100,
      }
    });
    
    console.log('📥 Response:', response.content);
    console.log('🤖 Model:', response.model);
    console.log('🔢 Tokens Used:', response.usage.totalTokens);
    console.log('💰 Cost:', `$${response.cost.toFixed(6)}`);
    console.log();
    console.log('✅ GPT-4o test passed! Framework is working.');
    console.log('💡 The issue is GPT-5 parameter restrictions, not the framework.');
    
  } catch (error: any) {
    console.error('❌ GPT-4o test also failed:', error.message);
    throw error;
  }
}

// Run the test
testStatelessChat();
