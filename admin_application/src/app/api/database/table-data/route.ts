/**
 * API Route: Get Table Data
 * GET /api/database/table-data?table=table_name&schema=schema_name&page=1&limit=50
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseAdminApplication } from '@/lib/framework'

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

    // Get database admin application from framework
    const databaseAdminApp = getDatabaseAdminApplication()

    // Use the framework to get table data
    const response = await databaseAdminApp.getTableData({
      tableName,
      schemaName,
      page,
      limit
    })

    return NextResponse.json({
      success: true,
      data: {
        table: {
          name: response.tableData.table.name,
          schema: response.tableData.table.schema,
          columns: response.tableData.table.columns.map(col => ({
            column_name: col.columnName,
            data_type: col.dataType,
            is_nullable: col.isNullable,
            column_default: col.columnDefault,
            character_maximum_length: col.characterMaximumLength,
            numeric_precision: col.numericPrecision,
            numeric_scale: col.numericScale
          })),
          primaryKeys: response.tableData.table.primaryKeys,
          totalRows: response.tableData.table.totalRows
        },
        rows: response.tableData.rows,
        pagination: response.tableData.pagination
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
