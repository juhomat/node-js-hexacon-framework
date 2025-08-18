#!/usr/bin/env ts-node

/**
 * Setup Crawling Schema Script
 * 
 * This script sets up the crawling and RAG database schema using the framework's
 * database infrastructure. It can be run standalone or integrated into projects.
 * 
 * Usage:
 * npm run setup-crawling-schema
 * or
 * ts-node scripts/setup-crawling-schema.ts
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load .env from project root
config({ path: path.resolve(__dirname, '../../../.env') });

interface SetupOptions {
  connectionString?: string;
  verbose?: boolean;
  skipExisting?: boolean;
}

class CrawlingSchemaSetup {
  private pool: Pool;
  private verbose: boolean;

  constructor(options: SetupOptions = {}) {
    this.verbose = options.verbose ?? true;
    
    // Initialize database connection
    const connectionString = options.connectionString || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    this.log('🗄️  AI Framework Crawling Schema Setup');
    this.log(`📡 Connecting to: ${this.maskConnectionString(connectionString)}`);
  }

  async setup(): Promise<void> {
    try {
      // Test database connection
      await this.testConnection();
      
      // Check if base schema exists
      await this.checkBaseSchema();
      
      // Run crawling schema setup
      await this.runCrawlingSchema();
      
      // Verify setup
      await this.verifySetup();
      
      this.log('✅ Crawling schema setup completed successfully!');
      
    } catch (error) {
      this.log('❌ Setup failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  private async testConnection(): Promise<void> {
    this.log('🔍 Testing database connection...');
    
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      client.release();
      
      this.log('✅ Database connection successful');
      this.log(`   PostgreSQL: ${result.rows[0].pg_version.split(' ')[1]}`);
      this.log(`   Time: ${result.rows[0].current_time}`);
    } catch (error) {
      throw new Error(`Database connection failed: ${error}`);
    }
  }

  private async checkBaseSchema(): Promise<void> {
    this.log('🔍 Checking base AI Framework schema...');
    
    try {
      const client = await this.pool.connect();
      
      // Check if core tables exist
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('chats', 'messages')
      `);
      
      client.release();
      
      const existingTables = result.rows.map(row => row.table_name);
      
      if (existingTables.length === 0) {
        this.log('⚠️  Base AI Framework schema not found');
        this.log('💡 Run the base schema setup first:');
        this.log('   psql your_db -f src/infrastructure/database/schema.sql');
      } else {
        this.log(`✅ Base schema found: ${existingTables.join(', ')}`);
      }
      
    } catch (error) {
      this.log('⚠️  Could not check base schema:', error);
    }
  }

  private async runCrawlingSchema(): Promise<void> {
    this.log('📊 Setting up crawling schema...');
    
    try {
      // Read the crawling schema SQL file
      const schemaPath = path.join(__dirname, '../src/infrastructure/database/crawling-schema.sql');
      const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
      
      // Execute the schema
      const client = await this.pool.connect();
      await client.query(schemaSQL);
      client.release();
      
      this.log('✅ Crawling schema created successfully');
      
    } catch (error) {
      throw new Error(`Failed to create crawling schema: ${error}`);
    }
  }

  private async verifySetup(): Promise<void> {
    this.log('🔍 Verifying crawling schema setup...');
    
    try {
      const client = await this.pool.connect();
      
      // Check if all expected tables exist
      const expectedTables = ['websites', 'crawl_sessions', 'pages', 'chunks'];
      
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ANY($1)
        ORDER BY table_name
      `, [expectedTables]);
      
      const existingTables = result.rows.map(row => row.table_name);
      
      // Check vector extension
      const vectorResult = await client.query(`
        SELECT * FROM pg_extension WHERE extname = 'vector'
      `);
      
      client.release();
      
      // Report results
      this.log('📋 Schema verification:');
      expectedTables.forEach(table => {
        const exists = existingTables.includes(table);
        this.log(`   ${exists ? '✅' : '❌'} ${table}`);
      });
      
      const vectorEnabled = vectorResult.rows.length > 0;
      this.log(`   ${vectorEnabled ? '✅' : '❌'} pgvector extension`);
      
      if (existingTables.length === expectedTables.length && vectorEnabled) {
        this.log('✅ All crawling tables and extensions verified');
      } else {
        throw new Error('Schema verification failed - some tables or extensions are missing');
      }
      
    } catch (error) {
      throw new Error(`Schema verification failed: ${error}`);
    }
  }

  private log(message: string, ...args: any[]): void {
    if (this.verbose) {
      console.log(message, ...args);
    }
  }

  private maskConnectionString(connectionString: string): string {
    return connectionString.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@');
  }
}

// Main execution
async function main() {
  try {
    const setup = new CrawlingSchemaSetup({
      verbose: true,
      skipExisting: false
    });
    
    await setup.setup();
    
    console.log('\n🎉 Setup complete! Your database now supports:');
    console.log('   • Website management and crawling sessions');
    console.log('   • Page content storage with raw HTML');
    console.log('   • Vector embeddings for RAG capabilities');
    console.log('   • Automatic statistics and triggers');
    console.log('\n📚 Next steps:');
    console.log('   • Use the framework crawling services to populate data');
    console.log('   • Access the admin interface to manage websites');
    console.log('   • Implement RAG chat using the vector search capabilities');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 Setup failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   • Ensure DATABASE_URL is set correctly');
    console.log('   • Check PostgreSQL server is running');
    console.log('   • Verify database exists and is accessible');
    console.log('   • For vector support, install: CREATE EXTENSION vector;');
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { CrawlingSchemaSetup, SetupOptions };
