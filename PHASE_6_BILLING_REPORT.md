# BotFlow AI – Phase 6: Subscription Management & Payment Integration

Phase 6 implements a production-grade billing, subscription, and quota management system for **BotFlow AI**, featuring official **Razorpay** payment gateway integration in Indian Rupees (INR), HMAC SHA-256 cryptographic verification, idempotent webhooks, PostgreSQL schema migrations with Row Level Security, strict server-side quota enforcement, and a comprehensive user billing dashboard.

---

## 1. Subscription Plans & Quota Architecture

All pricing and limits are maintained server-side in [`backend/src/config/plans.js`](backend/src/config/plans.js) and seeded in PostgreSQL:

| Plan | Monthly Price | Annual Price (Save 20%) | Chatbots Limit | Monthly Messages | Document Limit | Key Features |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FREE** | **₹0** | **₹0** | 1 | 100 | 3 | Standard RAG search, BotFlow watermark, community support |
| **PRO** | **₹999** | **₹9,990/yr** (~₹832/mo) | 5 | 5,000 | 25 | Remove BotFlow branding, visitor analytics, custom colors, email support |
| **BUSINESS** | **₹2,499** | **₹24,990/yr** (~₹2,082/mo) | 20 | 25,000 | 100 | Full white-label, transcript exports, strict domain RLS, priority SLA |

---

## 2. Database Schema Migration

The migration [`backend/migrations/005_subscriptions_billing.sql`](backend/migrations/005_subscriptions_billing.sql) establishes:

1. `subscription_plans`: Master table storing plan codes, INR prices, resource limits, and feature lists.
2. `user_subscriptions`: Active subscription records with `status`, `billing_cycle`, `current_period_start`, `current_period_end`, and `cancel_at_period_end`.
3. `payment_transactions`: Audit trail of all orders, payments, amounts (in paise), and error descriptions.
4. `invoices`: Official invoices generated upon verified payment with invoice number, amount in INR, and billing dates.
5. `usage_records`: Tracks real-time monthly message counts and resource tallies.
6. `webhook_events`: Idempotency log storing `event_id` and payload to eliminate double-crediting.
7. Row Level Security (RLS) policies ensuring users can only read their own transactions and subscriptions.

---

## 3. Server-Side Quota Enforcement

Quotas are enforced directly in backend controllers before any resource is allocated:

1. **Chatbot Quota** (`chatbotController.js`): Checks total chatbots owned against plan limit (`1` for Free, `5` for Pro, `20` for Business). Rejects excess creation attempts with `403 PLAN_LIMIT_EXCEEDED`.
2. **Document & URL Quota** (`knowledgeController.js`): Verifies total uploaded documents and ingested URLs across all user chatbots. Blocks uploads exceeding the limit (`3` for Free, `25` for Pro, `100` for Business).
3. **Monthly Messages Quota** (`chatController.js` & `publicChatController.js`): Atomically increments usage in `usage_records`. Returns clean error when the monthly limit (`100`, `5,000`, or `25,000`) is reached.

---

## 4. Automated Verification & Test Results

Run tests anytime with:
```bash
cd backend && npm test
```

### Test Suite Execution Summary
- `backend/test/billing.test.js` (Phase 6): **12/12 passing**
  1. Free plan registration and default limits
  2. Create Razorpay checkout order for Pro plan
  3. Verify valid payment signature and activate Pro plan
  4. Reject invalid or forged payment signature (400 Bad Request)
  5. Prevent duplicate webhook processing using idempotency
  6. Record payment failure in transaction records
  7. Extend subscription period on renewal webhook
  8. Cancel subscription at period end
  9. Server-side quota enforcement (block 2nd bot on Free plan)
  10. Reject unauthorized billing access without valid token
- `backend/test/embed.test.js` (Phase 5): **13/13 passing**
- `backend/test/api.test.js` (Phases 2-4): **10/10 passing**
- **Total Passing Tests:** **35 / 35 passed with 0 failures**
- **Production Build:** `npm run build` completed successfully (`dist/` generated in 13.36s).
