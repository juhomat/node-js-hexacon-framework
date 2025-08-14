# AI Framework Admin Interface

A Next.js-based administration interface for testing and configuring the AI Framework features.

**Location**: `/admin_application` (moved from `/application/admin`)

## 🚀 Quick Start

```bash
# Navigate to admin application
cd admin_application

# Install dependencies
npm install

# Start development server
npm run dev

# Visit http://localhost:3003 to access the admin interface
```

## 📋 Available Features

### ✅ **AI Chat Testing** (`/tests/ai-chat`)
- **Persistent Chat** - Full chat sessions with database storage
- **Chat History** - Browse and reload previous conversations
- Model selection (GPT-4o, GPT-4o-mini, GPT-3.5-turbo)
- Configuration panel with temperature, max tokens, and other parameters
- Real-time streaming and non-streaming modes
- Token usage and cost tracking
- Response time monitoring

### ✅ **Quick Chat Testing** (`/tests/quick-chat`)
- **Stateless Chat** - Direct AI responses without database persistence
- Perfect for testing API integrations
- Both streaming and non-streaming modes
- Immediate responses with usage statistics

### ✅ **Database Management** (`/database`)
- **Table Browser** - View all database tables and schemas
- **Data Viewer** - Browse table contents with pagination
- **Delete Operations** - Remove tables and individual rows safely
- **Schema Information** - Column types, primary keys, constraints
- **Search & Filter** - Find tables by name or schema
- **Smart Formatting** - Type-aware display of different data types

### 🔜 **Coming Soon**
- Web Scraping & Embedding Testing  
- RAG Chat System Testing
- Environment Configuration Management
- Usage Monitoring & Analytics Dashboard

## 🎯 Current Status

The admin interface is **fully functional** with:

- ✅ **Complete AI Integration**: Real OpenAI API integration with GPT models
- ✅ **Database Operations**: Full PostgreSQL integration with CRUD operations
- ✅ **Production Ready**: Complete Next.js interface with TypeScript
- ✅ **Real-time Features**: Streaming chat, live data updates, pagination
- ✅ **Professional UI**: Modern Tailwind CSS design with responsive layout

## 🔧 Setup Requirements

To run the admin interface:

1. **OpenAI API Key**: Set `OPENAI_API_KEY` in `.env.local`
2. **Database**: Set `DATABASE_URL` for PostgreSQL connection
3. **Framework Build**: Run `npm run build` in `packages/ai-framework/`

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