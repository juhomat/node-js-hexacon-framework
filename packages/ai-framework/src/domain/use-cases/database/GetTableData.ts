/**
 * Get Table Data Use Case
 */

import { TableData } from '../../entities/DatabaseTable'

export interface GetTableDataRequest {
  tableName: string
  schemaName: string
  page: number
  limit: number
}

export interface GetTableDataResponse {
  tableData: TableData
}
