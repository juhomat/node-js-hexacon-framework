/**
 * API Route: Delete Database Row
 * DELETE /api/database/delete-row
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseAdminApplication } from '@/lib/framework'

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

    // Get database admin application from framework
    const databaseAdminApp = getDatabaseAdminApplication()

    // Use the framework to delete the row
    const response = await databaseAdminApp.deleteRow({
      tableName,
      schemaName,
      whereConditions
    })

    return NextResponse.json({
      success: true,
      message: response.result.message,
      data: {
        deletedRows: response.result.deletedRows,
        table: {
          name: response.result.table.name,
          schema: response.result.table.schema
        },
        whereConditions: response.result.whereConditions
      }
    })

  } catch (error: any) {
    console.error('Delete row error:', error)
    
    // Handle specific error types
    if (error.message.includes('foreign key constraint')) {
      return NextResponse.json(
        { 
          error: 'Cannot delete row due to foreign key constraint',
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
          error: 'Table or row not found',
          details: error.message
        },
        { status: 404 }
      )
    }

    if (error.message.includes('view')) {
      return NextResponse.json(
        { 
          error: 'Cannot delete rows from a view',
          details: error.message
        },
        { status: 400 }
      )
    }

    if (error.message.includes('WHERE conditions')) {
      return NextResponse.json(
        { 
          error: 'Invalid WHERE conditions',
          details: error.message
        },
        { status: 400 }
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
