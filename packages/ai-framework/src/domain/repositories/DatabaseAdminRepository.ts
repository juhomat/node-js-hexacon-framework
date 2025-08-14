/**
 * Database Administration Repository Interface
 */

import { DatabaseTable, TableData, DeleteTableRequest, DeleteRowRequest, DeleteTableResponse, DeleteRowResponse } from '../entities/DatabaseTable'

export interface DatabaseAdminRepository {
  /**
   * Get all tables in the database
   */
  getAllTables(): Promise<DatabaseTable[]>

  /**
   * Get table data with pagination
   */
  getTableData(
    tableName: string,
    schemaName: string,
    page: number,
    limit: number
  ): Promise<TableData>

  /**
   * Delete a table or view
   */
  deleteTable(request: DeleteTableRequest): Promise<DeleteTableResponse>

  /**
   * Delete row(s) from a table
   */
  deleteRow(request: DeleteRowRequest): Promise<DeleteRowResponse>

  /**
   * Check if table exists
   */
  tableExists(tableName: string, schemaName: string): Promise<boolean>
}
