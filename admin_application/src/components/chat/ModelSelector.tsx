'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface Model {
  id: string
  name: string
  description: string
  inputCostPer1K: number
  outputCostPer1K: number
  maxTokens: number
}

const AVAILABLE_MODELS: Model[] = [
  {
    id: 'gpt-5',
    name: 'GPT-5',
    description: 'Latest and most advanced AI model',
    inputCostPer1K: 0.005,
    outputCostPer1K: 0.015,
    maxTokens: 200000
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Most advanced multimodal model',
    inputCostPer1K: 0.0025,
    outputCostPer1K: 0.01,
    maxTokens: 128000
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Affordable and intelligent small model',
    inputCostPer1K: 0.00015,
    outputCostPer1K: 0.0006,
    maxTokens: 128000
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Previous generation advanced model',
    inputCostPer1K: 0.01,
    outputCostPer1K: 0.03,
    maxTokens: 128000
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'Fast and affordable model',
    inputCostPer1K: 0.0005,
    outputCostPer1K: 0.0015,
    maxTokens: 16385
  }
]

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (model: string) => void
}

export function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const selectedModelInfo = AVAILABLE_MODELS.find(m => m.id === selectedModel)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between w-48 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <span>{selectedModelInfo?.name || selectedModel}</span>
        <ChevronDown className="w-4 h-4 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-80 mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="py-1">
            {AVAILABLE_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.id)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-100 ${
                  selectedModel === model.id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">{model.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {model.description}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Max tokens: {model.maxTokens.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-xs text-right text-gray-500 ml-4">
                    <div>${model.inputCostPer1K}/1K in</div>
                    <div>${model.outputCostPer1K}/1K out</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
