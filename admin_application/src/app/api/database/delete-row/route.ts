/**
 * API Route: Delete Database Row
 * DELETE /api/database/delete-row
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
    const { tableName, schemaName, whereConditions } = body

    if (!tableName || !schemaName || !whereConditions) {
      return NextResponse.json(
        { error: 'Missing required parameters: tableName, schemaName, and whereConditions' },
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

    if (checkResult.rows[0].table_type === 'VIEW') {
      return NextResponse.json(
        { error: 'Cannot delete rows from a view' },
        { status: 400 }
      )
    }

    // Build the WHERE clause safely using parameterized queries
    const whereKeys = Object.keys(whereConditions)
    if (whereKeys.length === 0) {
      return NextResponse.json(
        { error: 'No WHERE conditions provided. This would delete all rows, which is not allowed for safety.' },
        { status: 400 }
      )
    }

    // Build parameterized WHERE clause
    const whereClause = whereKeys.map((key, index) => {
      const value = whereConditions[key]
      if (value === null || value === undefined) {
        return `"${key}" IS NULL`
      }
      return `"${key}" = $${index + 1}`
    }).join(' AND ')

    // Get values for parameterized query (excluding null values)
    const values = whereKeys.map(key => whereConditions[key]).filter(val => val !== null && val !== undefined)

    // First, check how many rows would be affected
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM "${schemaName}"."${tableName}" 
      WHERE ${whereClause}
    `

    const countResult = await pool.query(countQuery, values)
    const rowsToDelete = parseInt(countResult.rows[0].count)

    if (rowsToDelete === 0) {
      return NextResponse.json(
        { error: 'No rows found matching the specified conditions' },
        { status: 404 }
      )
    }

    // Execute the delete
    const deleteQuery = `
      DELETE FROM "${schemaName}"."${tableName}" 
      WHERE ${whereClause}
    `

    const deleteResult = await pool.query(deleteQuery, values)

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.rowCount} row(s) from "${schemaName}"."${tableName}"`,
      data: {
        deletedRows: deleteResult.rowCount,
        table: {
          name: tableName,
          schema: schemaName
        },
        whereConditions: whereConditions
      }
    })

  } catch (error: any) {
    console.error('Delete row error:', error)
    
    // Handle specific PostgreSQL errors
    if (error.code === '23503') {
      return NextResponse.json(
        { 
          error: 'Cannot delete row due to foreign key constraint',
          details: 'This row is referenced by other records. Delete dependent records first.'
        },
        { status: 409 }
      )
    }
    
    if (error.code === '42501') {
      return NextResponse.json(
        { 
          error: 'Permission denied',
          details: 'Insufficient privileges to delete from this table.'
        },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to delete row', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}
