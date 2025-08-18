#!/usr/bin/env tsx

/**
 * 🌐 RAG API Endpoint Test Script
 * 
 * Tests the RAG chat API endpoint to verify it works correctly.
 * Requires the admin application to be running.
 */

import fetch from 'node-fetch';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

const API_BASE = 'http://localhost:3000/api/chat/rag';

async function testRAGAPI() {
  log('\n🌐 RAG API Endpoint Test', colors.bright + colors.blue);
  log('=' .repeat(50), colors.blue);

  try {
    // Test 1: Get endpoint documentation
    log('\n1️⃣ Testing Endpoint Documentation...', colors.yellow);
    const docResponse = await fetch(API_BASE);
    
    if (docResponse.ok) {
      const docData = await docResponse.json();
      log('✅ Endpoint documentation available', colors.green);
      log(`📄 Endpoint: ${docData.endpoint}`, colors.cyan);
      log(`📝 Description: ${docData.description}`, colors.cyan);
    } else {
      log(`❌ Failed to get documentation: ${docResponse.status}`, colors.red);
    }

    // Test 2: Create new RAG chat and send message
    log('\n2️⃣ Testing New RAG Chat Creation...', colors.yellow);
    const newChatResponse = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'What information do you have about example domains or test websites?',
        createNewChat: true,
        chatTitle: 'RAG API Test Chat',
        useRAG: true,
        maxChunks: 3,
        minSimilarity: 0.5
      })
    });

    if (newChatResponse.ok) {
      const chatData = await newChatResponse.json();
      log('✅ RAG chat created successfully', colors.green);
      log(`💬 Chat ID: ${chatData.chatId}`, colors.cyan);
      log(`📝 User Message: ${chatData.userMessage.content.substring(0, 50)}...`, colors.cyan);
      log(`🤖 Assistant Response: ${chatData.assistantMessage.content.substring(0, 100)}...`, colors.cyan);
      
      if (chatData.ragSources && chatData.ragSources.length > 0) {
        log(`📚 RAG Sources: ${chatData.ragSources.length}`, colors.cyan);
        chatData.ragSources.forEach((source: any, index: number) => {
          log(`   ${index + 1}. ${source.pageTitle} (${(source.similarity * 100).toFixed(1)}%)`, colors.reset);
        });
        
        log(`📊 RAG Metrics:`, colors.cyan);
        log(`   Search time: ${chatData.ragMetrics.searchTime}ms`, colors.reset);
        log(`   Chunks found: ${chatData.ragMetrics.chunksFound}`, colors.reset);
        log(`   Avg similarity: ${(chatData.ragMetrics.avgSimilarity * 100).toFixed(1)}%`, colors.reset);
      }

      // Test 3: Continue conversation in same chat
      log('\n3️⃣ Testing Conversation Continuity...', colors.yellow);
      const followupResponse = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Can you tell me more about that?',
          chatId: chatData.chatId,
          useRAG: true,
          maxChunks: 2
        })
      });

      if (followupResponse.ok) {
        const followupData = await followupResponse.json();
        log('✅ Conversation continued successfully', colors.green);
        log(`🤖 Follow-up Response: ${followupData.assistantMessage.content.substring(0, 100)}...`, colors.cyan);
        log(`💰 Total Chat Cost: $${followupData.chatMetadata.totalCost.toFixed(4)}`, colors.cyan);
        log(`📊 Total Messages: ${followupData.chatMetadata.messageCount}`, colors.cyan);
      } else {
        const errorData = await followupResponse.json();
        log(`❌ Follow-up failed: ${errorData.message}`, colors.red);
      }

    } else {
      const errorData = await newChatResponse.json();
      log(`❌ RAG chat creation failed: ${errorData.message}`, colors.red);
      if (errorData.details) {
        log(`Details: ${errorData.details}`, colors.red);
      }
    }

    // Test 4: Standard chat without RAG
    log('\n4️⃣ Testing Standard Chat (No RAG)...', colors.yellow);
    const standardResponse = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Hello! How are you today?',
        createNewChat: true,
        chatTitle: 'Standard Chat Test',
        useRAG: false
      })
    });

    if (standardResponse.ok) {
      const standardData = await standardResponse.json();
      log('✅ Standard chat working', colors.green);
      log(`🤖 Standard Response: ${standardData.assistantMessage.content.substring(0, 100)}...`, colors.cyan);
      log(`📚 RAG Sources: ${standardData.ragSources.length} (should be 0)`, colors.cyan);
    } else {
      const errorData = await standardResponse.json();
      log(`❌ Standard chat failed: ${errorData.message}`, colors.red);
    }

    log('\n🎉 RAG API Test Complete!', colors.bright + colors.green);
    log('=' .repeat(50), colors.green);

  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      log('\n❌ Connection refused - Admin application not running?', colors.bright + colors.red);
      log('Start the admin application first:', colors.yellow);
      log('  cd admin_application && npm run dev', colors.cyan);
    } else {
      log(`\n❌ Test failed: ${error.message}`, colors.bright + colors.red);
    }
  }
}

// Run the test
if (require.main === module) {
  testRAGAPI().catch((error) => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

export { testRAGAPI };
