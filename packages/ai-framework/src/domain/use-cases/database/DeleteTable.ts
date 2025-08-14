/**
 * Delete Table Use Case
 */

import { DeleteTableResponse } from '../../entities/DatabaseTable'

export interface DeleteTableUseCaseRequest {
  tableName: string
  schemaName: string
  tableType: string
}

export interface DeleteTableUseCaseResponse {
  result: DeleteTableResponse
}
