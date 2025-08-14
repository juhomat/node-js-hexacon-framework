# 🧱 AI Web App Framework with Node.js, Next.js & PostgreSQL

> Modular, reusable Node.js framework using hexagonal architecture for rapid development of AI-powered web applications.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🎯 Goal

Develop a modular, reusable Node.js framework using hexagonal architecture (ports and adapters) to enable rapid development of multiple AI-powered web applications.

## 🚀 Quick Demo

**Try it now**: Clone the repo, install dependencies, set your OpenAI API key, and run the admin interface to test AI chat and database management features immediately!

## 🧠 Key Features

- ✅ **AI Chat (Persistent)** - OpenAI-powered chat with database storage and streaming
- ✅ **AI Chat (Stateless)** - Direct OpenAI responses without persistence
- ✅ **Database Management** - Browse tables, view data, delete tables/rows
- ✅ **Admin Interface** - Comprehensive web UI for testing and management
- 🚧 **AI Image Generation** - Prompt-to-image using DALL·E (planned)
- 🚧 **AI RAG Chat** - Retrieval-Augmented Generation pipeline (planned)
- 🚧 **Web Scraping + Embedding** - Content extraction and vector embeddings (planned)
- 🚧 **User Authentication** - Firebase Auth integration (planned)
- 🚧 **Stripe Payments** - Payment processing (planned)
- ✅ **PostgreSQL Integration** - Full database support with pgvector
- ✅ **Modular Adapter System** - Hexagonal architecture with swappable adapters

## 🏗️ Architecture

### Hexagonal Framework Structure

```
node-js-hexacon-framework/
├── packages/ai-framework/          # Core framework (hexagonal architecture)
│   ├── src/
│   │   ├── domain/                 # Core business logic
│   │   ├── application/            # Application services
│   │   ├── infrastructure/         # External adapters
│   │   ├── presentation/           # API controllers
│   │   └── shared/                 # Common utilities
│   └── docs/                       # Framework documentation
├── admin_application/              # Admin web interface (Next.js)
│   ├── src/app/                   # Next.js 14 app directory
│   │   ├── api/                   # API routes for admin features
│   │   ├── database/              # Database management interface
│   │   └── tests/                 # Feature testing interfaces
│   └── src/components/            # Reusable UI components
└── application/                    # Backend application layer
    ├── server/                     # Main Express server
    ├── api/                        # API routes
    ├── middleware/                 # Express middleware
    └── routes/                     # Route definitions
```

### Core Principles

- **Domain Layer**: Clean, testable business logic independent of infrastructure
- **Infrastructure Adapters**: External services (OpenAI, Stripe, Postgres) implemented via adapters
- **Modular Design**: Projects wire their own adapters and frontend, reusing framework logic
- **Admin Interface**: Every project includes management and testing capabilities

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL database with pgvector extension (for vector embeddings)
- OpenAI API key (required for AI features)
- Optional: Firebase and Stripe API keys (for future authentication and payment features)

### Installation

```bash
# Clone the repository
git clone https://github.com/juhomat/node-js-hexacon-framework.git
cd node-js-hexacon-framework

# Install root dependencies
npm install

# Install framework dependencies
cd packages/ai-framework
npm install

# Install admin interface dependencies
cd ../../admin_application
npm install
```

### Database Setup

```bash
# Create PostgreSQL database
createdb ai_framework_db

# Install pgvector extension (if needed)
psql ai_framework_db -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Run the schema setup
psql ai_framework_db -f packages/ai-framework/src/infrastructure/database/schema.sql
```

### Development

```bash
# Build the framework
cd packages/ai-framework
npm run build

# Start the admin interface
cd ../../admin_application
npm run dev
# Access at http://localhost:3003

# Optional: Start the backend application server
cd ../application
npm run dev
# Access at http://localhost:3000
```

## 🛠 Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | Node.js (Express) |
| **Frontend** | Next.js (React) |
| **Database** | PostgreSQL + pgvector |
| **AI Services** | OpenAI (GPT, DALL-E, Embeddings) |
| **Authentication** | Firebase Auth |
| **Payments** | Stripe |
| **Scraping** | Cheerio, Puppeteer |
| **Language** | TypeScript |
| **Testing** | Jest |
| **Code Quality** | ESLint, Prettier |

## 📊 Admin Interface

The admin interface runs at `http://localhost:3003` and provides comprehensive management tools:

### ✅ **Currently Available Features**

#### 🤖 **AI Chat Testing**
- **Persistent Chat** (`/tests/ai-chat`) - Full chat sessions with database storage
- **Quick Chat** (`/tests/quick-chat`) - Stateless AI responses for API testing
- Real-time streaming support
- Model selection (GPT-4o, GPT-4o-mini, GPT-3.5-turbo)
- Configuration panel with temperature, tokens, and other parameters
- Token usage and cost tracking
- Response time monitoring

#### 🗄️ **Database Management** (`/database`)
- **Table Browser** - View all database tables and schemas
- **Data Viewer** - Browse table contents with pagination
- **Delete Operations** - Remove tables and individual rows with confirmation
- **Schema Information** - Column types, primary keys, constraints
- **Search & Filter** - Find tables by name or schema
- **Smart Data Formatting** - Type-aware display of dates, numbers, booleans

#### 📊 **Dashboard Overview**
- Feature status tracking
- Quick statistics
- Navigation to all tools
- Real-time system status

### 🚧 **Planned Features**
- Configuration management for environment variables
- Usage monitoring and analytics
- RAG pipeline testing interface
- Image generation testing
- User authentication management
- API documentation interface

## 🔄 Implementation Status

### ✅ **Completed**
- **Core Framework**: Hexagonal architecture foundation with TypeScript
- **Domain Layer**: Chat entities, repositories, and use cases
- **Infrastructure**: OpenAI adapter, PostgreSQL repositories
- **Application Services**: Chat and stateless chat applications
- **Admin Interface**: Next.js-based management interface
- **AI Chat Features**: Both persistent and stateless chat implementations
- **Database Management**: Full CRUD operations with admin UI
- **API Integration**: RESTful endpoints for all features

### 🚧 **In Progress**
- Advanced admin configuration tools
- Enhanced monitoring and analytics
- RAG pipeline implementation

### 📋 **Planned**
- Image generation with DALL·E
- Web scraping and embedding pipeline
- User authentication with Firebase
- Payment processing with Stripe
- Advanced admin tools and dashboards

## 🔧 Configuration

Create a `.env.local` file in the `admin_application` directory:

```env
# Required: OpenAI API Key
OPENAI_API_KEY=your_openai_api_key

# Required: Database Connection
DATABASE_URL=postgresql://username:password@localhost:5432/ai_framework_db

# Optional: Future features
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Server Configuration
NODE_ENV=development
```

**Note**: The admin interface currently uses OpenAI and PostgreSQL. Other services will be integrated in future releases.

## 📚 Documentation

- [📖 Framework Documentation](packages/ai-framework/README.md)
- [🖥️ Admin Interface Plan](packages/ai-framework/docs/admin-interface-plan.md)
- [⚙️ Environment Setup](packages/ai-framework/docs/environment-setup.md)
- [🏗️ Implementation Plan](IMPLEMENTATION_PLAN.md)
- [🚀 Application Layer](application/README.md)

## 🧪 Testing

```bash
# Test the framework
cd packages/ai-framework
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Project Vision

**One-liner**: A Node.js hexagonal framework for reusable AI apps with RAG, chat, image generation, scraping, and more — projects are independent codebases using the framework as a unified foundation, ensuring easy development without complex package management overhead.

---

Built with ❤️ for the AI development community
