'use client'

import Link from 'next/link'
import { 
  MessageSquare, 
  Database, 
  Globe, 
  Brain, 
  Settings, 
  BarChart3,
  TestTube,
  Zap
} from 'lucide-react'

interface TestFeature {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href: string
  status: 'implemented' | 'pending' | 'planned'
  category: 'ai' | 'database' | 'scraping' | 'analytics'
}

const testFeatures: TestFeature[] = [
  {
    id: 'ai-chat',
    title: 'AI Chat (Persistent)',
    description: 'Test OpenAI chat functionality with streaming support and database storage',
    icon: <MessageSquare className="h-6 w-6" />,
    href: '/tests/ai-chat',
    status: 'implemented',
    category: 'ai'
  },
  {
    id: 'quick-chat',
    title: 'Quick Chat (Stateless)',
    description: 'Test direct AI responses without database persistence - perfect for APIs',
    icon: <Zap className="h-6 w-6" />,
    href: '/tests/quick-chat',
    status: 'implemented',
    category: 'ai'
  },
  {
    id: 'database',
    title: 'Database Management',
    description: 'Browse database tables, view data, and manage database schema',
    icon: <Database className="h-6 w-6" />,
    href: '/database',
    status: 'implemented',
    category: 'database'
  },
  {
    id: 'web-scraping',
    title: 'Web Scraping & Embedding',
    description: 'Test website crawling, content chunking, and vector embeddings',
    icon: <Globe className="h-6 w-6" />,
    href: '/tests/scraping',
    status: 'implemented',
    category: 'scraping'
  },
  {
    id: 'rag-chat',
    title: 'RAG Chat System',
    description: 'Test Retrieval-Augmented Generation with vector context',
    icon: <Brain className="h-6 w-6" />,
    href: '/tests/rag-chat',
    status: 'pending',
    category: 'ai'
  }
]

const configurationFeatures = [
  {
    id: 'env-config',
    title: 'Environment Configuration',
    description: 'Manage API keys, database connections, and service settings',
    icon: <Settings className="h-6 w-6" />,
    href: '/config/environment',
    status: 'planned' as const
  },
  {
    id: 'monitoring',
    title: 'Usage Monitoring',
    description: 'View API usage, costs, performance metrics, and analytics',
    icon: <BarChart3 className="h-6 w-6" />,
    href: '/monitoring',
    status: 'planned' as const
  }
]

function FeatureCard({ feature }: { feature: TestFeature | typeof configurationFeatures[0] }) {
  const isImplemented = feature.status === 'implemented'
  
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${
            isImplemented 
              ? 'text-green-600' 
              : feature.status === 'pending' 
                ? 'text-yellow-600' 
                : 'text-gray-400'
          }`}>
            {feature.icon}
          </div>
          <div className="ml-4 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {feature.title}
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                feature.status === 'implemented' 
                  ? 'bg-green-100 text-green-800'
                  : feature.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
              }`}>
                {feature.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {feature.description}
            </p>
          </div>
        </div>
        <div className="mt-6">
          {isImplemented ? (
            <Link
              href={feature.href}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test Feature
            </Link>
          ) : (
            <button
              disabled
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-gray-100 cursor-not-allowed"
            >
              <Zap className="h-4 w-4 mr-2" />
              Coming Soon
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminHomePage() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg">
        <div className="px-6 py-8 text-white">
          <h1 className="text-3xl font-bold mb-2">
            Welcome to AI Framework Admin
          </h1>
          <p className="text-blue-100 text-lg">
            Test and configure your AI-powered applications with comprehensive tools and interfaces.
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              Real-time testing capabilities
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              Configuration management
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              Performance monitoring
            </div>
          </div>
        </div>
      </div>

      {/* Feature Testing Section */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Feature Testing
          </h2>
          <p className="text-gray-600">
            Test individual AI Framework features with interactive interfaces.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testFeatures.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      </div>

      {/* Configuration & Monitoring Section */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Configuration & Monitoring
          </h2>
          <p className="text-gray-600">
            Manage settings and monitor your AI Framework deployment.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {configurationFeatures.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Stats</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">4</div>
              <div className="text-sm text-gray-500">Total Features</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">3</div>
              <div className="text-sm text-gray-500">Implemented</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">2</div>
              <div className="text-sm text-gray-500">In Development</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">v1.0</div>
              <div className="text-sm text-gray-500">Framework Version</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
