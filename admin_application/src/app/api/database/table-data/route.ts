/**
 * API Route: Get Table Data
 * GET /api/database/table-data?table=table_name&schema=schema_name&page=1&limit=50
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
    const { searchParams } = new URL(request.url)
    const tableName = searchParams.get('table')
    const schemaName = searchParams.get('schema') || 'public'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 1000) // Max 1000 rows

    if (!tableName) {
      return NextResponse.json(
        { error: 'Missing required parameter: table' },
        { status: 400 }
      )
    }

    // Validate table exists and get column information
    const tableInfoQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = $2
      ORDER BY ordinal_position;
    `

    const tableInfoResult = await pool.query(tableInfoQuery, [tableName, schemaName])

    if (tableInfoResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    const columns = tableInfoResult.rows

    // Get total row count
    const countQuery = `SELECT COUNT(*) as total FROM "${schemaName}"."${tableName}"`
    const countResult = await pool.query(countQuery)
    const totalRows = parseInt(countResult.rows[0].total)

    // Calculate pagination
    const offset = (page - 1) * limit
    const totalPages = Math.ceil(totalRows / limit)

    // Get the actual data
    const dataQuery = `
      SELECT * FROM "${schemaName}"."${tableName}" 
      ORDER BY 1 
      LIMIT $1 OFFSET $2
    `

    const dataResult = await pool.query(dataQuery, [limit, offset])

    // Get primary key information
    const primaryKeyQuery = `
      SELECT column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_name = $1
        AND tc.table_schema = $2
      ORDER BY kcu.ordinal_position;
    `

    const primaryKeyResult = await pool.query(primaryKeyQuery, [tableName, schemaName])
    const primaryKeys = primaryKeyResult.rows.map(row => row.column_name)

    return NextResponse.json({
      success: true,
      data: {
        table: {
          name: tableName,
          schema: schemaName,
          columns: columns,
          primaryKeys: primaryKeys,
          totalRows: totalRows
        },
        rows: dataResult.rows,
        pagination: {
          page: page,
          limit: limit,
          total: totalRows,
          totalPages: totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1
        }
      }
    })

  } catch (error: any) {
    console.error('Database table data error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch table data', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}
