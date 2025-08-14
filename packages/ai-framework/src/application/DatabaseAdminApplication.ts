/**
 * Database Administration Application Service
 */

import { DatabaseAdminRepository } from '../domain/repositories/DatabaseAdminRepository'
import {
  GetAllTablesRequest,
  GetAllTablesResponse,
  GetTableDataRequest,
  GetTableDataResponse,
  DeleteTableUseCaseRequest,
  DeleteTableUseCaseResponse,
  DeleteRowUseCaseRequest,
  DeleteRowUseCaseResponse
} from '../domain/use-cases/database'

export class DatabaseAdminApplication {
  constructor(
    private databaseAdminRepository: DatabaseAdminRepository
  ) {}

  async getAllTables(request: GetAllTablesRequest): Promise<GetAllTablesResponse> {
    const tables = await this.databaseAdminRepository.getAllTables()
    
    return {
      tables: tables,
      total: tables.length
    }
  }

  async getTableData(request: GetTableDataRequest): Promise<GetTableDataResponse> {
    // Validate input
    if (!request.tableName || !request.schemaName) {
      throw new Error('Table name and schema name are required')
    }

    if (request.page < 1) {
      throw new Error('Page must be greater than 0')
    }

    if (request.limit < 1 || request.limit > 1000) {
      throw new Error('Limit must be between 1 and 1000')
    }

    // Check if table exists
    const tableExists = await this.databaseAdminRepository.tableExists(
      request.tableName, 
      request.schemaName
    )

    if (!tableExists) {
      throw new Error(`Table "${request.schemaName}"."${request.tableName}" not found`)
    }

    const tableData = await this.databaseAdminRepository.getTableData(
      request.tableName,
      request.schemaName,
      request.page,
      request.limit
    )

    return {
      tableData: tableData
    }
  }

  async deleteTable(request: DeleteTableUseCaseRequest): Promise<DeleteTableUseCaseResponse> {
    // Validate input
    if (!request.tableName || !request.schemaName) {
      throw new Error('Table name and schema name are required')
    }

    // Check if table exists
    const tableExists = await this.databaseAdminRepository.tableExists(
      request.tableName, 
      request.schemaName
    )

    if (!tableExists) {
      throw new Error(`Table "${request.schemaName}"."${request.tableName}" not found`)
    }

    const result = await this.databaseAdminRepository.deleteTable({
      tableName: request.tableName,
      schemaName: request.schemaName,
      tableType: request.tableType
    })

    return {
      result: result
    }
  }

  async deleteRow(request: DeleteRowUseCaseRequest): Promise<DeleteRowUseCaseResponse> {
    // Validate input
    if (!request.tableName || !request.schemaName) {
      throw new Error('Table name and schema name are required')
    }

    if (!request.whereConditions || Object.keys(request.whereConditions).length === 0) {
      throw new Error('WHERE conditions are required to prevent accidental mass deletion')
    }

    // Check if table exists
    const tableExists = await this.databaseAdminRepository.tableExists(
      request.tableName, 
      request.schemaName
    )

    if (!tableExists) {
      throw new Error(`Table "${request.schemaName}"."${request.tableName}" not found`)
    }

    const result = await this.databaseAdminRepository.deleteRow({
      tableName: request.tableName,
      schemaName: request.schemaName,
      whereConditions: request.whereConditions
    })

    return {
      result: result
    }
  }
}
