'use client'

/**
 * Web Scraping & Embedding Interface
 * 
 * Complete UI for web scraping functionality with real-time progress
 * and comprehensive result display.
 */

import { useState } from 'react'

interface ScrapeRequest {
  websiteUrl: string
  maxPages: number
  maxDepth: number
  description: string
}

interface ScrapeResult {
  success: boolean
  website?: {
    id: string
    domain: string
    title: string
    baseUrl: string
  }
  session?: {
    id: string
    status: string
    pagesDiscovered: number
    pagesCompleted: number
  }
  summary?: {
    pagesDiscovered: number
    pagesProcessed: number
    chunksCreated: number
    embeddingsGenerated: number
    processingTimeMs: number
    totalCost: number
    averageQuality: number
  }
  pages?: Array<{
    url: string
    title: string
    chunks: number
    quality: number
  }>
  error?: string
  message?: string
}

export default function WebScrapingInterface() {
  const [formData, setFormData] = useState<ScrapeRequest>({
    websiteUrl: '',
    maxPages: 10,
    maxDepth: 1,
    description: ''
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ScrapeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('🚀 Starting web scraping request:', formData)
      
      const response = await fetch('/api/crawling/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data: ScrapeResult = await response.json()
      
      if (response.ok && data.success) {
        console.log('✅ Web scraping completed:', data)
        setResult(data)
      } else {
        console.error('❌ Web scraping failed:', data)
        setError(data.error || data.message || 'Unknown error occurred')
      }
    } catch (err: any) {
      console.error('❌ Network error:', err)
      setError(`Network error: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      websiteUrl: '',
      maxPages: 10,
      maxDepth: 1,
      description: ''
    })
    setResult(null)
    setError(null)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🕷️ Web Scraping & Embedding
        </h1>
        <p className="text-gray-600">
          Crawl websites, extract content, and generate vector embeddings for RAG systems
        </p>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Website URL */}
          <div>
            <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Website URL *
            </label>
            <input
              type="url"
              id="websiteUrl"
              value={formData.websiteUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, websiteUrl: e.target.value }))}
              placeholder="https://docs.openai.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              The website to crawl and extract content from
            </p>
          </div>

          {/* Parameters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Max Pages */}
            <div>
              <label htmlFor="maxPages" className="block text-sm font-medium text-gray-700 mb-1">
                Max Pages
              </label>
              <input
                type="number"
                id="maxPages"
                value={formData.maxPages}
                onChange={(e) => setFormData(prev => ({ ...prev, maxPages: parseInt(e.target.value) || 10 }))}
                min="1"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum number of pages to process (1-100)
              </p>
            </div>

            {/* Max Depth */}
            <div>
              <label htmlFor="maxDepth" className="block text-sm font-medium text-gray-700 mb-1">
                Max Depth
              </label>
              <input
                type="number"
                id="maxDepth"
                value={formData.maxDepth}
                onChange={(e) => setFormData(prev => ({ ...prev, maxDepth: parseInt(e.target.value) || 1 }))}
                min="1"
                max="5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                How deep to crawl from the root page (1-5)
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., OpenAI API Documentation"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional description to help identify this website
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={isLoading || !formData.websiteUrl}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                '🚀 Start Web Scraping'
              )}
            </button>
            
            <button
              type="button"
              onClick={resetForm}
              disabled={isLoading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="animate-spin h-5 w-5 text-blue-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div>
              <p className="text-blue-800 font-medium">Processing Web Scraping...</p>
              <p className="text-blue-600 text-sm">
                Discovering pages → Extracting content → Generating chunks → Creating embeddings → Storing in database
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-red-400 mr-3">❌</div>
            <div>
              <h3 className="text-red-800 font-medium">Scraping Failed</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Results */}
      {result && result.success && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <div className="text-green-400 text-xl mr-3">✅</div>
              <h3 className="text-green-800 font-medium text-lg">Web Scraping Completed!</h3>
            </div>
            <p className="text-green-700">{result.message}</p>
          </div>

          {/* Metrics */}
          {result.summary && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">📊 Processing Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{result.summary.pagesProcessed}</div>
                  <div className="text-sm text-gray-500">Pages Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{result.summary.chunksCreated}</div>
                  <div className="text-sm text-gray-500">Chunks Created</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{result.summary.embeddingsGenerated}</div>
                  <div className="text-sm text-gray-500">Embeddings Generated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">${result.summary.totalCost.toFixed(4)}</div>
                  <div className="text-sm text-gray-500">Total Cost</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>⏱️ Processing Time: {(result.summary.processingTimeMs / 1000).toFixed(1)}s</div>
                <div>🎯 Average Quality: {result.summary.averageQuality}%</div>
              </div>
            </div>
          )}

          {/* Website Info */}
          {result.website && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">🌐 Website Information</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Domain:</span> {result.website.domain}</div>
                <div><span className="font-medium">Title:</span> {result.website.title}</div>
                <div><span className="font-medium">Base URL:</span> {result.website.baseUrl}</div>
                <div><span className="font-medium">Website ID:</span> <code className="bg-gray-100 px-1 rounded">{result.website.id}</code></div>
              </div>
            </div>
          )}

          {/* Session Info */}
          {result.session && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">📋 Session Information</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Session ID:</span> <code className="bg-gray-100 px-1 rounded">{result.session.id}</code></div>
                <div><span className="font-medium">Status:</span> <span className="capitalize text-green-600">{result.session.status}</span></div>
                <div><span className="font-medium">Pages Discovered:</span> {result.session.pagesDiscovered}</div>
                <div><span className="font-medium">Pages Completed:</span> {result.session.pagesCompleted}</div>
              </div>
            </div>
          )}

          {/* Pages List */}
          {result.pages && result.pages.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">📄 Processed Pages</h3>
              <div className="space-y-3">
                {result.pages.map((page, index) => (
                  <div key={index} className="border border-gray-200 rounded p-3">
                    <div className="font-medium text-gray-900">{page.title}</div>
                    <div className="text-sm text-blue-600 hover:text-blue-800">
                      <a href={page.url} target="_blank" rel="noopener noreferrer">{page.url}</a>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {page.chunks} chunks • Quality: {page.quality}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
