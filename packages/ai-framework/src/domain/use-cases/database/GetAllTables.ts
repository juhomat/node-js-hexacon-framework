/**
 * Get All Tables Use Case
 */

import { DatabaseTable } from '../../entities/DatabaseTable'

export interface GetAllTablesRequest {
  // No parameters needed for getting all tables
}

export interface GetAllTablesResponse {
  tables: DatabaseTable[]
  total: number
}
