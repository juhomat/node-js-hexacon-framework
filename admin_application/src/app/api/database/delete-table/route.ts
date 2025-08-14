/**
 * API Route: Delete Database Table
 * DELETE /api/database/delete-table
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

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { tableName, schemaName, tableType } = body

    if (!tableName || !schemaName) {
      return NextResponse.json(
        { error: 'Missing required parameters: tableName and schemaName' },
        { status: 400 }
      )
    }

    // Validate table exists first
    const checkQuery = `
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_name = $1 AND table_schema = $2
    `
    
    const checkResult = await pool.query(checkQuery, [tableName, schemaName])
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    const actualTableType = checkResult.rows[0].table_type

    // Determine the correct DROP statement based on table type
    let dropStatement: string
    if (actualTableType === 'VIEW') {
      dropStatement = `DROP VIEW IF EXISTS "${schemaName}"."${tableName}" CASCADE`
    } else {
      dropStatement = `DROP TABLE IF EXISTS "${schemaName}"."${tableName}" CASCADE`
    }

    // Execute the drop statement
    await pool.query(dropStatement)

    return NextResponse.json({
      success: true,
      message: `${actualTableType.toLowerCase()} "${schemaName}"."${tableName}" has been deleted successfully`,
      data: {
        deletedTable: {
          name: tableName,
          schema: schemaName,
          type: actualTableType
        }
      }
    })

  } catch (error: any) {
    console.error('Delete table error:', error)
    
    // Handle specific PostgreSQL errors
    if (error.code === '2BP01') {
      return NextResponse.json(
        { 
          error: 'Cannot delete table due to dependencies',
          details: 'This table is referenced by other objects. Use CASCADE option or remove dependencies first.'
        },
        { status: 409 }
      )
    }
    
    if (error.code === '42501') {
      return NextResponse.json(
        { 
          error: 'Permission denied',
          details: 'Insufficient privileges to delete this table.'
        },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to delete table', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}
