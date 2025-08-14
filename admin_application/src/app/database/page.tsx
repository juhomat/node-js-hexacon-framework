'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Database, 
  Table, 
  Eye,
  Search,
  BarChart3,
  Loader,
  AlertCircle,
  Trash2
} from 'lucide-react'

interface DatabaseTable {
  table_name: string
  table_schema: string
  table_type: string
  type: 'table' | 'view' | 'other'
  row_count: number | null
}

interface TableListResponse {
  success: boolean
  data: {
    tables: DatabaseTable[]
    total: number
  }
  error?: string
}

export default function DatabaseManagementPage() {
  const [tables, setTables] = useState<DatabaseTable[]>([])
  const [filteredTables, setFilteredTables] = useState<DatabaseTable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSchema, setSelectedSchema] = useState<string>('all')
  const [selectedTable, setSelectedTable] = useState<DatabaseTable | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    table: DatabaseTable | null
  }>({ isOpen: false, table: null })
  const [isDeleting, setIsDeleting] = useState(false)

  // Get unique schemas from tables
  const schemas = Array.from(new Set(tables.map(table => table.table_schema))).sort()

  useEffect(() => {
    fetchTables()
  }, [])

  useEffect(() => {
    // Filter tables based on search term and selected schema
    let filtered = tables

    if (searchTerm) {
      filtered = filtered.filter(table => 
        table.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        table.table_schema.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedSchema !== 'all') {
      filtered = filtered.filter(table => table.table_schema === selectedSchema)
    }

    setFilteredTables(filtered)
  }, [tables, searchTerm, selectedSchema])

  const fetchTables = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/database/tables')
      const data: TableListResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tables')
      }

      setTables(data.data.tables)
      setFilteredTables(data.data.tables)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleViewTable = (table: DatabaseTable) => {
    setSelectedTable(table)
  }

  const handleBackToTables = () => {
    setSelectedTable(null)
  }

  const handleDeleteTable = (table: DatabaseTable) => {
    setDeleteDialog({ isOpen: true, table })
  }

  const confirmDeleteTable = async () => {
    if (!deleteDialog.table) return

    try {
      setIsDeleting(true)
      setError(null)

      const response = await fetch('/api/database/delete-table', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableName: deleteDialog.table.table_name,
          schemaName: deleteDialog.table.table_schema,
          tableType: deleteDialog.table.table_type
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete table')
      }

      // Refresh the tables list
      await fetchTables()
      
      // Close the dialog
      setDeleteDialog({ isOpen: false, table: null })

    } catch (error: any) {
      setError(`Delete failed: ${error.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelDeleteTable = () => {
    setDeleteDialog({ isOpen: false, table: null })
  }

  const formatRowCount = (count: number | null) => {
    if (count === null) return 'N/A'
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  const getTableTypeColor = (type: string) => {
    switch (type) {
      case 'table': return 'bg-blue-100 text-blue-800'
      case 'view': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTableTypeIcon = (type: string) => {
    switch (type) {
      case 'table': return <Table className="h-4 w-4" />
      case 'view': return <Eye className="h-4 w-4" />
      default: return <Database className="h-4 w-4" />
    }
  }

  if (selectedTable) {
    return (
      <TableBrowser 
        table={selectedTable} 
        onBack={handleBackToTables}
      />
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="inline-flex items-center text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Admin
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Database className="h-8 w-8 mr-3 text-blue-600" />
              Database Management
            </h1>
            <p className="text-gray-600 mt-1">
              Browse database tables and view their contents
            </p>
          </div>
        </div>
        
        <button
          onClick={fetchTables}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? (
            <Loader className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <BarChart3 className="h-4 w-4 mr-2" />
          )}
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Tables
            </label>
            <div className="relative">
              <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search table names..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Schema Filter
            </label>
            <select
              value={selectedSchema}
              onChange={(e) => setSelectedSchema(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Schemas</option>
              {schemas.map(schema => (
                <option key={schema} value={schema}>
                  {schema}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex items-center justify-center space-x-2">
            <Loader className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-gray-600">Loading database tables...</span>
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

      {/* Tables List */}
      {!loading && !error && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Database Tables
              </h2>
              <span className="text-sm text-gray-500">
                {filteredTables.length} of {tables.length} tables
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Table
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Schema
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rows
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTables.map((table, index) => (
                  <tr key={`${table.table_schema}.${table.table_name}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 mr-3 text-gray-400">
                          {getTableTypeIcon(table.type)}
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {table.table_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{table.table_schema}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTableTypeColor(table.type)}`}>
                        {table.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatRowCount(table.row_count)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewTable(table)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Data
                        </button>
                        <button
                          onClick={() => handleDeleteTable(table)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-600 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          title={`Delete ${table.type}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTables.length === 0 && !loading && (
            <div className="px-6 py-8 text-center">
              <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">
                {searchTerm || selectedSchema !== 'all' 
                  ? 'No tables match your search criteria' 
                  : 'No tables found in the database'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title={`Delete ${deleteDialog.table?.type || 'Table'}`}
        message={`Are you sure you want to delete "${deleteDialog.table?.table_schema}.${deleteDialog.table?.table_name}"?\n\nThis action cannot be undone and will permanently remove ${deleteDialog.table?.type === 'view' ? 'the view' : 'the table and all its data'}.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        onConfirm={confirmDeleteTable}
        onCancel={cancelDeleteTable}
        isDestructive={true}
      />
    </div>
  )
}

// Import the TableBrowser component
import TableBrowser from './TableBrowser'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
