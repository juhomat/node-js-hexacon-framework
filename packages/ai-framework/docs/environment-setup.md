# Environment Setup

## Required Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Firebase private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/ai_framework_db

# Server Configuration
PORT=3000
NODE_ENV=development

# Vector Database Configuration
VECTOR_DIMENSION=1536
```

## Getting API Keys

### OpenAI
1. Visit [OpenAI API Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Generate a new API key

### Firebase
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Navigate to Project Settings > Service Accounts
4. Generate a new private key (downloads JSON file)
5. Extract the required fields from the JSON

### Stripe
1. Visit [Stripe Dashboard](https://dashboard.stripe.com/)
2. Create an account or sign in
3. Navigate to Developers > API Keys
4. Copy the Secret Key (starts with `sk_test_` for test mode)
5. For webhooks, create an endpoint and copy the signing secret

## Database Setup

### PostgreSQL with pgvector

```bash
# Install PostgreSQL (macOS with Homebrew)
brew install postgresql

# Start PostgreSQL service
brew services start postgresql

# Create database
createdb ai_framework_db

# Connect to database
psql ai_framework_db

# Install pgvector extension
CREATE EXTENSION vector;
```

### Docker Alternative

```bash
# Run PostgreSQL with pgvector
docker run -d \
  --name ai-framework-db \
  -e POSTGRES_DB=ai_framework_db \
  -e POSTGRES_USER=username \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```
