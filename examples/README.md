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
