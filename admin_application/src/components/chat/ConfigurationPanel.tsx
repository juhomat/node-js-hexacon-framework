'use client'

import { Settings, Sliders } from 'lucide-react'

interface ChatConfiguration {
  model: string
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  stream: boolean
}

interface ConfigurationPanelProps {
  configuration: ChatConfiguration
  onChange: (config: ChatConfiguration) => void
}

export function ConfigurationPanel({ configuration, onChange }: ConfigurationPanelProps) {
  const updateConfig = (updates: Partial<ChatConfiguration>) => {
    onChange({ ...configuration, ...updates })
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          Model Configuration
        </h3>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Temperature */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Temperature: {configuration.temperature}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={configuration.temperature}
            onChange={(e) => updateConfig({ temperature: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Precise (0)</span>
            <span>Balanced (1)</span>
            <span>Creative (2)</span>
          </div>
        </div>

        {/* Max Tokens */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Tokens: {configuration.maxTokens}
          </label>
          <input
            type="range"
            min="100"
            max="4000"
            step="100"
            value={configuration.maxTokens}
            onChange={(e) => updateConfig({ maxTokens: parseInt(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>100</span>
            <span>2000</span>
            <span>4000</span>
          </div>
        </div>

        {/* Top P */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Top P: {configuration.topP}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={configuration.topP}
            onChange={(e) => updateConfig({ topP: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Frequency Penalty */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Frequency Penalty: {configuration.frequencyPenalty}
          </label>
          <input
            type="range"
            min="-2"
            max="2"
            step="0.1"
            value={configuration.frequencyPenalty}
            onChange={(e) => updateConfig({ frequencyPenalty: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Presence Penalty */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Presence Penalty: {configuration.presencePenalty}
          </label>
          <input
            type="range"
            min="-2"
            max="2"
            step="0.1"
            value={configuration.presencePenalty}
            onChange={(e) => updateConfig({ presencePenalty: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Streaming Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Enable Streaming
          </label>
          <button
            onClick={() => updateConfig({ stream: !configuration.stream })}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              configuration.stream ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                configuration.stream ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Reset Button */}
        <button
          onClick={() => updateConfig({
            temperature: 0.7,
            maxTokens: 2000,
            topP: 1,
            frequencyPenalty: 0,
            presencePenalty: 0,
            stream: true
          })}
          className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          <Sliders className="h-4 w-4 inline mr-2" />
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}
