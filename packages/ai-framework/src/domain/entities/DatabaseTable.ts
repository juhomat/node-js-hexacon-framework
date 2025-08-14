/**
 * Database Table Entity
 */

export interface DatabaseTable {
  readonly tableName: string
  readonly tableSchema: string
  readonly tableType: 'BASE TABLE' | 'VIEW' | string
  readonly type: 'table' | 'view' | 'other'
  readonly rowCount: number | null
}

export interface ColumnInfo {
  readonly columnName: string
  readonly dataType: string
  readonly isNullable: 'YES' | 'NO'
  readonly columnDefault: string | null
  readonly characterMaximumLength: number | null
  readonly numericPrecision: number | null
  readonly numericScale: number | null
}

export interface TableData {
  readonly table: {
    readonly name: string
    readonly schema: string
    readonly columns: ColumnInfo[]
    readonly primaryKeys: string[]
    readonly totalRows: number
  }
  readonly rows: Record<string, any>[]
  readonly pagination: {
    readonly page: number
    readonly limit: number
    readonly total: number
    readonly totalPages: number
    readonly hasNext: boolean
    readonly hasPrevious: boolean
  }
}

export interface DeleteTableRequest {
  readonly tableName: string
  readonly schemaName: string
  readonly tableType: string
}

export interface DeleteRowRequest {
  readonly tableName: string
  readonly schemaName: string
  readonly whereConditions: Record<string, any>
}

export interface DeleteTableResponse {
  readonly deletedTable: {
    readonly name: string
    readonly schema: string
    readonly type: string
  }
  readonly message: string
}

export interface DeleteRowResponse {
  readonly deletedRows: number
  readonly table: {
    readonly name: string
    readonly schema: string
  }
  readonly whereConditions: Record<string, any>
  readonly message: string
}
