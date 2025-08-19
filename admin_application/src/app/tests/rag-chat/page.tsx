/**
 * RAG Chat Test Page
 * 
 * This page provides a comprehensive interface for testing the
 * Retrieval-Augmented Generation (RAG) chat functionality.
 */

import RAGChatInterface from '@/components/RAGChatInterface'

export default function RAGChatTestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <RAGChatInterface />
    </div>
  )
}

export const metadata = {
  title: 'RAG Chat System - AI Framework Admin',
  description: 'Test Retrieval-Augmented Generation chat with website-specific context',
}
