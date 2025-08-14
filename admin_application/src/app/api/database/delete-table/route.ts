/**
 * API Route: Delete Database Table
 * DELETE /api/database/delete-table
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseAdminApplication } from '@/lib/framework'

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

    // Get database admin application from framework
    const databaseAdminApp = getDatabaseAdminApplication()

    // Use the framework to delete the table
    const response = await databaseAdminApp.deleteTable({
      tableName,
      schemaName,
      tableType
    })

    return NextResponse.json({
      success: true,
      message: response.result.message,
      data: {
        deletedTable: {
          name: response.result.deletedTable.name,
          schema: response.result.deletedTable.schema,
          type: response.result.deletedTable.type
        }
      }
    })

  } catch (error: any) {
    console.error('Delete table error:', error)
    
    // Handle specific error types
    if (error.message.includes('dependencies')) {
      return NextResponse.json(
        { 
          error: 'Cannot delete table due to dependencies',
          details: error.message
        },
        { status: 409 }
      )
    }
    
    if (error.message.includes('Permission denied')) {
      return NextResponse.json(
        { 
          error: 'Permission denied',
          details: error.message
        },
        { status: 403 }
      )
    }

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { 
          error: 'Table not found',
          details: error.message
        },
        { status: 404 }
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
