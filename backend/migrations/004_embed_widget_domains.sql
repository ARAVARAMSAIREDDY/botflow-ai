-- ========================================================================
-- BotFlow AI - Phase 5: Embeddable Widget, Domain Management & Analytics
-- ========================================================================

-- 1. Extend chatbots table with widget appearance & domain restriction settings
ALTER TABLE public.chatbots
    ADD COLUMN IF NOT EXISTS public_id TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS business_logo TEXT,
    ADD COLUMN IF NOT EXISTS position TEXT NOT NULL DEFAULT 'bottom-right',
    ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    ADD COLUMN IF NOT EXISTS window_size TEXT NOT NULL DEFAULT 'standard' CHECK (window_size IN ('compact', 'standard', 'large')),
    ADD COLUMN IF NOT EXISTS launcher_icon TEXT NOT NULL DEFAULT 'message',
    ADD COLUMN IF NOT EXISTS allowed_domains JSONB NOT NULL DEFAULT '["localhost", "127.0.0.1"]'::jsonb,
    ADD COLUMN IF NOT EXISTS restrict_domains BOOLEAN NOT NULL DEFAULT false;

-- Create index on public_id for ultra-fast widget config lookups
CREATE INDEX IF NOT EXISTS idx_chatbots_public_id ON public.chatbots(public_id);

-- 2. Populate public_id for existing chatbots if NULL
UPDATE public.chatbots
SET public_id = 'bf_' || SUBSTRING(REPLACE(id::text, '-', ''), 1, 12)
WHERE public_id IS NULL;

-- 3. Analytics table for widget sessions and engagement tracking
CREATE TABLE IF NOT EXISTS public.chatbot_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('session_start', 'message_sent', 'query_resolved', 'query_unresolved')),
    user_query TEXT,
    referer_domain TEXT,
    ip_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index analytics by chatbot_id and created_at
CREATE INDEX IF NOT EXISTS idx_analytics_chatbot_date ON public.chatbot_analytics(chatbot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.chatbot_analytics(chatbot_id, event_type);

-- 4. Enable Row Level Security (RLS) on chatbot_analytics
ALTER TABLE public.chatbot_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Owners can read analytics for their own chatbots
DROP POLICY IF EXISTS "Chatbot owners can view analytics" ON public.chatbot_analytics;
CREATE POLICY "Chatbot owners can view analytics" ON public.chatbot_analytics
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chatbots
            WHERE public.chatbots.id = public.chatbot_analytics.chatbot_id
            AND public.chatbots.user_id = auth.uid()
        )
    );

-- Policy: Public widget can insert analytics events
DROP POLICY IF EXISTS "Public widget can log analytics" ON public.chatbot_analytics;
CREATE POLICY "Public widget can log analytics" ON public.chatbot_analytics
    FOR INSERT
    WITH CHECK (true);
