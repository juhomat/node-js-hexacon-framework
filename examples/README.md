# 🧪 AI Framework Examples

Simple standalone examples to test the AI Framework functionality.

## 🚀 Quick Setup

1. **Install dependencies:**
   ```bash
   cd examples
   npm install
   ```

2. **Set up environment:**
   ```bash
   # Copy the example and add your API key
   cp env.example .env
   # Edit .env and add your OPENAI_API_KEY
   ```

3. **Run tests:**
   ```bash
   # Test stateless mode (no database needed)
   npm run test-stateless
   
   # Test persistent mode (database required)
   npm run test-persistent
   
   # Test both modes
   npm run test-both
   ```

## 📋 Available Tests

### `npm run test-stateless`
- ✅ **No database required**
- Tests direct OpenAI API calls
- Tests conversation with manual context
- Perfect for debugging framework issues

### `npm run test-persistent` 
- 🗄️ **Database required**
- Tests chat sessions and message history
- Tests automatic context management
- Requires PostgreSQL setup

### `npm run test-both`
- 🔄 **Compares both modes**
- Shows the differences between stateful/stateless
- Great for understanding when to use each

### `npm run test-discovery`
- 🔍 **Website discovery and prioritization**
- Tests intelligent page discovery (sitemap + crawling)
- Stores discovered pages in database for content extraction
- Runs 3 built-in test scenarios (GitHub, OpenAI, MDN)

### `npm run test-custom`
- 🎯 **Custom website testing**
- Test discovery with your own website and parameters
- Command line arguments work properly with this script

**Custom Parameters:**
```bash
# Test your specific website (required --website parameter)
npm run test-custom -- --website https://docs.openai.com --pages 20 --depth 2

# Quick test with short options
npm run test-custom -- -w https://example.com -p 5 -d 1

# Show help for all options
npm run test-custom -- --help

# Direct usage (no npm wrapper issues)
npx tsx test-custom-discovery.ts --website https://fastapi.tiangolo.com --pages 15
```

### `npm run test-manual-page`
- ➕ **Manual page addition**
- Add specific high-value pages to websites for content extraction
- Perfect for pages not discoverable through crawling
- Useful for password-protected content, specific documentation, etc.

**Manual Page Parameters:**
```bash
# Add OpenAI API reference page
npm run test-manual-page -- \
  --website https://docs.openai.com \
  --page https://docs.openai.com/api-reference/chat \
  --title "OpenAI Chat API Reference"

# Add with custom priority
npm run test-manual-page -- \
  -w https://example.com \
  -p https://example.com/important-page \
  --priority 95

# Show help for all options
npm run test-manual-page -- --help

# Direct usage
npx tsx test-manual-page-addition.ts --website https://github.com --page https://github.com/features/actions
```

**Use Cases for Manual Pages:**
- 🔒 **Password-protected content** you have access to
- 📚 **Specific documentation** not in sitemap  
- 🎯 **High-value pages** you want to prioritize
- 📄 **External resources** that should be part of knowledge base
- 🚀 **Product pages** or key landing pages

### `npm run test-content-extraction`
- 🔍 **Content extraction and analysis**
- Extract main content from HTML pages (removes navigation, headers, footers)
- Test extraction quality and analyze content structure
- Works with discovered pages or standalone URLs

**Content Extraction Parameters:**
```bash
# Extract content from a specific URL (standalone)
npm run test-content-extraction -- --url https://docs.openai.com/api-reference

# Extract content for pages in a crawl session (batch)
npm run test-content-extraction -- --session <session-id> --limit 5 --update-db

# Extract content for specific page ID
npm run test-content-extraction -- --page-id <page-uuid> --update-db --verbose

# Show detailed analysis
npm run test-content-extraction -- --url https://example.com --verbose

# Show help for all options
npm run test-content-extraction -- --help
```

**Content Extraction Features:**
- 🧠 **Smart content detection** using semantic HTML and patterns
- 📊 **Quality scoring** (0-100) based on extraction method and content
- 🔍 **Multiple extraction strategies** (semantic → pattern-based → aggressive)
- 📝 **Rich metadata** extraction (title, author, language, headings)
- 💾 **Database integration** updates pages with extracted content
- ⚡ **Batch processing** with concurrency control

### 🌐 **API Endpoints Tests**

#### `npm run test-api`
Tests the complete end-to-end pipeline API endpoints for production-ready crawling.

**Usage:**
```bash
# Test full website crawling pipeline
npm run test-api -- --endpoint full-crawl --url https://example.com --max-pages 5

# Test manual page addition pipeline  
npm run test-api -- --endpoint add-page --website https://docs.openai.com --page https://docs.openai.com/api-reference/chat

# Test streaming crawling with real-time progress
npm run test-api -- --endpoint stream --url https://example.com --max-pages 3

# Get API endpoint documentation
npm run test-api -- --endpoint info
```

**Parameters:**
- `--endpoint`: API endpoint to test (`full-crawl`, `add-page`, `stream`, `info`)
- `--url`: Website URL for full crawling
- `--website`: Website URL for page addition
- `--page`: Specific page URL to add
- `--max-pages`: Maximum pages to crawl (default: 5)
- `--max-depth`: Maximum crawling depth (default: 1)
- `--priority`: Page priority 0-100 (default: 80, for add-page)

**API Endpoints:**
- **`/api/crawling/full-crawl`**: Complete website crawling → content extraction → chunking → embeddings
- **`/api/crawling/add-page`**: Manual page addition → content extraction → chunking → embeddings  
- **`/api/crawling/full-crawl-stream`**: Streaming version with real-time progress updates

**Features:**
- 🌐 **Complete Pipeline**: URL → discovery → extraction → chunking → embeddings → database
- 📊 **Real-time Progress**: Server-Sent Events for live updates
- 💾 **Database Storage**: PostgreSQL with vector embeddings
- 🔢 **Smart Chunking**: 300-400 tokens with 15-20% overlap
- 🧠 **OpenAI Embeddings**: 1536D vectors ready for RAG
- 📈 **Quality Metrics**: Detailed analysis and cost estimation

**Prerequisites:**
- Admin application running: `cd admin_application && npm run dev`
- Database with crawling schema
- OPENAI_API_KEY configured

## 🔧 Troubleshooting

### "OPENAI_API_KEY not found"
- Create `.env` file in examples folder
- Add: `OPENAI_API_KEY=your_actual_api_key`

### "max_completion_tokens error"
- Framework needs to be rebuilt
- Run: `cd ../packages/ai-framework && npm run build`

### "Model not supported"
- Try changing model from 'gpt-5' to 'gpt-4o'
- Edit the test file and change the model

### Database connection errors
- Only affects persistent tests
- Stateless tests will work without database
- Check DATABASE_URL in .env file

## 📊 Expected Output

Successful test run should show:
- ✅ API calls working
- 🤖 Real AI responses
- 📈 Token usage and costs
- ⚡ Response times
- 🎉 "Framework Status: ✅ WORKING"

## 🎯 What This Tests

- **Framework Integration** - All components working together
- **OpenAI API** - Real API calls with proper parameters
- **Error Handling** - Graceful failure and helpful messages
- **Performance** - Response times and token efficiency
- **Both Modes** - Stateless vs persistent functionality

If these examples work, the framework is solid! 🚀
