-- ========================================================================
-- BotFlow AI - Supabase PostgreSQL Schema
-- ========================================================================
-- This migration script creates the complete database schema for BotFlow AI,
-- including tables for users, chatbots, knowledge sources, conversations,
-- and messages, along with Row Level Security (RLS) policies and performance indexes.
-- ========================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------
-- 1. USERS / PROFILES TABLE
-- References auth.users if using Supabase Auth, or standalone profiles
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE, -- References auth.users(id) in Supabase Auth
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    organization_name TEXT,
    plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro', 'business', 'enterprise')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 2. CHATBOTS TABLE
-- Stores chatbot metadata, persona, mode, and styling
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chatbots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    domain TEXT,
    mode TEXT NOT NULL DEFAULT 'general' CHECK (mode IN ('general', 'knowledge')),
    system_prompt TEXT DEFAULT 'You are a helpful, professional, and knowledgeable business assistant.',
    tone TEXT DEFAULT 'friendly' CHECK (tone IN ('friendly', 'professional', 'empathetic', 'academic', 'casual', 'strict')),
    primary_color TEXT DEFAULT '#7c3aed',
    welcome_message TEXT DEFAULT 'Hello! How can I help you today?',
    fallback_message TEXT DEFAULT 'I am sorry, but I do not have sufficient information in my knowledge base to answer that. Please contact support.',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'training', 'paused')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 3. KNOWLEDGE SOURCES TABLE
-- Tracks uploaded PDFs, documents, text files, and website URLs
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'docx', 'url', 'text', 'csv')),
    source_url TEXT,
    file_size_bytes BIGINT DEFAULT 0,
    chunk_count INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
    raw_content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 4. CONVERSATIONS TABLE
-- Tracks visitor chat sessions per chatbot
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL, -- Unique client session identifier
    user_identifier TEXT DEFAULT 'Anonymous Visitor',
    sentiment TEXT DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'handed_over')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 5. MESSAGES TABLE
-- Individual messages inside a conversation
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'bot', 'system')),
    content TEXT NOT NULL,
    tokens_used INT DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 6. INDEXES FOR HIGH QUERY PERFORMANCE
-- ------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_chatbots_user_id ON public.chatbots(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbots_status ON public.chatbots(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_chatbot ON public.knowledge_sources(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_conversations_chatbot ON public.conversations(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON public.conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at ASC);

-- ------------------------------------------------------------------------
-- 7. AUTOMATIC TIMESTAMP TRIGGER
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_timestamp ON public.users;
CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS update_chatbots_timestamp ON public.chatbots;
CREATE TRIGGER update_chatbots_timestamp
    BEFORE UPDATE ON public.chatbots
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS update_conversations_timestamp ON public.conversations;
CREATE TRIGGER update_conversations_timestamp
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- ------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users: can select and update their own profile
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = auth_id);

-- Chatbots: users own their bots; active bots can be queried by public widget
CREATE POLICY "Users can manage their own chatbots"
    ON public.chatbots FOR ALL
    USING (auth.uid() = (SELECT auth_id FROM public.users WHERE users.id = chatbots.user_id));

CREATE POLICY "Public widget can view active chatbots"
    ON public.chatbots FOR SELECT
    USING (status = 'active');

-- Knowledge sources: owners manage their knowledge
CREATE POLICY "Users can manage knowledge sources for their chatbots"
    ON public.knowledge_sources FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.chatbots c
            JOIN public.users u ON u.id = c.user_id
            WHERE c.id = knowledge_sources.chatbot_id
            AND u.auth_id = auth.uid()
        )
    );

-- Conversations & Messages: owners can view all; visitors can insert & view session messages
CREATE POLICY "Users can view conversations of their chatbots"
    ON public.conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chatbots c
            JOIN public.users u ON u.id = c.user_id
            WHERE c.id = conversations.chatbot_id
            AND u.auth_id = auth.uid()
        )
    );

CREATE POLICY "Public can create conversation sessions"
    ON public.conversations FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Public can view and insert messages"
    ON public.messages FOR ALL
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------
-- 9. SEED DEFAULT SYSTEM CHATBOT FOR IMMEDIATE OUT-OF-THE-BOX USE
-- ------------------------------------------------------------------------
INSERT INTO public.chatbots (id, name, description, domain, mode, system_prompt, tone, primary_color, welcome_message)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'BotFlow AI Assistant',
    'Official BotFlow AI customer support and onboarding assistant',
    'botflow.ai',
    'general',
    'You are BotFlow AI assistant, an intelligent SaaS platform helper. Assist users with chatbot creation, uploading PDFs, embed code integration, and pricing questions. Maintain a helpful, courteous, and accurate tone.',
    'friendly',
    '#7c3aed',
    'Hello! 👋 I am the BotFlow AI assistant. Ask me anything about building chatbots, uploading docs, website integration, or pricing!'
) ON CONFLICT (id) DO NOTHING;
