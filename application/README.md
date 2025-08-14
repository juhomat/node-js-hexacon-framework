# AI Framework Application Layer

This directory contains the application layer that will be the final runnable application for each project using the AI Framework.

## Structure

```
application/
├── server/           # Main server application
├── api/             # API routes and controllers
├── middleware/      # Express middleware
├── routes/          # Route definitions
├── admin/           # Admin web interface (part of framework)
└── package.json     # Application dependencies
```

## Admin Interface

The `/admin` directory contains a web-based admin interface that is included with every AI Framework project. This interface provides:

### 🔧 Configuration Management
- Environment variable configuration
- Service adapter settings (OpenAI, Stripe, Firebase)
- Database connection management
- API key validation and testing

### 🧪 Component Testing
- AI service testing (chat, image generation, embeddings)
- RAG pipeline testing and debugging
- Database connection testing
- Payment flow testing
- Authentication flow testing

### 📊 Monitoring & Analytics
- Usage statistics and metrics
- Error logs and debugging
- Performance monitoring
- Cost tracking (API usage, tokens, etc.)

### 🛠 Development Tools
- Interactive API testing
- Schema migration tools
- Data import/export utilities
- Component playground for testing integrations

## Setup

### Environment Configuration

1. **Create Environment File**: Copy the example environment file to the project root:
   ```bash
   # From the project root directory (/Users/juhomattila/node-js-hexacon-framework/)
   cp application/env.example .env
   ```

2. **Configure API Keys**: Edit the `.env` file and add your actual API keys:
   - **OpenAI**: Get your API key from [platform.openai.com](https://platform.openai.com/)
   - **Firebase**: Download service account JSON from [console.firebase.google.com](https://console.firebase.google.com/)
   - **Stripe**: Get keys from [dashboard.stripe.com](https://dashboard.stripe.com/)
   - **Database**: Configure your PostgreSQL connection details

3. **Required Services Setup**:
   - **PostgreSQL with pgvector**: See [environment setup guide](../packages/ai-framework/docs/environment-setup.md)
   - **Firebase Project**: Create project and enable Authentication
   - **Stripe Account**: Set up for payment processing

### Database Setup

```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb ai_framework_db

# Connect and enable pgvector
psql ai_framework_db
CREATE EXTENSION vector;
```

## Usage

### Running the Application
```bash
# Start the main application
npm start

# Development mode
npm run dev

# Start admin interface in development
npm run admin:dev

# Build admin interface for production
npm run admin:build
```

### Integration with Projects

Each project using the AI Framework will:

1. Include this application layer as the main runnable server
2. Configure project-specific routes and middleware
3. Customize the admin interface with project-specific features
4. Add project-specific API endpoints

The admin interface remains consistent across all projects, providing a standardized way to manage and test AI Framework features.

## Technology Stack

- **Server**: Node.js with Express
- **Admin Interface**: Next.js (React-based)
- **Styling**: Tailwind CSS
- **State Management**: React Context/Zustand
- **API**: RESTful endpoints with OpenAPI documentation
- **Authentication**: Framework's built-in auth system
