-- ========================================================================
-- BotFlow AI - Phase 6: Subscription Management and Payment Integration
-- ========================================================================
-- Schema for Razorpay integration, multi-tier subscriptions, payment tracking,
-- invoice records, usage quotas, and webhook idempotency.
-- ========================================================================

-- 1. Subscription Plans Master Table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE CHECK (code IN ('free', 'pro', 'business')),
    name TEXT NOT NULL,
    badge TEXT,
    description TEXT,
    price_monthly_inr INTEGER NOT NULL DEFAULT 0, -- In Rupees
    price_annual_inr INTEGER NOT NULL DEFAULT 0,  -- In Rupees
    chatbot_limit INTEGER NOT NULL DEFAULT 1,
    messages_limit INTEGER NOT NULL DEFAULT 100,
    document_limit INTEGER NOT NULL DEFAULT 3,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Initial Plans (FREE, PRO, BUSINESS)
INSERT INTO public.subscription_plans (code, name, badge, description, price_monthly_inr, price_annual_inr, chatbot_limit, messages_limit, document_limit, features)
VALUES 
    (
        'free', 
        'Free Starter', 
        'Free Forever', 
        'Perfect for trying out BotFlow AI on personal projects and small sites.',
        0, 
        0, 
        1, 
        100, 
        3, 
        '["1 Custom AI Chatbot", "100 messages / month", "3 Knowledge documents or URLs", "Standard RAG semantic search", "Basic BotFlow branding", "Community support"]'::jsonb
    ),
    (
        'pro', 
        'Professional', 
        'Most Popular', 
        'Ideal for growing businesses, clinics, and startups requiring custom branding.',
        999, 
        9990, 
        5, 
        5000, 
        25, 
        '["5 Custom AI Chatbots", "5,000 messages / month", "25 Knowledge documents or URLs", "Remove BotFlow branding", "Advanced visitor analytics & FAQs", "Custom color & avatar styling", "Email support (24h response)"]'::jsonb
    ),
    (
        'business', 
        'Business', 
        'Full Power', 
        'For high-traffic platforms, hospitals, and universities with heavy volume.',
        2499, 
        24990, 
        20, 
        25000, 
        100, 
        '["20 Custom AI Chatbots", "25,000 messages / month", "100 Knowledge documents or URLs", "Custom branding & white-label", "Full conversation exports & transcripts", "Strict domain whitelisting & RLS", "Dedicated priority SLA support"]'::jsonb
    )
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    badge = EXCLUDED.badge,
    description = EXCLUDED.description,
    price_monthly_inr = EXCLUDED.price_monthly_inr,
    price_annual_inr = EXCLUDED.price_annual_inr,
    chatbot_limit = EXCLUDED.chatbot_limit,
    messages_limit = EXCLUDED.messages_limit,
    document_limit = EXCLUDED.document_limit,
    features = EXCLUDED.features,
    updated_at = NOW();

-- 2. User Subscriptions Table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_code TEXT NOT NULL REFERENCES public.subscription_plans(code) DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
    billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    razorpay_subscription_id TEXT,
    razorpay_customer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);

-- 3. Payment Transactions Table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
    razorpay_order_id TEXT NOT NULL,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    amount_inr_paise INTEGER NOT NULL, -- in paise (INR * 100)
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'authorized', 'captured', 'refunded', 'failed')),
    plan_code TEXT NOT NULL,
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    error_code TEXT,
    error_description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON public.payment_transactions(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);

-- 4. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    plan_code TEXT NOT NULL,
    amount_inr INTEGER NOT NULL, -- in Rupees
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'void', 'refunded')),
    billing_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    billing_period_end TIMESTAMPTZ NOT NULL,
    invoice_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);

-- 5. Monthly Usage Records Table
CREATE TABLE IF NOT EXISTS public.usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW()),
    period_end TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month'),
    messages_count INTEGER NOT NULL DEFAULT 0,
    chatbots_count INTEGER NOT NULL DEFAULT 0,
    documents_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT usage_records_user_period_key UNIQUE (user_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_records_user_period ON public.usage_records(user_id, period_start);

-- 6. Webhook Events Table (Idempotency)
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('processed', 'ignored', 'failed')),
    error_message TEXT,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id);

-- 7. Enable Row Level Security (RLS) on all billing tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Subscription plans: Anyone authenticated or anonymous can view active plans
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
    FOR SELECT USING (is_active = true);

-- User subscriptions: Users can only see their own subscription
DROP POLICY IF EXISTS "Users can view own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can view own subscription" ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Payment transactions: Users can view their own transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.payment_transactions;
CREATE POLICY "Users can view own transactions" ON public.payment_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Invoices: Users can view their own invoices
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
CREATE POLICY "Users can view own invoices" ON public.invoices
    FOR SELECT USING (auth.uid() = user_id);

-- Usage records: Users can view their own usage records
DROP POLICY IF EXISTS "Users can view own usage records" ON public.usage_records;
CREATE POLICY "Users can view own usage records" ON public.usage_records
    FOR SELECT USING (auth.uid() = user_id);

-- Webhook events: Service role only (no client access)
DROP POLICY IF EXISTS "Service role access for webhooks" ON public.webhook_events;
CREATE POLICY "Service role access for webhooks" ON public.webhook_events
    FOR ALL USING (auth.role() = 'service_role');
