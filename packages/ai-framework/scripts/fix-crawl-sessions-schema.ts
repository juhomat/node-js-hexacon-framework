import { config } from 'dotenv';
import { Pool } from 'pg';
import { resolve } from 'path';

// Load .env from project root
config({ path: resolve(__dirname, '../../../.env') });

async function fixCrawlSessionsSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔧 Fixing crawl_sessions schema...');
    
    // Check if the old column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'crawl_sessions' 
      AND column_name IN ('pages_crawled', 'pages_discovered', 'pages_completed')
    `);
    
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    console.log('📊 Existing columns:', existingColumns);
    
    if (existingColumns.includes('pages_crawled') && !existingColumns.includes('pages_discovered')) {
      console.log('🔄 Migrating from pages_crawled to pages_discovered/pages_completed...');
      
      // Add new columns
      await pool.query(`
        ALTER TABLE crawl_sessions 
        ADD COLUMN IF NOT EXISTS pages_discovered INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS pages_completed INTEGER DEFAULT 0
      `);
      
      // Copy data from old column to new columns
      await pool.query(`
        UPDATE crawl_sessions 
        SET 
          pages_discovered = COALESCE(pages_crawled, 0),
          pages_completed = COALESCE(pages_crawled, 0)
        WHERE pages_discovered = 0 AND pages_completed = 0
      `);
      
      // Drop old column
      await pool.query(`
        ALTER TABLE crawl_sessions 
        DROP COLUMN IF EXISTS pages_crawled
      `);
      
      console.log('✅ Migration completed successfully');
    } else if (!existingColumns.includes('pages_discovered')) {
      console.log('🆕 Adding missing columns...');
      
      await pool.query(`
        ALTER TABLE crawl_sessions 
        ADD COLUMN IF NOT EXISTS pages_discovered INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS pages_completed INTEGER DEFAULT 0
      `);
      
      console.log('✅ Columns added successfully');
    } else {
      console.log('✅ Schema is already up to date');
    }
    
    // Recreate the trigger function with correct column names
    console.log('🔄 Updating trigger functions...');
    
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_crawl_session_stats()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Update session statistics when pages are added
          UPDATE crawl_sessions SET
              pages_discovered = (
                  SELECT COUNT(*) FROM pages 
                  WHERE crawl_session_id = NEW.crawl_session_id
              ),
              pages_completed = (
                  SELECT COUNT(*) FROM pages 
                  WHERE crawl_session_id = NEW.crawl_session_id AND status = 'completed'
              ),
              chunks_created = (
                  SELECT COUNT(*) FROM chunks c
                  JOIN pages p ON c.page_id = p.id
                  WHERE p.crawl_session_id = NEW.crawl_session_id
              )
          WHERE id = NEW.crawl_session_id;
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_crawl_session_stats ON pages;
      CREATE TRIGGER trigger_update_crawl_session_stats
          AFTER INSERT OR UPDATE ON pages
          FOR EACH ROW
          EXECUTE FUNCTION update_crawl_session_stats();
    `);
    
    console.log('✅ Trigger functions updated successfully');
    console.log('🎉 Schema fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing schema:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  fixCrawlSessionsSchema().catch(console.error);
}

export { fixCrawlSessionsSchema };
