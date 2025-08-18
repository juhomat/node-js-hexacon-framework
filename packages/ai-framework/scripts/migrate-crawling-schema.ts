#!/usr/bin/env ts-node

/**
 * Crawling Schema Migration Script
 * 
 * Adds missing columns to existing crawling tables for full functionality.
 * Run this if you have existing crawling tables that need the new fields.
 */

import { Pool } from 'pg';
import 'dotenv/config';

interface MigrationOptions {
  connectionString?: string;
  verbose?: boolean;
}

class CrawlingSchemaMigration {
  private pool: Pool;
  private verbose: boolean;

  constructor(options: MigrationOptions = {}) {
    this.verbose = options.verbose ?? true;
    
    const connectionString = options.connectionString || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    this.log('🔄 AI Framework Crawling Schema Migration');
  }

  async migrate(): Promise<void> {
    try {
      await this.testConnection();
      await this.checkExistingSchema();
      await this.runMigrations();
      await this.verifyMigration();
      
      this.log('✅ Migration completed successfully!');
      
    } catch (error) {
      this.log('❌ Migration failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  private async testConnection(): Promise<void> {
    this.log('🔍 Testing database connection...');
    
    const client = await this.pool.connect();
    try {
      await client.query('SELECT NOW()');
      this.log('✅ Database connection successful');
    } finally {
      client.release();
    }
  }

  private async checkExistingSchema(): Promise<void> {
    this.log('🔍 Checking existing crawling schema...');
    
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('websites', 'crawl_sessions', 'pages', 'chunks')
        ORDER BY table_name
      `);
      
      const existingTables = result.rows.map(row => row.table_name);
      
      if (existingTables.length === 0) {
        this.log('⚠️  No crawling tables found. Run setup-crawling-schema first.');
        throw new Error('No crawling tables found');
      }
      
      this.log(`✅ Found existing tables: ${existingTables.join(', ')}`);
      
    } finally {
      client.release();
    }
  }

  private async runMigrations(): Promise<void> {
    this.log('🔄 Running migrations...');
    
    const migrations = [
      {
        name: 'Add missing columns to pages table',
        sql: `
          -- Add priority column if it doesn't exist
          DO $$ 
          BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'pages' AND column_name = 'priority') THEN
              ALTER TABLE pages ADD COLUMN priority INTEGER DEFAULT 50;
            END IF;
          END $$;
          
          -- Add discovery_method column if it doesn't exist
          DO $$ 
          BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'pages' AND column_name = 'discovery_method') THEN
              ALTER TABLE pages ADD COLUMN discovery_method VARCHAR(20) DEFAULT 'crawling';
            END IF;
          END $$;
          
          -- Update status default to 'discovered'
          ALTER TABLE pages ALTER COLUMN status SET DEFAULT 'discovered';
          
          -- Update crawled_at to allow NULL (set during content extraction, not discovery)
          ALTER TABLE pages ALTER COLUMN crawled_at DROP DEFAULT;
        `
      }
    ];

    const client = await this.pool.connect();
    try {
      for (const migration of migrations) {
        this.log(`📝 Running: ${migration.name}`);
        await client.query(migration.sql);
        this.log(`✅ Completed: ${migration.name}`);
      }
    } finally {
      client.release();
    }
  }

  private async verifyMigration(): Promise<void> {
    this.log('🔍 Verifying migration...');
    
    const client = await this.pool.connect();
    try {
      // Check that all expected columns exist
      const result = await client.query(`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns 
        WHERE table_name = 'pages' 
        AND column_name IN ('priority', 'discovery_method', 'status')
        ORDER BY column_name
      `);
      
      const columns = result.rows.reduce((acc, row) => {
        acc[row.column_name] = {
          type: row.data_type,
          default: row.column_default
        };
        return acc;
      }, {});
      
      this.log('📋 Pages table columns:');
      
      // Verify priority column
      if (columns.priority) {
        this.log(`   ✅ priority: ${columns.priority.type} (default: ${columns.priority.default})`);
      } else {
        throw new Error('❌ priority column missing');
      }
      
      // Verify discovery_method column
      if (columns.discovery_method) {
        this.log(`   ✅ discovery_method: ${columns.discovery_method.type} (default: ${columns.discovery_method.default})`);
      } else {
        throw new Error('❌ discovery_method column missing');
      }
      
      // Verify status column
      if (columns.status) {
        this.log(`   ✅ status: ${columns.status.type} (default: ${columns.status.default})`);
      } else {
        throw new Error('❌ status column missing');
      }
      
      this.log('✅ All required columns verified');
      
    } finally {
      client.release();
    }
  }

  private log(message: string, ...args: any[]): void {
    if (this.verbose) {
      console.log(message, ...args);
    }
  }
}

// Main execution
async function main() {
  try {
    const migration = new CrawlingSchemaMigration({
      verbose: true
    });
    
    await migration.migrate();
    
    console.log('\n🎉 Migration complete!');
    console.log('✅ Your crawling tables now support all required fields');
    console.log('🔄 You can now run the discovery tests successfully');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   • Ensure DATABASE_URL is set correctly');
    console.log('   • Check PostgreSQL server is running');
    console.log('   • Verify crawling tables exist (run setup-crawling-schema first)');
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { CrawlingSchemaMigration };
