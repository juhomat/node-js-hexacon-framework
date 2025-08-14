# AI Framework

A modular, reusable Node.js framework using hexagonal architecture (ports and adapters) for rapid development of AI-powered web applications.

## Features

- 🤖 **AI Chat & Image Generation** - OpenAI integration for chat and DALL-E image generation
- 🧠 **RAG (Retrieval-Augmented Generation)** - Full pipeline for document processing and intelligent retrieval
- 🕷️ **Web Scraping & Embedding** - Automated content extraction, chunking, and vector embedding
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

# Run schema setup
psql ai_framework_db -f src/infrastructure/database/schema.sql
```

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

This framework is designed to be integrated into projects using Git subtree:

### Adding to a Project

```bash
git subtree add --prefix=packages/ai-framework https://github.com/your-org/ai-framework main --squash
```

### Updating Framework

```bash
git subtree pull --prefix=packages/ai-framework https://github.com/your-org/ai-framework main --squash
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
```

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
