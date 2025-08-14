# 🚀 Live AI Chat Setup Instructions

## ✅ **What's Now Connected**

The admin interface at `/tests/ai-chat` is now **fully connected** to the real AI Framework backend with:

- ✅ **Real OpenAI API calls** (GPT-5 by default)
- ✅ **PostgreSQL database storage**
- ✅ **Streaming responses**
- ✅ **Token usage tracking**
- ✅ **Cost calculation**
- ✅ **Session persistence**

## 🔧 **Setup Requirements**

### 1. **Environment Variables**

Create a `.env.local` file in the admin directory:

```bash
# In /application/admin/.env.local
OPENAI_API_KEY=your_actual_openai_api_key_here
DATABASE_URL=postgresql://username:password@localhost:5432/ai_framework_db
```

### 2. **Database Setup**

```bash
# Create PostgreSQL database
createdb ai_framework_db

# Run schema setup
psql ai_framework_db -f ../../packages/ai-framework/src/infrastructure/database/schema.sql
```

### 3. **Start the Application**

```bash
# From /application/admin/
npm run dev
```

## 🎯 **What Works Now**

### **Live Chat Interface** 
- Visit: `http://localhost:3000/tests/ai-chat`
- **Real AI responses** from OpenAI GPT-5
- **Streaming responses** in real-time
- **Model selection** (GPT-5, GPT-4o, GPT-4o-mini, GPT-3.5-turbo)
- **Configuration panel** (temperature, tokens, etc.)

### **Database Persistence**
- **Session recovery** - close browser, come back, continue chat
- **Message history** stored in PostgreSQL
- **Token usage** and **cost tracking**
- **Multiple chat sessions**

### **Framework Integration**
- **Hexagonal architecture** - clean separation
- **Real OpenAI Adapter** - production-ready
- **PostgreSQL repositories** - full CRUD operations
- **Error handling** and **retry logic**

## 📋 **API Endpoints Available**

- `POST /api/chat/create` - Create new chat
- `POST /api/chat/send` - Send message (non-streaming)
- `POST /api/chat/stream` - Send message (streaming)
- `GET /api/chat/history` - Get chat history

## 🎛️ **Configuration Options**

Users can now adjust:
- **Model**: GPT-5, GPT-4o, GPT-4o-mini, GPT-3.5-turbo
- **Temperature**: 0.0 (precise) to 2.0 (creative)
- **Max Tokens**: Response length limit
- **Streaming**: Real-time vs complete responses
- **Advanced**: Top P, frequency penalty, presence penalty

## ⚡ **Performance Features**

- **Connection pooling** for database efficiency
- **Streaming responses** for better UX
- **Error recovery** and **retry logic**
- **Token optimization** and **cost tracking**
- **Session management** across page refreshes

## 🧪 **Test Scenarios**

Try these in the interface:

1. **Basic Chat**: "Hello, how are you?"
2. **Code Help**: "Explain async/await in TypeScript"
3. **Creative Writing**: "Write a short poem about AI"
4. **Long Form**: "Explain quantum computing in detail"
5. **Streaming Test**: Watch responses appear in real-time

## 🚨 **Troubleshooting**

### **"Failed to create chat session"**
- Check `OPENAI_API_KEY` in `.env.local`
- Verify database connection
- Check database schema is loaded

### **"No response from AI"**
- Verify OpenAI API key is valid
- Check API usage limits
- Look at browser console for errors

### **Database connection issues**
- Ensure PostgreSQL is running
- Check `DATABASE_URL` format
- Verify database exists and schema is loaded

## 🎉 **Success!**

The AI chat is now **fully functional** with real OpenAI responses, database persistence, and streaming capabilities! 

**Next**: Try different models, configurations, and watch the real token usage and costs in the interface.
