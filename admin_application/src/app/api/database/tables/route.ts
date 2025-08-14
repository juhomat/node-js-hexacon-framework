/**
 * API Route: List Database Tables
 * GET /api/database/tables
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseAdminApplication } from '@/lib/framework'

export async function GET(request: NextRequest) {
  try {
    // Get database admin application from framework
    const databaseAdminApp = getDatabaseAdminApplication()

    // Use the framework to get all tables
    const response = await databaseAdminApp.getAllTables({})

    return NextResponse.json({
      success: true,
      data: {
        tables: response.tables.map(table => ({
          table_name: table.tableName,
          table_schema: table.tableSchema,
          table_type: table.tableType,
          type: table.type,
          row_count: table.rowCount
        })),
        total: response.total
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
