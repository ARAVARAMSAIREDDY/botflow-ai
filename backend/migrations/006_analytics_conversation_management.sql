-- ========================================================================
-- BotFlow AI - Phase 7: Advanced Analytics & Conversation Management
-- ========================================================================
-- Schema enhancements for:
-- 1. Conversation inbox, transcripts, statuses (active, resolved, handed_over, closed)
-- 2. Human agent messages, assignments, and response times
-- 3. Customer feedback ratings (stars, thumbs, comments)
-- 4. Knowledge gap tracking for unanswered inquiries
-- 5. In-dashboard notification center
-- 6. Strict tenant isolation and Row Level Security (RLS)
-- ========================================================================

-- 1. Enhance conversations table with handoff, feedback, and resolution timestamps
ALTER TABLE public.conversations
    ADD COLUMN IF NOT EXISTS rating INT CHECK (rating >= 1 AND rating <= 5),
    ADD COLUMN IF NOT EXISTS feedback_comment TEXT,
    ADD COLUMN IF NOT EXISTS assigned_agent_name TEXT,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS handed_over_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Drop and recreate status check constraint to include 'closed'
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_status_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_status_check 
    CHECK (status IN ('active', 'resolved', 'handed_over', 'closed'));

-- 2. Enhance messages table with human agent sender and response time
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_check 
    CHECK (sender IN ('user', 'bot', 'agent', 'system'));

ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS response_time_ms INT DEFAULT 0;

-- 3. Customer Feedback Table
CREATE TABLE IF NOT EXISTS public.customer_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    thumbs_up BOOLEAN,
    comment TEXT,
    user_identifier TEXT DEFAULT 'Anonymous Visitor',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_feedback_chatbot ON public.customer_feedback(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_created ON public.customer_feedback(created_at DESC);

-- 4. Knowledge Gaps Table (Tracking unanswered / unresolved visitor questions)
CREATE TABLE IF NOT EXISTS public.knowledge_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    frequency INT NOT NULL DEFAULT 1,
    suggested_topic TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'addressed', 'ignored')),
    last_asked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT knowledge_gaps_bot_question_key UNIQUE (chatbot_id, question)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_chatbot ON public.knowledge_gaps(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_frequency ON public.knowledge_gaps(chatbot_id, frequency DESC);

-- 5. In-Dashboard Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    chatbot_id UUID REFERENCES public.chatbots(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('handoff_request', 'unresolved_query', 'quota_warning', 'document_failed', 'subscription_event', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(user_id, created_at DESC);

-- 6. Performance Indexes for Conversation Filtering & Search
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(chatbot_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON public.conversations(chatbot_id, created_at DESC);

-- 7. Enable Row Level Security (RLS) on new tables
ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Owners can view and manage feedback for their chatbots
DROP POLICY IF EXISTS "Chatbot owners can view customer feedback" ON public.customer_feedback;
CREATE POLICY "Chatbot owners can view customer feedback" ON public.customer_feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chatbots
            WHERE public.chatbots.id = public.customer_feedback.chatbot_id
            AND public.chatbots.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Public can insert customer feedback" ON public.customer_feedback;
CREATE POLICY "Public can insert customer feedback" ON public.customer_feedback
    FOR INSERT WITH CHECK (true);

-- Policy: Owners can view and manage knowledge gaps for their chatbots
DROP POLICY IF EXISTS "Chatbot owners can manage knowledge gaps" ON public.knowledge_gaps;
CREATE POLICY "Chatbot owners can manage knowledge gaps" ON public.knowledge_gaps
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.chatbots
            WHERE public.chatbots.id = public.knowledge_gaps.chatbot_id
            AND public.chatbots.user_id = auth.uid()
        )
    );

-- Policy: Users can view and manage their own notifications
DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;
CREATE POLICY "Users can manage own notifications" ON public.notifications
    FOR ALL USING (auth.uid() = user_id);
