# AI Framework Admin Interface

A Next.js-based administration interface for testing and configuring the AI Framework features.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Visit http://localhost:3001 to access the admin interface
```

## 📋 Available Features

### ✅ **AI Chat Testing** (`/tests/ai-chat`)
- Interactive chat interface with real AI responses
- Model selection (GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo)
- Configuration panel with temperature, max tokens, and other parameters
- Streaming and non-streaming modes
- Token usage and cost tracking
- Response time monitoring
- Quick test scenarios

### 🔜 **Coming Soon**
- Database Operations Testing
- Web Scraping & Embedding Testing  
- RAG Chat System Testing
- Environment Configuration
- Usage Monitoring & Analytics

## 🎯 Current Status

The admin interface is **functional for AI Chat testing** with:

- **Frontend**: Complete Next.js interface with Tailwind CSS
- **Mock Backend**: Simulated AI responses for testing UI
- **Real Integration**: Ready to connect to actual AI Framework backend

## 🔧 Integration with AI Framework

To connect with the real AI Framework backend:

1. **Add API Routes**: Create `/src/app/api/` endpoints that use the AI Framework
2. **Replace Mock Functions**: Update chat components to call real APIs
3. **Add Environment Setup**: Configure OpenAI API keys and database connections

## 📁 Project Structure

```
src/
├── app/                     # Next.js app directory
│   ├── page.tsx            # Admin homepage
│   ├── tests/ai-chat/      # AI chat testing interface
│   └── layout.tsx          # Root layout
├── components/
│   ├── chat/               # Chat-related components
│   │   ├── ChatInterface.tsx
│   │   ├── ModelSelector.tsx
│   │   ├── ConfigurationPanel.tsx
│   │   └── TokenUsageDisplay.tsx
│   └── ui/                 # Reusable UI components
└── lib/                    # Utility functions
```

## 🎨 Design Features

- **Modern UI**: Clean, professional interface with Tailwind CSS
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Theme Support**: Ready for theme switching
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Real-time Updates**: Live token usage and cost tracking

## 🛠 Development

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🔗 Navigation

- **Homepage**: Overview of all features and quick access
- **AI Chat Test**: `/tests/ai-chat` - Interactive chat testing
- **Future Features**: Database, Scraping, RAG testing interfaces

The admin interface provides a comprehensive testing environment for all AI Framework capabilities! 🚀