/**
 * PostgreSQL Database Administration Repository Implementation
 */

import { Pool } from 'pg'
import { DatabaseAdminRepository } from '../../domain/repositories/DatabaseAdminRepository'
import { 
  DatabaseTable, 
  TableData, 
  ColumnInfo, 
  DeleteTableRequest, 
  DeleteRowRequest, 
  DeleteTableResponse, 
  DeleteRowResponse 
} from '../../domain/entities/DatabaseTable'

export class PostgreSQLDatabaseAdminRepository implements DatabaseAdminRepository {
  constructor(private pool: Pool) {}

  async getAllTables(): Promise<DatabaseTable[]> {
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

    const result = await this.pool.query(query)

    // Get row counts for each table
    const tablesWithCounts = await Promise.all(
      result.rows.map(async (table) => {
        try {
          if (table.type === 'table') {
            const countQuery = `SELECT COUNT(*) as row_count FROM "${table.table_schema}"."${table.table_name}"`
            const countResult = await this.pool.query(countQuery)
            return {
              tableName: table.table_name,
              tableSchema: table.table_schema,
              tableType: table.table_type,
              type: table.type as 'table' | 'view' | 'other',
              rowCount: parseInt(countResult.rows[0].row_count)
            }
          } else {
            return {
              tableName: table.table_name,
              tableSchema: table.table_schema,
              tableType: table.table_type,
              type: table.type as 'table' | 'view' | 'other',
              rowCount: null // Views don't have a meaningful row count
            }
          }
        } catch (error) {
          // If we can't get the count (e.g., permissions), just return null
          return {
            tableName: table.table_name,
            tableSchema: table.table_schema,
            tableType: table.table_type,
            type: table.type as 'table' | 'view' | 'other',
            rowCount: null
          }
        }
      })
    )

    return tablesWithCounts
  }

  async getTableData(tableName: string, schemaName: string, page: number, limit: number): Promise<TableData> {
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

    const tableInfoResult = await this.pool.query(tableInfoQuery, [tableName, schemaName])

    if (tableInfoResult.rows.length === 0) {
      throw new Error('Table not found')
    }

    const columns: ColumnInfo[] = tableInfoResult.rows.map(row => ({
      columnName: row.column_name,
      dataType: row.data_type,
      isNullable: row.is_nullable,
      columnDefault: row.column_default,
      characterMaximumLength: row.character_maximum_length,
      numericPrecision: row.numeric_precision,
      numericScale: row.numeric_scale
    }))

    // Get total row count
    const countQuery = `SELECT COUNT(*) as total FROM "${schemaName}"."${tableName}"`
    const countResult = await this.pool.query(countQuery)
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

    const dataResult = await this.pool.query(dataQuery, [limit, offset])

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

    const primaryKeyResult = await this.pool.query(primaryKeyQuery, [tableName, schemaName])
    const primaryKeys = primaryKeyResult.rows.map(row => row.column_name)

    return {
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
  }

  async deleteTable(request: DeleteTableRequest): Promise<DeleteTableResponse> {
    // Validate table exists first
    const checkQuery = `
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_name = $1 AND table_schema = $2
    `
    
    const checkResult = await this.pool.query(checkQuery, [request.tableName, request.schemaName])
    
    if (checkResult.rows.length === 0) {
      throw new Error('Table not found')
    }

    const actualTableType = checkResult.rows[0].table_type

    // Determine the correct DROP statement based on table type
    let dropStatement: string
    if (actualTableType === 'VIEW') {
      dropStatement = `DROP VIEW IF EXISTS "${request.schemaName}"."${request.tableName}" CASCADE`
    } else {
      dropStatement = `DROP TABLE IF EXISTS "${request.schemaName}"."${request.tableName}" CASCADE`
    }

    try {
      // Execute the drop statement
      await this.pool.query(dropStatement)

      return {
        deletedTable: {
          name: request.tableName,
          schema: request.schemaName,
          type: actualTableType
        },
        message: `${actualTableType.toLowerCase()} "${request.schemaName}"."${request.tableName}" has been deleted successfully`
      }
    } catch (error: any) {
      // Handle specific PostgreSQL errors
      if (error.code === '2BP01') {
        throw new Error('Cannot delete table due to dependencies. This table is referenced by other objects.')
      }
      
      if (error.code === '42501') {
        throw new Error('Permission denied. Insufficient privileges to delete this table.')
      }
      
      throw error
    }
  }

  async deleteRow(request: DeleteRowRequest): Promise<DeleteRowResponse> {
    // Validate table exists first
    const checkQuery = `
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_name = $1 AND table_schema = $2
    `
    
    const checkResult = await this.pool.query(checkQuery, [request.tableName, request.schemaName])
    
    if (checkResult.rows.length === 0) {
      throw new Error('Table not found')
    }

    if (checkResult.rows[0].table_type === 'VIEW') {
      throw new Error('Cannot delete rows from a view')
    }

    // Build the WHERE clause safely using parameterized queries
    const whereKeys = Object.keys(request.whereConditions)
    if (whereKeys.length === 0) {
      throw new Error('No WHERE conditions provided. This would delete all rows, which is not allowed for safety.')
    }

    // Build parameterized WHERE clause
    const whereClause = whereKeys.map((key, index) => {
      const value = request.whereConditions[key]
      if (value === null || value === undefined) {
        return `"${key}" IS NULL`
      }
      return `"${key}" = $${index + 1}`
    }).join(' AND ')

    // Get values for parameterized query (excluding null values)
    const values = whereKeys.map(key => request.whereConditions[key]).filter(val => val !== null && val !== undefined)

    // First, check how many rows would be affected
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM "${request.schemaName}"."${request.tableName}" 
      WHERE ${whereClause}
    `

    const countResult = await this.pool.query(countQuery, values)
    const rowsToDelete = parseInt(countResult.rows[0].count)

    if (rowsToDelete === 0) {
      throw new Error('No rows found matching the specified conditions')
    }

    // Execute the delete
    const deleteQuery = `
      DELETE FROM "${request.schemaName}"."${request.tableName}" 
      WHERE ${whereClause}
    `

    try {
      const deleteResult = await this.pool.query(deleteQuery, values)

      return {
        deletedRows: deleteResult.rowCount || 0,
        table: {
          name: request.tableName,
          schema: request.schemaName
        },
        whereConditions: request.whereConditions,
        message: `Successfully deleted ${deleteResult.rowCount} row(s) from "${request.schemaName}"."${request.tableName}"`
      }
    } catch (error: any) {
      // Handle specific PostgreSQL errors
      if (error.code === '23503') {
        throw new Error('Cannot delete row due to foreign key constraint. This row is referenced by other records.')
      }
      
      if (error.code === '42501') {
        throw new Error('Permission denied. Insufficient privileges to delete from this table.')
      }
      
      throw error
    }
  }

  async tableExists(tableName: string, schemaName: string): Promise<boolean> {
    const query = `
      SELECT 1
      FROM information_schema.tables 
      WHERE table_name = $1 AND table_schema = $2
      LIMIT 1
    `
    
    const result = await this.pool.query(query, [tableName, schemaName])
    return result.rows.length > 0
  }
}
