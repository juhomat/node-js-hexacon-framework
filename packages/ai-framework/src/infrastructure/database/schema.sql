-- Database Schema for AI Framework Chat Feature

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    model VARCHAR(100) NOT NULL DEFAULT 'gpt-5',
    system_prompt TEXT,
    total_tokens INTEGER DEFAULT 0,
    total_cost DECIMAL(10,6) DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(255) PRIMARY KEY,
    chat_id VARCHAR(255) NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model VARCHAR(100),
    token_count INTEGER DEFAULT 0,
    processing_time_ms INTEGER DEFAULT 0,
    cost DECIMAL(10,6) DEFAULT 0,
    finish_reason VARCHAR(50),
    usage_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_active ON chats(is_active);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

-- Function to update chat's last_message_at and updated_at
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chats 
    SET 
        last_message_at = NEW.created_at,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.chat_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update chat timestamps when messages are added
DROP TRIGGER IF EXISTS trigger_update_chat_last_message ON messages;
CREATE TRIGGER trigger_update_chat_last_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_last_message();

-- Function to update chat message count
CREATE OR REPLACE FUNCTION update_chat_message_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE chats 
        SET message_count = message_count + 1
        WHERE id = NEW.chat_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE chats 
        SET message_count = message_count - 1
        WHERE id = OLD.chat_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for message count
DROP TRIGGER IF EXISTS trigger_inc_message_count ON messages;
CREATE TRIGGER trigger_inc_message_count
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_message_count();

DROP TRIGGER IF EXISTS trigger_dec_message_count ON messages;
CREATE TRIGGER trigger_dec_message_count
    AFTER DELETE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_message_count();

-- Sample data for testing (optional)
-- INSERT INTO chats (id, user_id, title, model) VALUES 
-- ('chat_sample_1', 'user_123', 'Test Chat', 'gpt-4o');

-- INSERT INTO messages (id, chat_id, role, content) VALUES 
-- ('msg_sample_1', 'chat_sample_1', 'user', 'Hello, how are you?'),
-- ('msg_sample_2', 'chat_sample_1', 'assistant', 'I am doing well, thank you for asking! How can I help you today?');
