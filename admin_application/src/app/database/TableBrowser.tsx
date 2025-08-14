'use client'

import { useState, useEffect } from 'react'
import { 
  ArrowLeft, 
  Table, 
  ChevronLeft,
  ChevronRight,
  Loader,
  AlertCircle,
  Eye,
  Hash,
  Calendar,
  Type,
  MoreHorizontal,
  Trash2
} from 'lucide-react'

interface DatabaseTable {
  table_name: string
  table_schema: string
  table_type: string
  type: 'table' | 'view' | 'other'
  row_count: number | null
}

interface ColumnInfo {
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
  character_maximum_length: number | null
  numeric_precision: number | null
  numeric_scale: number | null
}

interface TableDataResponse {
  success: boolean
  data: {
    table: {
      name: string
      schema: string
      columns: ColumnInfo[]
      primaryKeys: string[]
      totalRows: number
    }
    rows: Record<string, any>[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrevious: boolean
    }
  }
  error?: string
}

interface TableBrowserProps {
  table: DatabaseTable
  onBack: () => void
}

export default function TableBrowser({ table, onBack }: TableBrowserProps) {
  const [tableData, setTableData] = useState<TableDataResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    row: Record<string, any> | null
    rowIndex: number | null
  }>({ isOpen: false, row: null, rowIndex: null })
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchTableData(currentPage, pageSize)
  }, [currentPage, pageSize])

  const fetchTableData = async (page: number, limit: number) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        table: table.table_name,
        schema: table.table_schema,
        page: page.toString(),
        limit: limit.toString()
      })

      const response = await fetch(`/api/database/table-data?${params}`)
      const data: TableDataResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch table data')
      }

      setTableData(data.data)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1) // Reset to first page when changing page size
  }

  const handleDeleteRow = (row: Record<string, any>, rowIndex: number) => {
    setDeleteDialog({ isOpen: true, row, rowIndex })
  }

  const confirmDeleteRow = async () => {
    if (!deleteDialog.row || !tableData) return

    try {
      setIsDeleting(true)
      setError(null)

      // Build WHERE conditions from primary keys or all non-null columns if no primary keys
      const whereConditions: Record<string, any> = {}
      
      if (tableData.table.primaryKeys.length > 0) {
        // Use primary keys for WHERE clause
        tableData.table.primaryKeys.forEach(pkColumn => {
          whereConditions[pkColumn] = deleteDialog.row![pkColumn]
        })
      } else {
        // If no primary keys, use all columns (risky but necessary for tables without PKs)
        Object.keys(deleteDialog.row).forEach(column => {
          whereConditions[column] = deleteDialog.row![column]
        })
      }

      const response = await fetch('/api/database/delete-row', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableName: table.table_name,
          schemaName: table.table_schema,
          whereConditions
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete row')
      }

      // Refresh the table data
      await fetchTableData(currentPage, pageSize)
      
      // Close the dialog
      setDeleteDialog({ isOpen: false, row: null, rowIndex: null })

    } catch (error: any) {
      setError(`Delete failed: ${error.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelDeleteRow = () => {
    setDeleteDialog({ isOpen: false, row: null, rowIndex: null })
  }

  const formatCellValue = (value: any, column: ColumnInfo) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">NULL</span>
    }

    const stringValue = String(value)

    // Handle different data types
    if (column.data_type.includes('timestamp') || column.data_type.includes('date')) {
      try {
        const date = new Date(value)
        return (
          <span className="text-purple-600 font-mono text-sm">
            {date.toLocaleDateString()} {date.toLocaleTimeString()}
          </span>
        )
      } catch {
        return stringValue
      }
    }

    if (column.data_type.includes('int') || column.data_type.includes('numeric') || column.data_type.includes('decimal')) {
      return <span className="text-blue-600 font-mono text-sm">{stringValue}</span>
    }

    if (column.data_type.includes('bool')) {
      return (
        <span className={`font-medium ${value ? 'text-green-600' : 'text-red-600'}`}>
          {value ? 'true' : 'false'}
        </span>
      )
    }

    // Truncate long text values
    if (stringValue.length > 100) {
      return (
        <div className="group relative">
          <span className="text-sm">{stringValue.substring(0, 100)}...</span>
          <div className="invisible group-hover:visible absolute z-10 p-2 bg-gray-900 text-white text-xs rounded shadow-lg max-w-md break-words -top-2 left-0">
            {stringValue}
          </div>
        </div>
      )
    }

    return <span className="text-sm">{stringValue}</span>
  }

  const getColumnIcon = (column: ColumnInfo) => {
    if (tableData?.table.primaryKeys.includes(column.column_name)) {
      return <div title="Primary Key"><Hash className="h-4 w-4 text-yellow-500" /></div>
    }
    
    if (column.data_type.includes('timestamp') || column.data_type.includes('date')) {
      return <div title="Date/Time"><Calendar className="h-4 w-4 text-purple-500" /></div>
    }
    
    if (column.data_type.includes('int') || column.data_type.includes('numeric')) {
      return <div title="Numeric"><Hash className="h-4 w-4 text-blue-500" /></div>
    }
    
    return <div title="Text"><Type className="h-4 w-4 text-gray-500" /></div>
  }

  const getColumnTypeDisplay = (column: ColumnInfo) => {
    let type = column.data_type
    
    if (column.character_maximum_length) {
      type += `(${column.character_maximum_length})`
    } else if (column.numeric_precision && column.numeric_scale) {
      type += `(${column.numeric_precision},${column.numeric_scale})`
    } else if (column.numeric_precision) {
      type += `(${column.numeric_precision})`
    }
    
    return type
  }

  return (
    <div className="max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="inline-flex items-center text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Tables
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Table className="h-8 w-8 mr-3 text-blue-600" />
              {table.table_schema}.{table.table_name}
            </h1>
            <p className="text-gray-600 mt-1">
              {tableData ? (
                <>
                  {tableData.table.totalRows.toLocaleString()} total rows • {tableData.table.columns.length} columns
                </>
              ) : (
                'Loading table information...'
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          >
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
            <option value={250}>250 per page</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex items-center justify-center space-x-2">
            <Loader className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-gray-600">Loading table data...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <strong className="text-red-800">Error:</strong>
              <span className="text-red-700 ml-2">{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Table Data */}
      {!loading && !error && tableData && (
        <>
          {/* Pagination Top */}
          {tableData.pagination.totalPages > 1 && (
            <div className="bg-white rounded-lg shadow px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((tableData.pagination.page - 1) * tableData.pagination.limit) + 1} to{' '}
                  {Math.min(tableData.pagination.page * tableData.pagination.limit, tableData.pagination.total)} of{' '}
                  {tableData.pagination.total.toLocaleString()} results
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!tableData.pagination.hasPrevious}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </button>
                  
                  <span className="text-sm text-gray-700">
                    Page {tableData.pagination.page} of {tableData.pagination.totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!tableData.pagination.hasNext}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {tableData.table.columns.map((column) => (
                      <th
                        key={column.column_name}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        <div className="flex items-center space-x-2">
                          {getColumnIcon(column)}
                          <div>
                            <div className="font-semibold">{column.column_name}</div>
                            <div className="text-xs text-gray-400 normal-case">
                              {getColumnTypeDisplay(column)}
                              {column.is_nullable === 'NO' && (
                                <span className="ml-1 text-red-500">*</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableData.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {tableData.table.columns.map((column) => (
                        <td
                          key={column.column_name}
                          className="px-6 py-4 whitespace-nowrap max-w-xs"
                        >
                          {formatCellValue(row[column.column_name], column)}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDeleteRow(row, rowIndex)}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-sm font-medium rounded-md text-red-600 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          title="Delete row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {tableData.rows.length === 0 && (
              <div className="px-6 py-8 text-center">
                <Eye className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">This table is empty</p>
              </div>
            )}
          </div>

          {/* Pagination Bottom */}
          {tableData.pagination.totalPages > 1 && (
            <div className="bg-white rounded-lg shadow px-6 py-4">
              <div className="flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={!tableData.pagination.hasPrevious}
                    className="px-3 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    First
                  </button>
                  
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!tableData.pagination.hasPrevious}
                    className="px-3 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  
                  <span className="px-4 py-2 text-sm">
                    {tableData.pagination.page} / {tableData.pagination.totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!tableData.pagination.hasNext}
                    className="px-3 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                  
                  <button
                    onClick={() => handlePageChange(tableData.pagination.totalPages)}
                    disabled={!tableData.pagination.hasNext}
                    className="px-3 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Row Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Row"
        message={`Are you sure you want to delete this row?\n\nThis action cannot be undone and will permanently remove the data from the table.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete Row'}
        cancelText="Cancel"
        onConfirm={confirmDeleteRow}
        onCancel={cancelDeleteRow}
        isDestructive={true}
      />
    </div>
  )
}

import ConfirmDialog from '@/components/ui/ConfirmDialog'
