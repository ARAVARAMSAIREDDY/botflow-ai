# BotFlow AI – Privacy Policy

**Effective Date:** January 1, 2025  
**Last Updated:** November 6, 2026

Welcome to BotFlow AI ("BotFlow", "we", "us", or "our"). We provide an intelligent AI chatbot SaaS platform that enables organizations, businesses, educational institutions, healthcare centers, and hospitality providers to deploy customized, retrieval-augmented generation (RAG) conversational agents.

This Privacy Policy explains how we collect, store, protect, process, and disclose your personal and organization data when you access or use our website (`botflow.ai`), dashboard, embeddable widget SDK, APIs, and associated services (collectively, the "Platform").

---

## 1. Information We Collect

### A. Account & Authentication Information
- **Registration Details:** Email address, password hash, full name, business name, and timezone.
- **Authentication Identifiers:** Supabase JWT user tokens, OAuth provider tokens (if applicable), and persistent session credentials.

### B. Business & Knowledge Base Content
- **Uploaded Documents:** PDF, DOCX, TXT, CSV files uploaded by users to train their chatbots.
- **Website URL Sources:** Web page URLs, scraped raw text, metadata, and extracted knowledge chunks.
- **Vector Embeddings:** 1536-dimensional semantic vector embeddings calculated from uploaded content.

### C. Conversational & Interaction Data
- **Visitor Messages:** Questions, prompts, responses, session tokens, and conversation timestamps generated through the embeddable chatbot widget or dashboard preview.
- **Feedback & Ratings:** Thumbs-up/down ratings, flagged responses, and user feedback notes.

### D. Billing & Transaction Information
- **Payment Records:** Razorpay Order IDs, Payment IDs, payment statuses, plan tiers, and billing cycles.
- *Notice:* We do not store credit card numbers, CVVs, or net banking passwords. All card processing is handled directly by Razorpay (PCI-DSS Level 1 certified).

### E. Technical & Usage Information
- **Telemetry:** IP addresses (anonymized for analytics), browser user-agent, operating system, referrer URLs, and widget domain hostnames for origin authorization.

---

## 2. How We Use Your Information

We process personal and organizational data for the following lawful purposes:
1. **Service Delivery:** Providing, deploying, and maintaining your custom AI chatbots and web widgets.
2. **Retrieval-Augmented Generation (RAG):** Performing vector similarity search strictly against your organization's uploaded knowledge base to answer visitor queries.
3. **Billing & Subscriptions:** Processing recurring payments, managing subscription tiers, generating invoices, and enforcing usage quotas.
4. **Security & Threat Mitigation:** Defending against SSRF, prompt injection attacks, CSRF, DDoS, and unauthorized tenant data access.
5. **Platform Analytics:** Computing resolution rates, token usage metrics, latency, and knowledge gap reports for your administrative dashboard.

---

## 3. Strict AI Training Disclaimer (Zero Foundation Model Training)

> **Important Disclosure:**
> BotFlow AI **NEVER** sells, leases, or uses your proprietary uploaded documents, customer conversation transcripts, or vector embeddings to train, fine-tune, or improve public foundation models (including OpenAI GPT, Google Gemini, or Claude). 
> All knowledge base context injected during query execution is strictly ephemeral and bounded by tenant-isolated Retrieval-Augmented Generation.

---

## 4. Multi-Tenant Data Isolation & Security

- **Row Level Security (RLS):** Supabase PostgreSQL RLS policies enforce cryptographically verified `user_id` boundaries on all database rows.
- **Vector Partitioning:** Document chunks and embeddings are tagged with `user_id` and `chatbot_id`, preventing cross-tenant information leakage.
- **Data Encryption:**
  - In Transit: TLS 1.3 / HTTPS encryption for all API, frontend, and widget communications.
  - At Rest: AES-256 encryption on database storage and Supabase S3-compatible document storage buckets.
- **SSRF Prevention:** Automated URL scrapers validate DNS resolution, reject loopback (`127.0.0.1`), private RFC1918 subnets, and cloud metadata IP addresses (`169.254.169.254`).

---

## 5. Compliance with Global Privacy Frameworks

### General Data Protection Regulation (GDPR - EU/UK)
Under the GDPR, European Union residents possess specific rights:
- **Right to Access:** Request a complete copy of your personal data and uploaded documents.
- **Right to Rectification:** Edit or correct inaccurate profile details in Account Settings.
- **Right to Erasure ("Right to be Forgotten"):** Request permanent account deletion; all associated chatbots, vector embeddings, storage files, and conversation logs are permanently purged within 30 days.
- **Right to Data Portability:** Export your chatbot conversations and analytics in JSON or CSV format.

### California Consumer Privacy Act (CCPA / CPRA)
California residents have the right to know what personal information is collected, request deletion, and opt-out of the "sale" or "sharing" of personal data. BotFlow AI **does not sell** consumer personal information.

---

## 6. Cookies and Tracking Technologies

BotFlow AI uses essential session cookies and local storage items:
- `botflow_token` & `botflow_user`: Secure Supabase JWT authentication session tokens.
- `botflow_widget_session_*`: Ephemeral visitor conversation session identifiers for widget continuity.
- No third-party behavioral advertising tracking cookies are loaded into the embeddable chatbot widget.

---

## 7. Data Retention & Account Deletion

- **Active Accounts:** Data is retained as long as your account remains active.
- **Document Deletion:** Deleting a document from your dashboard immediately purges its parsed text, chunks, vector embeddings, and storage object.
- **Account Termination:** Upon account deletion request via `support@botflow.ai` or Account Settings, all account data, chatbots, and stored knowledge are permanently purged within 30 days.

---

## 8. Contact & Data Protection Officer

For privacy inquiries, GDPR data requests, or security disclosures:
- **Email:** privacy@botflow.ai
- **Security Team:** security@botflow.ai
- **Headquarters:** BotFlow AI, Inc., Bengaluru, Karnataka, India / Delaware, USA.
