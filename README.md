# 🧱 AI Web App Framework with Node.js, Next.js & PostgreSQL

> Modular, reusable Node.js framework using hexagonal architecture for rapid development of AI-powered web applications.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🎯 Goal

Develop a modular, reusable Node.js framework using hexagonal architecture (ports and adapters) to enable rapid development of multiple AI-powered web applications.

## 🧠 Key Features

- ✅ **AI Chat** - OpenAI-powered chat assistant (GPT models)
- ✅ **AI Image Generation** - Prompt-to-image using DALL·E
- ✅ **AI RAG Chat** - Retrieval-Augmented Generation pipeline
- ✅ **Web Scraping + Embedding** - Fetch, chunk, and embed content for RAG
- ✅ **User Authentication** - Firebase Auth (email & Google login)
- ✅ **Stripe Payments** - One-time and recurring billing
- ✅ **History Storage** - PostgreSQL + pgvector for logs and embeddings
- ✅ **Admin Interface** - Built-in web UI for configuration and testing
- ✅ **Modular Adapter System** - Easily extendable or replaceable services

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
└── application/                    # Final runnable application
    ├── server/                     # Main Express server
    ├── api/                        # API routes
    ├── middleware/                 # Express middleware
    ├── routes/                     # Route definitions
    └── admin/                      # Admin web interface (Next.js)
```

### Core Principles

- **Domain Layer**: Clean, testable business logic independent of infrastructure
- **Infrastructure Adapters**: External services (OpenAI, Stripe, Postgres) implemented via adapters
- **Modular Design**: Projects wire their own adapters and frontend, reusing framework logic
- **Admin Interface**: Every project includes management and testing capabilities

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL with pgvector extension
- API keys for: OpenAI, Firebase, Stripe

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

# Install application dependencies
cd ../../application
npm install

# Install admin interface dependencies
cd admin
npm install
```

### Development

```bash
# Build the framework
cd packages/ai-framework
npm run build

# Start the application server
cd ../../application
npm run dev

# Start the admin interface (separate terminal)
cd application/admin
npm run dev
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

Every project includes a comprehensive admin interface at `/admin`:

### 🔧 Configuration Management
- Environment variable editor
- Service adapter configuration
- Database connection testing
- API key management

### 🧪 Component Testing
- Interactive AI chat playground
- Image generation testing
- RAG pipeline debugging
- Vector search testing

### 📈 Monitoring & Analytics
- Usage statistics and cost tracking
- Performance metrics
- Error monitoring
- Service health status

### 🛠 Development Tools
- Interactive API documentation
- Data import/export utilities
- Database schema visualization
- Component playground

## 🔄 Implementation Phases

- [x] **Phase 1**: Core Framework Foundation
- [ ] **Phase 2**: Domain Layer & Entities
- [ ] **Phase 3**: Infrastructure Adapters
- [ ] **Phase 4**: Application Services
- [ ] **Phase 5**: Basic Application Layer
- [ ] **Phase 6**: Admin Interface Foundation
- [ ] **Phase 7**: Admin Configuration Management
- [ ] **Phase 8**: Admin Testing Interfaces
- [ ] **Phase 9**: Monitoring & Analytics
- [ ] **Phase 10**: Advanced Admin Tools
- [ ] **Phase 11**: Integration & Testing
- [ ] **Phase 12**: Documentation & Examples

## 🔧 Configuration

Create a `.env` file in your application root:

```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Firebase
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/dbname

# Server
PORT=3000
NODE_ENV=development
```

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
