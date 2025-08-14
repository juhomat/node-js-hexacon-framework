# AI Framework Admin Interface

A Next.js-based web interface for configuring and testing AI Framework components. This admin panel is included with every AI Framework project and provides a unified interface for:

## Features

### 🔧 Configuration Management
- Environment variable management
- Service adapter configuration (OpenAI, Firebase, Stripe)
- Database connection setup and testing
- API key validation and secure storage

### 🧪 Component Testing
- Interactive AI chat playground
- Image generation testing interface
- RAG pipeline testing and debugging
- Vector search and similarity testing
- Database query testing

### 📊 Monitoring & Analytics
- Usage statistics and cost tracking
- API call monitoring and error rates
- Performance metrics and health checks
- Service availability status

### 🛠 Development Tools
- Interactive API documentation
- Data import/export utilities
- Database schema visualization
- Component playground for integration testing

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The admin interface will be available at `http://localhost:3001` during development.

## Integration

The admin interface is designed to integrate seamlessly with the AI Framework:

1. **Authentication**: Uses the framework's built-in auth system
2. **API Integration**: Direct communication with framework services
3. **Configuration**: Reads from and writes to framework configuration
4. **Security**: Role-based access control and secure credential handling

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **Data Fetching**: TanStack Query
- **Charts**: Recharts
- **Code Editor**: Monaco Editor
- **Icons**: Lucide React

## Development

The admin interface follows Next.js best practices:

- Server and client components appropriately used
- Type-safe API routes and data fetching
- Responsive design for desktop and mobile
- Optimized performance and SEO
- Comprehensive error handling

This admin interface ensures every AI Framework project has powerful management and testing capabilities out of the box.
