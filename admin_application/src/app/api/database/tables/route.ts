/**
 * API Route: List Database Tables
 * GET /api/database/tables
 */

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

// Create database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/ai_framework_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export async function GET(request: NextRequest) {
  try {
    // Query to get all tables in the current database
    const query = `
      SELECT 
        table_name,
        table_schema,
        table_type,
        CASE 
          WHEN table_type = 'BASE TABLE' THEN 'table'
          WHEN table_type = 'VIEW' THEN 'view'
          ELSE 'other'
        END as type
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name;
    `

    const result = await pool.query(query)

    // Get row counts for each table
    const tablesWithCounts = await Promise.all(
      result.rows.map(async (table) => {
        try {
          if (table.type === 'table') {
            const countQuery = `SELECT COUNT(*) as row_count FROM "${table.table_schema}"."${table.table_name}"`
            const countResult = await pool.query(countQuery)
            return {
              ...table,
              row_count: parseInt(countResult.rows[0].row_count)
            }
          } else {
            return {
              ...table,
              row_count: null // Views don't have a meaningful row count
            }
          }
        } catch (error) {
          // If we can't get the count (e.g., permissions), just return null
          return {
            ...table,
            row_count: null
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        tables: tablesWithCounts,
        total: tablesWithCounts.length
      }
    })

  } catch (error: any) {
    console.error('Database tables error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch database tables', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}
