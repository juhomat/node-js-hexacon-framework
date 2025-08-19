# AI Framework

A modular, reusable Node.js framework using hexagonal architecture (ports and adapters) for rapid development of AI-powered web applications.

## Features

- 🤖 **AI Chat & Image Generation** - OpenAI integration for chat and DALL-E image generation
- 🧠 **RAG (Retrieval-Augmented Generation)** - ✅ Complete RAG system with vector search and source attribution
- 🕷️ **Web Scraping & Embedding** - ✅ Real-time website crawling with vector embeddings for RAG
- 🔐 **Authentication** - Firebase Auth with email and Google login support
- 💳 **Payments** - Stripe integration for one-time and recurring billing
- 📊 **History Logging** - PostgreSQL with pgvector for comprehensive activity tracking
- 🔧 **Modular Architecture** - Easily extendable and replaceable service adapters
- 🖥️ **Admin Interface** - Built-in web UI for configuration management and component testing

## Architecture

Built on **Hexagonal Architecture** principles:

- **Domain Layer**: Core business logic, entities, and use cases
- **Application Layer**: Application services and orchestration
- **Infrastructure Layer**: External service adapters (OpenAI, Stripe, Firebase, etc.)
- **Presentation Layer**: API controllers and framework interfaces

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL database
- OpenAI API key

### Installation

```bash
# Install dependencies
npm install

# Build the framework
npm run build

# Run tests
npm test
```

### Database Setup

```bash
# Create database
createdb ai_framework_db

# Install required extensions
psql ai_framework_db -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Setup complete schema (base + crawling)
cd packages/ai-framework
npm run setup-db

# Or setup individually:
# psql ai_framework_db -f src/infrastructure/database/schema.sql
# npm run setup-crawling-schema
```

> 📖 **For complete setup instructions, see [Complete Crawling Guide](docs/CRAWLING_COMPLETE_GUIDE.md)**

### Basic Usage

```typescript
import { Pool } from 'pg';
import { 
  OpenAIAdapter, 
  PostgreSQLChatRepository, 
  PostgreSQLMessageRepository,
  ChatApplication 
} from '@ai-framework/core';

// Initialize dependencies
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const openaiAdapter = new OpenAIAdapter(process.env.OPENAI_API_KEY, {
  defaultModel: 'gpt-4o'
});

const chatRepository = new PostgreSQLChatRepository(dbPool);
const messageRepository = new PostgreSQLMessageRepository(dbPool);

// Create application service
const chatApp = new ChatApplication(
  chatRepository,
  messageRepository,
  openaiAdapter
);

// Create a chat and send a message
async function example() {
  const { chat } = await chatApp.createChat({
    userId: 'user123',
    title: 'My Chat',
    model: 'gpt-4o'
  });

  const response = await chatApp.sendMessage({
    chatId: chat.id,
    userId: 'user123',
    content: 'Hello, AI!'
  });

  console.log(response.assistantMessage.content);
}
```

### Crawling & RAG Usage

```typescript
import { Pool } from 'pg';
import { 
  CrawlingPipelineApplication,
  RAGChatApplication,
  ChatApplication,
  RAGSearchService,
  PostgreSQLWebsiteRepository,
  PostgreSQLPageRepository,
  PostgreSQLCrawlSessionRepository,
  PostgreSQLChunkRepository,
  PostgreSQLChatRepository,
  PostgreSQLMessageRepository,
  PageDiscoveryService,
  HtmlFetcherService,
  ContentExtractionService,
  TextChunkingService,
  EmbeddingService,
  OpenAIAdapter
} from '@ai-framework/core';

// Initialize database and services
const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });

const crawlingPipeline = new CrawlingPipelineApplication(
  new PostgreSQLWebsiteRepository(dbPool),
  new PostgreSQLPageRepository(dbPool),
  new PostgreSQLCrawlSessionRepository(dbPool),
  new PostgreSQLChunkRepository(dbPool),
  new PageDiscoveryService(),
  new HtmlFetcherService(),
  new ContentExtractionService(),
  new TextChunkingService(),
  new EmbeddingService()
);

// Complete website crawling pipeline
async function crawlWebsite() {
  const result = await crawlingPipeline.executeFullCrawl({
    websiteUrl: 'https://docs.openai.com',
    maxPages: 10,    // Crawl up to 10 pages
    maxDepth: 2      // Go 2 levels deep
  });

  console.log(`✅ Processed ${result.summary.pagesProcessed} pages`);
  console.log(`📄 Created ${result.summary.chunksCreated} chunks`);
  console.log(`🧮 Generated ${result.summary.embeddingsGenerated} embeddings`);
  console.log(`💰 Cost: $${result.summary.totalCost.toFixed(4)}`);
}

// Add specific page manually
async function addPage() {
  const result = await crawlingPipeline.executeAddPage({
    websiteUrl: 'https://docs.openai.com',
    pageUrl: 'https://docs.openai.com/api-reference/chat',
    priority: 95
  });

  console.log(`📄 Added page with ${result.summary.chunksCreated} chunks`);
}

// RAG-enhanced chat with crawled content
async function ragChat() {
  // Initialize chat components
  const chatRepository = new PostgreSQLChatRepository(dbPool);
  const messageRepository = new PostgreSQLMessageRepository(dbPool);
  const chunkRepository = new PostgreSQLChunkRepository(dbPool);
  const openaiAdapter = new OpenAIAdapter(process.env.OPENAI_API_KEY!);
  const embeddingService = new EmbeddingService();
  
  // Initialize RAG chat application
  const chatApplication = new ChatApplication(chatRepository, messageRepository, openaiAdapter);
  const ragSearchService = new RAGSearchService(embeddingService, chunkRepository);
  const ragChat = new RAGChatApplication(chatApplication, ragSearchService);
  
  // Create chat and send RAG-enhanced message
  const chatResponse = await ragChat.createChat({
    userId: 'user-123',
    title: 'RAG Chat Session',
    model: 'gpt-4o'
  });
  
  const response = await ragChat.sendMessage({
    chatId: chatResponse.chat.id,
    userId: 'user-123',
    content: 'How do I use the OpenAI chat API?',
    useRAG: true,
    maxChunks: 5,
    minSimilarity: 0.7
  });
  
  console.log(`🤖 Response: ${response.assistantMessage.content}`);
  
  // Show sources used
  if (response.ragSources && response.ragSources.length > 0) {
    console.log('\n📚 Sources:');
    response.ragSources.forEach((source, index) => {
      console.log(`  ${index + 1}. ${source.pageTitle} (${(source.similarity * 100).toFixed(1)}%)`);
    });
  }
}
```

### Development Scripts

```bash
npm run build         # Build TypeScript to JavaScript
npm run build:watch   # Build in watch mode
npm run dev          # Development server with hot reload
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run lint         # Lint source code
npm run lint:fix     # Fix linting issues
npm run format       # Format code with Prettier
npm run clean        # Clean build artifacts
```

## Project Integration

### Integration Methods

**Option 1: Git Subtree (Recommended for Active Development)**
```bash
# Add framework to your project
git subtree add --prefix=packages/ai-framework https://github.com/your-org/ai-framework main --squash

# Update framework when needed
git subtree pull --prefix=packages/ai-framework https://github.com/your-org/ai-framework main --squash

# Build framework in your project
cd packages/ai-framework && npm install && npm run build
```

**Option 2: NPM Package (Production)**
```bash
# Install as dependency (if published to NPM)
npm install @your-org/ai-framework

# Or install from Git repository
npm install git+https://github.com/your-org/ai-framework.git
```

**Option 3: Local Development Copy**
```bash
# Copy framework to your project
cp -r /path/to/ai-framework packages/
cd packages/ai-framework && npm install && npm run build

# Install in your project
cd ../../ && npm install ./packages/ai-framework
```

### TypeScript Configuration

Add the framework to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "ai-framework": ["./packages/ai-framework/src"],
      "ai-framework/*": ["./packages/ai-framework/src/*"]
    }
  },
  "include": [
    "src/**/*",
    "packages/ai-framework/src/**/*"
  ]
}
```

### Package Dependencies

The framework includes these key dependencies:

```json
{
  "dependencies": {
    "openai": "^4.0.0",
    "pg": "^8.11.0", 
    "cheerio": "^1.0.0",
    "readability": "^0.4.0",
    "uuid": "^9.0.0"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  }
}
```

## Configuration

Create a `.env` file with the following variables:

```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Firebase
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Crawling (Optional)
CRAWLING_MAX_PAGES=10      # Default pages per crawl session
CRAWLING_MAX_DEPTH=1       # Default crawling depth
CRAWLING_DELAY_MS=1000     # Delay between requests
```

## ✅ Implementation Status

### Fully Implemented & Tested Features

| Feature | Status | Documentation | Tests | UI Demo |
|---------|--------|---------------|-------|---------|
| **Core Chat System** | ✅ Complete | [README](#basic-usage) | ✅ Pass | ✅ Available |
| **Web Crawling Pipeline** | ✅ Complete | [Crawling Guide](docs/CRAWLING_COMPLETE_GUIDE.md) | ✅ Pass | ✅ Available |
| **Content Extraction** | ✅ Complete | [API Reference](docs/API_REFERENCE.md) | ✅ Pass | ✅ Available |
| **Text Chunking & Embedding** | ✅ Complete | [Crawling Guide](docs/CRAWLING_COMPLETE_GUIDE.md) | ✅ Pass | ✅ Available |
| **RAG Chat System** | ✅ Complete | [API Reference](docs/API_REFERENCE.md) | ✅ Pass | ✅ Available |
| **Vector Search** | ✅ Complete | [Crawling Guide](docs/CRAWLING_COMPLETE_GUIDE.md) | ✅ Pass | ✅ Available |
| **Database Integration** | ✅ Complete | [Setup Scripts](#database-setup) | ✅ Pass | ✅ Available |
| **Admin Interface** | ✅ Complete | [Admin Guide](docs/CRAWLING_COMPLETE_GUIDE.md#admin-interface-integration) | ✅ Pass | ✅ Available |

### Verified Functionality

- ✅ **541 embedded chunks** in test database
- ✅ **Vector similarity search** with pgvector
- ✅ **RAG context retrieval** with source attribution  
- ✅ **Multi-website filtering** capability
- ✅ **Real-time progress tracking** for crawling
- ✅ **Cost tracking** and performance metrics
- ✅ **Complete admin UI** with working demos

## 📚 Documentation

### 🚀 Getting Started
- **[Developer Checklist](docs/DEVELOPER_CHECKLIST.md)** - 📋 **Complete integration checklist for new projects**
- **[Complete Crawling Guide](docs/CRAWLING_COMPLETE_GUIDE.md)** - 📖 **Main integration guide with examples**

### 📖 Reference Documentation  
- **[API Reference](docs/API_REFERENCE.md)** - Complete endpoint documentation including RAG
- **[Crawling & RAG System](docs/crawling-system.md)** - Technical architecture overview
- **[Environment Setup](docs/environment-setup.md)** - Detailed setup instructions
- **[Admin Interface Plan](docs/admin-interface-plan.md)** - Admin interface documentation

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **AI Services**: OpenAI (GPT, DALL-E, Embeddings)
- **Database**: PostgreSQL with pgvector
- **Authentication**: Firebase Auth
- **Payments**: Stripe
- **Web Scraping**: Cheerio, Puppeteer
- **Testing**: Jest
- **Code Quality**: ESLint, Prettier

## License

MIT
