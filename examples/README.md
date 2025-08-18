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
