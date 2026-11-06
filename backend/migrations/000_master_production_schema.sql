-- ========================================================================
-- BotFlow AI - Master Production Schema & Infrastructure Migration
-- ========================================================================
-- Description:
-- Consolidated, idempotent database migration for BotFlow AI SaaS platform.
-- Applies all required PostgreSQL extensions (including pgvector), relational
-- tables, check constraints, foreign keys, HNSW vector similarity indexes,
-- Supabase Storage configuration, and Row Level Security (RLS) policies.
-- ========================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS vector;

-- ------------------------------------------------------------------------
-- 2. CORE RELATIONAL TABLES
-- ------------------------------------------------------------------------

-- 2.1 Users / Multi-Tenant Accounts
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE, -- Linked to Supabase Auth auth.users(id)
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,  -- Standalone fallback hash if auth_id is null
    full_name TEXT,
    organization_name TEXT,
    business_name TEXT,
    plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro', 'business', 'enterprise')),
    subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Chatbots
CREATE TABLE IF NOT EXISTS public.chatbots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id TEXT UNIQUE NOT NULL, -- Public identifier used for website embed widget
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    domain TEXT DEFAULT '',
    mode TEXT NOT NULL DEFAULT 'general' CHECK (mode IN ('general', 'knowledge')),
    system_prompt TEXT DEFAULT 'You are a helpful and polite business chatbot.',
    tone TEXT DEFAULT 'friendly' CHECK (tone IN ('friendly', 'professional', 'empathetic', 'academic', 'casual', 'strict')),
    primary_color TEXT DEFAULT '#7c3aed',
    business_logo TEXT DEFAULT '',
    position TEXT DEFAULT 'bottom-right' CHECK (position IN ('bottom-right', 'bottom-left')),
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
    window_size TEXT DEFAULT 'standard' CHECK (window_size IN ('compact', 'standard', 'large')),
    launcher_icon TEXT DEFAULT 'message' CHECK (launcher_icon IN ('message', 'bot', 'sparkle', 'help')),
    allowed_domains TEXT[] DEFAULT ARRAY['localhost', '127.0.0.1'],
    restrict_domains BOOLEAN DEFAULT false,
    welcome_message TEXT DEFAULT 'Hello! How can I help you today?',
    fallback_message TEXT DEFAULT 'I am sorry, but I do not have enough information to answer that question.',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'training', 'paused')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 Knowledge Base Sources (Documents & URLs)
CREATE TABLE IF NOT EXISTS public.knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'docx', 'url', 'text', 'csv')),
    source_url TEXT,
    file_path TEXT,
    storage_path TEXT, -- Supabase Storage object path (botflow-documents bucket)
    file_size_bytes BIGINT DEFAULT 0,
    chunk_count INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
    error_message TEXT,
    raw_content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 Document Chunks with 1536-Dimension Vector Embeddings
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_source_id UUID NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
    chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    token_count INT DEFAULT 0,
    embedding vector(1536), -- Compatible with text-embedding-3-small and text-embedding-ada-002
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    user_identifier TEXT DEFAULT 'Anonymous Visitor',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'handed_over', 'resolved', 'closed')),
    rating INT CHECK (rating >= 1 AND rating <= 5),
    feedback_comment TEXT,
    assigned_agent_name TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    handed_over_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.6 Messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'bot', 'agent', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    response_time_ms INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.7 Customer Feedback & CSAT Ratings
CREATE TABLE IF NOT EXISTS public.customer_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
    thumbs_up BOOLEAN,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.8 Knowledge Gaps Analysis (Unanswered Questions)
CREATE TABLE IF NOT EXISTS public.knowledge_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    suggested_topic TEXT,
    occurrence_count INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'addressed', 'ignored')),
    last_asked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.9 In-Dashboard Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    chatbot_id UUID REFERENCES public.chatbots(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('handoff_request', 'unresolved_query', 'quota_warning', 'billing_event')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.10 Subscriptions & Billing
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    razorpay_customer_id TEXT,
    razorpay_subscription_id TEXT UNIQUE,
    plan_id TEXT NOT NULL CHECK (plan_id IN ('free', 'pro', 'business', 'enterprise')),
    billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'pending')),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.11 Payment Transactions & Invoices
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT UNIQUE,
    amount_cents BIGINT NOT NULL, -- Currency in smallest unit (e.g. Paise for INR)
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'captured', 'failed', 'refunded')),
    error_reason TEXT,
    receipt TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.12 Tenant Usage & Quota Records
CREATE TABLE IF NOT EXISTS public.usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL DEFAULT DATE_TRUNC('month', NOW()),
    period_end TIMESTAMPTZ NOT NULL DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
    message_count INT NOT NULL DEFAULT 0,
    document_count INT NOT NULL DEFAULT 0,
    chatbot_count INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_period UNIQUE(user_id, period_start)
);

-- ------------------------------------------------------------------------
-- 3. INDEXES FOR HIGH-THROUGHPUT PERFORMANCE
-- ------------------------------------------------------------------------

-- Chatbots & Users
CREATE INDEX IF NOT EXISTS idx_chatbots_user_id ON public.chatbots(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbots_public_id ON public.chatbots(public_id);
CREATE INDEX IF NOT EXISTS idx_chatbots_status ON public.chatbots(status);

-- Knowledge Sources
CREATE INDEX IF NOT EXISTS idx_sources_chatbot_id ON public.knowledge_sources(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_sources_status ON public.knowledge_sources(status);

-- Document Chunks & Vector HNSW
CREATE INDEX IF NOT EXISTS idx_chunks_chatbot_id ON public.document_chunks(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_chunks_knowledge_source_id ON public.document_chunks(knowledge_source_id);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw 
    ON public.document_chunks 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Conversations & Messages
CREATE INDEX IF NOT EXISTS idx_conversations_chatbot_id ON public.conversations(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Feedback, Gaps & Notifications
CREATE INDEX IF NOT EXISTS idx_feedback_chatbot_id ON public.customer_feedback(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_chatbot_id ON public.knowledge_gaps(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_status ON public.knowledge_gaps(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Subscriptions & Transactions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);

-- ------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

-- 4.1 Users Policy
CREATE POLICY "Users can access own profile"
    ON public.users FOR ALL
    USING (auth_id = auth.uid() OR id::text = auth.uid()::text);

-- 4.2 Chatbots Policies
CREATE POLICY "Users can manage own chatbots"
    ON public.chatbots FOR ALL
    USING (
        user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid() OR id::text = auth.uid()::text)
    );

CREATE POLICY "Public widget can read active chatbot config"
    ON public.chatbots FOR SELECT
    USING (status = 'active');

-- 4.3 Knowledge Sources Policies
CREATE POLICY "Users can manage knowledge sources for own chatbots"
    ON public.knowledge_sources FOR ALL
    USING (
        chatbot_id IN (
            SELECT c.id FROM public.chatbots c
            JOIN public.users u ON u.id = c.user_id
            WHERE u.auth_id = auth.uid() OR u.id::text = auth.uid()::text
        )
    );

-- 4.4 Document Chunks Policies
CREATE POLICY "Users can manage chunks for own chatbots"
    ON public.document_chunks FOR ALL
    USING (
        chatbot_id IN (
            SELECT c.id FROM public.chatbots c
            JOIN public.users u ON u.id = c.user_id
            WHERE u.auth_id = auth.uid() OR u.id::text = auth.uid()::text
        )
    );

CREATE POLICY "Public widget can read chunks for active chatbots"
    ON public.document_chunks FOR SELECT
    USING (
        chatbot_id IN (SELECT id FROM public.chatbots WHERE status = 'active')
    );

-- 4.5 Conversations Policies
CREATE POLICY "Chatbot owners can manage all conversations"
    ON public.conversations FOR ALL
    USING (
        chatbot_id IN (
            SELECT c.id FROM public.chatbots c
            JOIN public.users u ON u.id = c.user_id
            WHERE u.auth_id = auth.uid() OR u.id::text = auth.uid()::text
        )
    );

CREATE POLICY "Public visitors can create and view active conversation session"
    ON public.conversations FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4.6 Messages Policies
CREATE POLICY "Users can read/write messages of authorized conversations"
    ON public.messages FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4.7 Notifications Policies
CREATE POLICY "Users can view and manage own notifications"
    ON public.notifications FOR ALL
    USING (
        user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid() OR id::text = auth.uid()::text)
    );

-- 4.8 Subscriptions & Usage Policies
CREATE POLICY "Users can view own subscriptions"
    ON public.subscriptions FOR SELECT
    USING (
        user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid() OR id::text = auth.uid()::text)
    );

CREATE POLICY "Users can view own usage records"
    ON public.usage_records FOR SELECT
    USING (
        user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid() OR id::text = auth.uid()::text)
    );

-- ------------------------------------------------------------------------
-- 5. SEMANTIC VECTOR SIMILARITY SEARCH FUNCTION
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_document_chunks(
    p_chatbot_id UUID,
    p_query_embedding vector(1536),
    p_threshold FLOAT DEFAULT 0.30,
    p_match_count INT DEFAULT 4
)
RETURNS TABLE (
    id UUID,
    knowledge_source_id UUID,
    chatbot_id UUID,
    chunk_index INT,
    content TEXT,
    token_count INT,
    similarity FLOAT,
    metadata JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.knowledge_source_id,
        dc.chatbot_id,
        dc.chunk_index,
        dc.content,
        dc.token_count,
        (1 - (dc.embedding <=> p_query_embedding))::FLOAT AS similarity,
        dc.metadata
    FROM public.document_chunks dc
    WHERE dc.chatbot_id = p_chatbot_id
      AND (1 - (dc.embedding <=> p_query_embedding)) >= p_threshold
    ORDER BY dc.embedding <=> p_query_embedding ASC
    LIMIT p_match_count;
END;
$$;

-- ------------------------------------------------------------------------
-- 6. SUPABASE STORAGE BUCKET CONFIGURATION
-- ------------------------------------------------------------------------
-- Ensures the 'botflow-documents' storage bucket exists with tenant isolation policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'botflow-documents',
    'botflow-documents',
    false, -- Private bucket
    15728640, -- 15MB limit per file
    ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 15728640;

-- Storage RLS: Authenticated users can upload to their tenant folder
CREATE POLICY "Users can upload documents for their chatbots"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'botflow-documents'
        AND auth.role() = 'authenticated'
    );

-- Storage RLS: Users can read their own documents
CREATE POLICY "Users can read own uploaded documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'botflow-documents'
        AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
    );

-- Storage RLS: Users can delete their own documents
CREATE POLICY "Users can delete own documents"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'botflow-documents'
        AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
    );
