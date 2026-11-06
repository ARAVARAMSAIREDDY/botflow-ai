# BotFlow AI - SaaS Platform Frontend

A modern, production-quality SaaS website for **BotFlow AI**, an AI chatbot platform that enables businesses, colleges, hospitals, restaurants, and other organizations to build custom AI assistants trained on their documents and integrate them into their websites.

## 🚀 Live Local URL
The application is running live at:
**[http://localhost:5173/](http://localhost:5173/)**

---

## 🛠️ Tech Stack
- **Framework**: React 18 + Vite 6
- **Styling**: Tailwind CSS v3 (custom purple/indigo AI theme, glassmorphism, responsive utilities)
- **Icons**: Lucide React
- **Typography**: Plus Jakarta Sans & Inter

---

## ✨ Features & Sections Included

1. **Header & Navigation Bar**:
   - BotFlow.ai brand logo with glowing gradient badge
   - Smooth navigation links (`Home`, `Features`, `How It Works`, `Dashboard`, `Pricing`)
   - Interactive `Log in` and `Get Started` modals
   - Responsive mobile drawer menu

2. **Hero Section**:
   - Heading: *"Build Your Own AI Chatbot in Minutes"*
   - Subtitle: *"Create intelligent AI assistants for your website..."*
   - CTA buttons: `Get Started Free` and `Watch Demo` (opens interactive product tour)
   - Interactive Split-Screen Mockup displaying:
     - Left: Synced knowledge sources (PDF, Web URL, DOCX) & Hallucination Guard (99.4%)
     - Right: Live AI conversation preview with grounded citation response
   - Social proof badges for Hospitals, Colleges, Restaurants, E-commerce, and SaaS

3. **Features Section**:
   - 8 feature cards covering:
     1. AI-powered conversations
     2. Upload PDF and documents
     3. Website knowledge integration
     4. 24/7 customer support
     5. Custom chatbot branding
     6. Conversation history & analytics
     7. Multiple chatbot management
     8. Easy 1-line website integration
   - Category filter pills (`Knowledge & Ingestion`, `Branding & Multi-Bot`, `Conversational Core`, `Deployment`)
   - Grounded RAG zero-hallucination banner

4. **How It Works (Interactive 4-Step Process)**:
   - Step 1: Create your account
   - Step 2: Upload documents or provide website URL
   - Step 3: Customize colors, tone & avatar
   - Step 4: Copy & paste the 1-line embed script
   - Interactive preview box where users can click between steps to see live previews and copy embed code

5. **Industry Use Cases Showcase**:
   - Dedicated tabs for **Hospitals & Clinics**, **Colleges & Universities**, **Restaurants & Dining**, **E-commerce**, and **SaaS**
   - Specific highlight points, typical FAQs, and simulated conversational bubbles for each vertical

6. **Interactive Dashboard Preview**:
   - KPI metrics: Total Chatbots, Total Conversations, Total Messages, Auto-Resolution Rate (94.2%)
   - Active chatbot fleet list with statuses (`Active`, `Training`), synced document counts, and conversations handled
   - Real-time conversation stream with query snippets, user tags, and sentiment
   - Functional **"Create New Chatbot"** modal allowing users to add custom bots dynamically to the fleet list

7. **Pricing Section**:
   - Three tiers: **Free Starter ($0)**, **Professional ($29/mo - Most Popular)**, and **Business & Org ($99/mo)**
   - Monthly / Annual toggle with automatic 20% savings calculation
   - Feature checklists with checkmarks
   - Clear demo pricing notice banner

8. **Floating Live Chatbot Widget**:
   - Bottom-right floating launcher with unread notification badge
   - Expandable chat window with header controls, online status, and clear conversation option
   - Pre-loaded welcome message and clickable suggestion chips
   - Simulated realistic typing indicator (animated bouncing dots)
   - Predefined realistic domain-aware responses for FAQs, document queries, embedding, pricing, healthcare, universities, and restaurants
   - Quick prompt shortcuts bar

9. **Modals & Overlays**:
   - **Embed Code Modal**: Copyable script tags with tabs for HTML, React/Next.js, WordPress, and Shopify
   - **Demo Walkthrough Modal**: Interactive 3-step feature reel
   - **Auth Modal**: Login and Sign Up preview with instant dashboard redirect

10. **Footer**:
    - Product links, industry solutions, legal (Privacy, Terms, HIPAA), contact email (`support@botflow.ai`)
    - Newsletter signup form with confirmation state
    - Social icons (Twitter/X, GitHub, LinkedIn, Discord)
    - Live system status badge (*"All Systems Operational"*) and scroll-to-top button

---

## 💻 Project Structure
```
botflow-ai/
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── services/
│   │   └── api.js
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Hero.jsx
│   │   ├── Features.jsx
│   │   ├── HowItWorks.jsx
│   │   ├── UseCases.jsx
│   │   ├── DashboardPreview.jsx
│   │   ├── Pricing.jsx
│   │   ├── LiveChatWidget.jsx
│   │   ├── IntegrationCodeModal.jsx
│   │   ├── DemoVideoModal.jsx
│   │   ├── AuthModal.jsx
│   │   ├── AccountSettingsModal.jsx
│   │   ├── BillingDashboardModal.jsx
│   │   ├── AnalyticsDashboardModal.jsx
│   │   ├── ConversationInboxModal.jsx
│   │   ├── KnowledgeGapsModal.jsx
│   │   ├── NotificationCenterModal.jsx
│   │   ├── KnowledgeBaseModal.jsx
│   │   ├── DomainManagementModal.jsx
│   │   └── Footer.jsx
│   └── data/
│       └── demoChatResponses.js
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rag_vector_schema.sql
│   │   ├── 003_auth_multitenant_schema.sql
│   │   ├── 004_embed_widget_domains.sql
│   │   ├── 005_subscriptions_billing.sql
│   │   └── 006_analytics_conversation_management.sql
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── test/
│       ├── api.test.js
│       ├── embed.test.js
│       ├── billing.test.js
│       ├── analytics_conversation.test.js
│       └── production_readiness.test.js
├── vercel.json
├── DEPLOYMENT_GUIDE.md
├── .github/
│   └── workflows/
│       └── ci.yml
└── dist/ (production build)
```

## 🚀 Phase 8: Production Deployment & Infrastructure

The application is fully prepared for enterprise cloud deployment:
- **Vercel Frontend Optimization**: Single-Page Application (SPA) routing rewrites (`vercel.json`), static asset caching (1 year immutable), vendor chunk splitting (`vendor-react`, `vendor-icons`, `vendor-supabase`), and OpenGraph/SEO metadata.
- **Client Resilience**: Global `<ErrorBoundary>` catches unhandled runtime issues gracefully with a branded recovery UI.
- **Render / Railway / Docker Backend**: Containerized with multi-stage `Dockerfile`, non-root user, reverse proxy trust (`trust proxy`), liveness (`/api/health`) and readiness (`/api/ready`) probes, and graceful shutdown (SIGTERM/SIGINT with 10s connection draining).
- **Supabase Cloud & Persistent Storage**: Consolidated master production migration (`000_master_production_schema.sql`) covering pgvector, HNSW indexing, 12 tables, RLS policies, and private object storage bucket (`botflow-documents`) replacing temporary disk files.
- **CI/CD Pipeline**: GitHub Actions workflow (`.github/workflows/ci.yml`) automating backend test runs (57/57 tests passing), Vite production builds, and dependency vulnerability audits.
- **Production Embed Delivery**: Generated embed codes dynamically resolve production endpoints and SDK URLs (`api.botflow.ai`), avoiding hardcoded localhost references.

## 🏃 Running the Project
```bash
# 1. Start backend server (Port 5001)
cd backend
npm install
npm run dev # or: node server.js

# 2. Run all backend automated tests (57/57 passing)
npm test

# 3. Start Vite frontend server (Port 5173)
cd ..
npm run dev

# 4. Run frontend production build
npm run build
```
