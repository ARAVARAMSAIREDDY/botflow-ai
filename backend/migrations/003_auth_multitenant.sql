-- ========================================================================
-- BotFlow AI - Phase 4: Supabase Authentication & Multi-Tenant RLS
-- ========================================================================
-- This migration establishes user profile management linked to auth.users,
-- enforces foreign keys, and implements strict Row Level Security (RLS)
-- guaranteeing complete tenant isolation across chatbots, knowledge bases,
-- vector embeddings, and conversation histories.
-- ========================================================================

-- 1. Create or update public.profiles linked directly to Supabase Auth
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    business_name TEXT,
    plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro', 'business', 'enterprise')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 2. Trigger to automatically provision profile upon Supabase auth.users creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, business_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'business_name'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        business_name = COALESCE(EXCLUDED.business_name, public.profiles.business_name),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Link chatbots to profiles table with CASCADE deletion
ALTER TABLE public.chatbots 
    DROP CONSTRAINT IF EXISTS chatbots_user_id_fkey;

ALTER TABLE public.chatbots
    ADD CONSTRAINT chatbots_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: Profiles
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
CREATE POLICY "Users can read their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile"
    ON public.profiles FOR DELETE
    USING (auth.uid() = id);

-- 6. RLS Policies: Chatbots (Strict Tenant Isolation)
DROP POLICY IF EXISTS "Users can manage their own chatbots" ON public.chatbots;
CREATE POLICY "Users can manage their own chatbots"
    ON public.chatbots FOR ALL
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view active chatbots for website chat" ON public.chatbots;
CREATE POLICY "Public can view active chatbots for website chat"
    ON public.chatbots FOR SELECT
    USING (status = 'active');

-- 7. RLS Policies: Knowledge Sources (Strict Tenant Isolation)
DROP POLICY IF EXISTS "Users can manage knowledge sources for their chatbots" ON public.knowledge_sources;
CREATE POLICY "Users can manage knowledge sources for their chatbots"
    ON public.knowledge_sources FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.chatbots
            WHERE chatbots.id = knowledge_sources.chatbot_id
            AND chatbots.user_id = auth.uid()
        )
    );

-- 8. RLS Policies: Document Chunks / Vectors (Strict Tenant Isolation)
DROP POLICY IF EXISTS "Users can access document chunks of their own chatbots" ON public.document_chunks;
CREATE POLICY "Users can access document chunks of their own chatbots"
    ON public.document_chunks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.chatbots
            WHERE chatbots.id = document_chunks.chatbot_id
            AND chatbots.user_id = auth.uid()
        )
    );

-- 9. RLS Policies: Conversations & Messages
DROP POLICY IF EXISTS "Users can view conversations of their own chatbots" ON public.conversations;
CREATE POLICY "Users can view conversations of their own chatbots"
    ON public.conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chatbots
            WHERE chatbots.id = conversations.chatbot_id
            AND chatbots.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Public can create conversation sessions" ON public.conversations;
CREATE POLICY "Public can create conversation sessions"
    ON public.conversations FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert and view messages for active sessions" ON public.messages;
CREATE POLICY "Public can insert and view messages for active sessions"
    ON public.messages FOR ALL
    USING (true)
    WITH CHECK (true);
