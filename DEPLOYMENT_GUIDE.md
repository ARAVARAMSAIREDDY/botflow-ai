# BotFlow AI – Production Deployment & Infrastructure Guide

This production guide walks through deploying the complete **BotFlow AI** SaaS platform to production using enterprise cloud infrastructure:
- **Frontend**: [Vercel](https://vercel.com) (React 18 + Vite SPA, Global Edge CDN)
- **Backend API**: [Render](https://render.com) or [Railway](https://railway.app) (Node.js 20, Docker, Reverse Proxy Trust)
- **Database & Storage**: [Supabase](https://supabase.com) (PostgreSQL 15+, pgvector HNSW, Storage Buckets, Row Level Security)
- **Payments**: [Razorpay](https://razorpay.com) (Live Subscriptions, Orders, Webhook HMAC SHA256)
- **AI Core**: [OpenAI](https://platform.openai.com) (GPT-4o-mini & text-embedding-3-small)

---

## 1. Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │          Custom Domains & SSL        │
                      │  botflow.ai       api.botflow.ai     │
                      └──────────────────┬───────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
       ┌───────────────────┐                           ┌───────────────────┐
       │      Vercel       │                           │  Render / Railway │
       │  (Vite React SPA) │                           │ (Node.js Express) │
       │  Edge CDN Cache   │ ──REST API (/api/chat)──> │  Helmet, CORS     │
       │  SPA Routing Rewr.│                           │  Rate Limiter     │
       └───────────────────┘                           └─────────┬─────────┘
                 │                                               │
      Embed SDK script tag                                       │
     (https://api.botflow.ai/widget/botflow.js)                  │
                 │                                               │
                 ▼                                               │
       ┌───────────────────┐                                     │
       │ Customer Websites │                                     │
       │ (Shopify, WP, etc)│                                     │
       └───────────────────┘                                     │
                                         ┌───────────────────────┼───────────────────────┐
                                         ▼                       ▼                       ▼
                               ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
                               │   Supabase Cloud  │   │     OpenAI API    │   │  Razorpay Gateway │
                               │ PostgreSQL + RLS  │   │  gpt-4o-mini      │   │  Live Orders &    │
                               │ pgvector (HNSW)   │   │  text-embedding   │   │  Subscriptions    │
                               │ Storage Buckets   │   │  (1536 dims)      │   │  Webhook Verify   │
                               └───────────────────┘   └───────────────────┘   └───────────────────┘
```

---

## 2. Supabase Cloud Configuration (Database & Storage)

### Step 2.1: Create a Production Supabase Project
1. Go to [database.new](https://database.new) and create a project (e.g. `botflow-production`).
2. Select your nearest cloud region and record your database password securely.
3. Once provisioned, navigate to **Project Settings** → **API**:
   - `Project URL`: `https://<project-id>.supabase.co`
   - `anon public key`: `eyJhbGci...`
   - `service_role secret key`: `eyJhbGci...` (keep secret!)

### Step 2.2: Apply Master Database Migration
1. In the Supabase Dashboard, click **SQL Editor** → **New Query**.
2. Open [`backend/migrations/000_master_production_schema.sql`](backend/migrations/000_master_production_schema.sql).
3. Copy and execute the entire SQL script.
4. Verify the following output:
   - Extension `vector` enabled.
   - Tables created: `users`, `chatbots`, `knowledge_sources`, `document_chunks`, `conversations`, `messages`, `customer_feedback`, `knowledge_gaps`, `notifications`, `subscriptions`, `transactions`, `usage_records`.
   - HNSW index `idx_chunks_embedding_hnsw` created.
   - Row Level Security (RLS) enabled across all tables.
   - RPC function `match_document_chunks()` created.
   - Storage bucket `botflow-documents` created.

### Step 2.3: Configure Automated Backups
1. In Supabase Dashboard, navigate to **Database** → **Backups**.
2. Enable Daily Automated Backups (Point-in-Time Recovery recommended for Business tier).

---

## 3. Backend Deployment (Render or Railway)

### Option A: Render Deployment (Recommended)
1. Fork or push your BotFlow AI repository to GitHub.
2. Sign in to [dashboard.render.com](https://dashboard.render.com) and click **New +** → **Blueprint**.
3. Select your repository. Render will automatically detect [`backend/render.yaml`](backend/render.yaml).
4. Configure the environment variables in the Render Dashboard:

| Variable | Value / Description | Example |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | `production` |
| `PORT` | `10000` (assigned by Render) | `10000` |
| `TRUST_PROXY` | `1` | `1` |
| `CLIENT_URL` | Production frontend domain | `https://botflow.ai` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `https://botflow.ai,https://www.botflow.ai` |
| `API_BASE_URL` | Public API domain | `https://api.botflow.ai` |
| `WIDGET_PUBLIC_URL`| Standalone widget SDK URL | `https://api.botflow.ai/widget/botflow.js` |
| `SUPABASE_URL` | Supabase Project URL | `https://<id>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret key | `eyJhbGci...` |
| `SUPABASE_ANON_KEY` | Supabase anon key | `eyJhbGci...` |
| `OPENAI_API_KEY` | OpenAI secret API key | `sk-proj-...` |
| `OPENAI_MODEL` | AI chat model | `gpt-4o-mini` |
| `JWT_SECRET` | 64+ char random hex string | `node -e "console.log(crypto.randomBytes(32).toString('hex'))"` |
| `RAZORPAY_KEY_ID` | Razorpay Live/Test Key | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay Secret Key | `...` |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Webhook Secret | `...` |

5. Click **Apply**. Render will install dependencies, execute the health check at `/api/health`, and bring the service live.

### Option B: Railway Deployment
1. Go to [railway.app](https://railway.app) and create a **New Project** → **Deploy from GitHub repo**.
2. Set **Root Directory** to `/backend`.
3. Railway automatically detects [`backend/railway.json`](backend/railway.json) and configures the `/api/health` healthcheck.
4. Under **Variables**, add the production environment variables listed above.

---

## 4. Frontend Deployment (Vercel)

1. Sign in to [vercel.com](https://vercel.com) and click **Add New...** → **Project**.
2. Select your repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (project root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In **Environment Variables**, add:
   ```env
   VITE_API_URL=https://api.botflow.ai/api
   VITE_WIDGET_URL=https://api.botflow.ai/widget/botflow.js
   VITE_APP_ENV=production
   ```
5. Click **Deploy**. Vercel will build the React SPA and deploy to its global edge network. [`vercel.json`](vercel.json) handles SPA routing rewrites and asset caching automatically.

---

## 5. Domain & DNS Configuration

Configure DNS records with your registrar (Cloudflare, Namecheap, GoDaddy):

| Type | Host | Points To / Value | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `A` | `@` | `76.76.21.21` (Vercel IP) | Auto | Main Website (`botflow.ai`) |
| `CNAME` | `www` | `cname.vercel-dns.com` | Auto | WWW Redirect |
| `CNAME` | `api` | `<your-backend>.onrender.com` | Auto | Backend API (`api.botflow.ai`) |

### Verification:
```bash
# Verify API DNS resolution and SSL
curl -I https://api.botflow.ai/api/health

# Verify Frontend DNS
curl -I https://botflow.ai
```

---

## 6. Payment & Webhook Configuration (Razorpay)

1. In the [Razorpay Dashboard](https://dashboard.razorpay.com):
   - Switch from Test Mode to **Live Mode**.
   - Navigate to **Settings** → **API Keys** to generate `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
2. Configure Webhooks:
   - Navigate to **Settings** → **Webhooks** → **Add New Webhook**.
   - **Webhook URL**: `https://api.botflow.ai/api/billing/webhook`
   - **Secret**: Enter a secret (matches `RAZORPAY_WEBHOOK_SECRET`).
   - **Alert Email**: Your devops email.
   - **Active Events**:
     - `payment.captured`
     - `payment.failed`
     - `subscription.charged`
     - `subscription.cancelled`
     - `subscription.halted`
3. Click **Save**.

---

## 7. Production Verification Checklist

Execute this 12-point smoke test before public launch:

- [ ] **1. Account Registration**: Register a real user account at `https://botflow.ai`. Verify JWT session persistence.
- [ ] **2. Login & Profile**: Log out and log back in. Verify profile and business name display.
- [ ] **3. Chatbot Creation**: Create a new custom chatbot with specific tone and branding color.
- [ ] **4. Document Upload**: Upload a PDF document (e.g. clinic guidelines or pricing brochure). Verify upload progress and Supabase Storage persistence.
- [ ] **5. RAG Question Answering**: Query the chatbot via the dashboard with questions answerable only from the uploaded document. Verify grounded citation response.
- [ ] **6. Embed Script Integration**: Copy the embed script generated in the dashboard and test on a standalone HTML page or staging site.
- [ ] **7. Responsive Testing**: Open the widget on mobile (iOS/Android Safari/Chrome) and desktop.
- [ ] **8. Billing Flow**: Initiate a plan upgrade. Complete Razorpay checkout and verify immediate status update to Pro/Business.
- [ ] **9. Quota Enforcement**: Verify chatbot creation and message limits enforce plan thresholds.
- [ ] **10. Multi-Tenant Isolation**: Log in as a separate user account. Confirm that User A's chatbots, documents, conversations, and analytics are strictly inaccessible to User B.
- [ ] **11. Service Resilience**: Trigger backend restart on Render/Railway. Confirm `/api/ready` handles healthcheck and persistent database data remains intact.
- [ ] **12. Error Monitoring**: Trigger an intentional 404 or bad request. Confirm that no secret environment variables or stack traces are leaked to the client.
