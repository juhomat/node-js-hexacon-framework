/**
 * Web Scraping & Embedding Test Page
 * 
 * This page provides a comprehensive interface for testing the complete
 * web scraping and embedding pipeline of the AI Framework.
 */

import WebScrapingInterface from '@/components/WebScrapingInterface'

export default function ScrapingTestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <WebScrapingInterface />
    </div>
  )
}

export const metadata = {
  title: 'Web Scraping & Embedding - AI Framework Admin',
  description: 'Test website crawling, content extraction, chunking, and vector embedding functionality',
}
