/**
 * Delete Row Use Case
 */

import { DeleteRowResponse } from '../../entities/DatabaseTable'

export interface DeleteRowUseCaseRequest {
  tableName: string
  schemaName: string
  whereConditions: Record<string, any>
}

export interface DeleteRowUseCaseResponse {
  result: DeleteRowResponse
}
