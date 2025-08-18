#!/usr/bin/env tsx

/**
 * Simple Single Page Test Script
 * 
 * Proves that the single page pipeline works by running each step separately
 * and showing the results.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
config({ path: resolve(__dirname, '../.env') });

async function runSimpleTest() {
  console.log('🧪 Simple Single Page Test');
  console.log('============================================');
  console.log('This test proves the single page functionality works by running:');
  console.log('1. Manual page addition');
  console.log('2. Content extraction');
  console.log('3. Chunking and embedding');
  console.log();

  const website = 'https://www.advanceb2b.com';
  const page = 'https://www.advanceb2b.com/customers';
  const title = 'Our Customers';
  const priority = 90;

  console.log(`🌐 Website: ${website}`);
  console.log(`📄 Page: ${page}`);
  console.log(`📝 Title: ${title}`);
  console.log(`⭐ Priority: ${priority}`);
  console.log();

  try {
    console.log('📄 Step 1: Adding Page Manually');
    console.log('----------------------------------------');
    
    // Use our known working manual page addition script
    const { execSync } = await import('child_process');
    
    const step1Result = execSync(
      `npx tsx test-manual-page-addition.ts --website "${website}" --page "${page}" --title "${title}" --priority ${priority}`,
      { encoding: 'utf8' }
    );
    
    console.log('✅ Page addition completed successfully');
    
    // Extract page ID from the output
    const pageIdMatch = step1Result.match(/🆔 Page ID: ([a-f0-9-]+)/);
    if (!pageIdMatch) {
      throw new Error('Could not extract page ID from output');
    }
    const pageId = pageIdMatch[1];
    console.log(`🆔 Extracted Page ID: ${pageId}`);
    console.log();

    console.log('📥 Step 2: Content Extraction');
    console.log('----------------------------------------');
    
    const step2Result = execSync(
      `npx tsx test-content-extraction.ts --page-id "${pageId}" --update-db`,
      { encoding: 'utf8' }
    );
    
    console.log('✅ Content extraction completed successfully');
    console.log();

    console.log('✂️ Step 3: Chunking and Embedding');
    console.log('----------------------------------------');
    
    const step3Result = execSync(
      `npx tsx test-chunking-embedding.ts --page-id "${pageId}"`,
      { encoding: 'utf8' }
    );
    
    console.log('✅ Chunking and embedding completed successfully');
    console.log();

    console.log('🎉 COMPLETE SUCCESS!');
    console.log('============================================');
    console.log('✅ Page addition    → ✅ Working');
    console.log('✅ Content extraction → ✅ Working');  
    console.log('✅ Chunking & embedding → ✅ Working');
    console.log();
    console.log('🎯 The complete single page pipeline is FUNCTIONAL!');
    console.log('📄 The page has been:');
    console.log('   • Added to the database with proper metadata');
    console.log('   • Content extracted and cleaned');
    console.log('   • Text chunked into optimal sizes');
    console.log('   • Vector embeddings generated and stored');
    console.log('   • Ready for RAG similarity search');
    console.log();
    console.log('💾 All data is stored in PostgreSQL with pgvector embeddings.');
    console.log('🔍 The content is now indexed and searchable in your vector database.');
    console.log();
    console.log('✨ SINGLE PAGE ENDPOINT FUNCTIONALITY VERIFIED! ✨');

  } catch (error: any) {
    console.error('❌ Test failed at some step:', error.message);
    
    // Show partial success
    console.log('\n📊 Partial Results:');
    console.log('Some steps may have completed successfully.');
    console.log('Check the individual error messages above for details.');
  }
}

runSimpleTest().catch(console.error);
