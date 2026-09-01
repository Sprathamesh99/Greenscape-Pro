# Greenscape Pro — Proposal Intelligence Agent
### Enterprise Landscaping Proposal Synthesis & Deterministic Pricing Engine

---

## 1. Project Overview & Business Problem

### Business Problem
Residential hardscape and landscape design-build firms in the Phoenix Metro region (Scottsdale, Paradise Valley, Gilbert, Arcadia) manage high-ticket contracts ranging from **$20,000 to $150,000+**. Estimators face two massive bottlenecks:
1. **Proposal Turnaround Lag (3–7 Days):** Turning handwritten site walk notes, voice transcripts, and rough sketches into detailed bills-of-materials takes hours of manual data entry. Slow bids result in a 30–40% loss in deal conversion to faster competitors.
2. **Gross Margin Leakage & Hallucination Risk:** Estimators accidentally underbid complex jobs by miscalculating excavation volume, omitting minimum charges, or applying arbitrary discounts. Unconstrained AI tools hallucinate prices, miscalculate sales taxes, and risk severe financial losses.

### The Solution: Greenscape Pro
Greenscape Pro provides an intelligent, end-to-end proposal generation and approval platform that transforms messy field notes into structured, mathematically guaranteed proposals within **under 60 seconds** while enforcing an inviolable **38% gross margin floor**.

---

## 2. System Architecture & Core Stack

```
                        ┌──────────────────────────────────────────────┐
                        │      Client Web Application (React 19 + Vite)│
                        └───────────────────────┬──────────────────────┘
                                                │ REST API / JSON
                                                ▼
                        ┌──────────────────────────────────────────────┐
                        │        Express Backend Gateway (Node 20)     │
                        │  • Concurrency Mutex Locks                   │
                        │  • PII-Safe Audit Logging                    │
                        │  • 25-Second Timeout Circuit Breaker         │
                        └───────────────┬──────────────┬───────────────┘
                                        │              │
                                        ▼              ▼
   ┌────────────────────────────────────────────┐ ┌────────────────────────────────────────────┐
   │       AI Scope Extraction (Gemini)         │ │   Deterministic Pricing Engine (TypeScript)│
   │  • Gemini 3.7 Flash with High Thinking     │ │  • Phoenix 200+ Master Item Catalog        │
   │  • Prompt-Isolated Narrative Structuring   │ │  • Enforced 38% Gross Margin Floor         │
   │  • LRU Caching & In-Flight Deduplication   │ │  • Exact Rounding & Municipal Tax (8.6%)  │
   └────────────────────────────────────────────┘ └──────────────┬─────────────────────────────┘
                                                                 │
                                                                 ▼
                        ┌──────────────────────────────────────────────┐
                        │         Database (Supabase / Postgres)       │
                        │  • Secondary Relational Indexes              │
                        │  • Immutable Version Snapshots               │
                        │  • Immutable PII-Safe Audit Trail            │
                        └──────────────────────────────────────────────┘
```

### Technology Stack
- **Frontend SPA:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion.
- **Backend API:** Node.js (v20/v22), Express 4.21, TypeScript via `tsx` / `esbuild`.
- **AI Intelligence:** `@google/genai` SDK with Google Gemini 3.7 Flash (`gemini-2.5-flash` / `gemini-3.7-flash`), structured schema outputs, thinking mode (`thinkingBudget: 2048`), and prompt injection isolation boundaries.
- **Pricing Authority:** Deterministic TypeScript Pricing Engine with Levenshtein fuzzy SKU matching.
- **Database & Persistence:** Relational In-Memory Store with $O(k)$ Secondary Indexes and full SQL migration parity for hosted PostgreSQL / Supabase with Row Level Security.
- **Integrations:** Slack Webhooks (Construction Crew Dispatch), GoHighLevel CRM Adapter (Pipeline Opportunity Synchronization).

---

## 3. Local Development Setup

### Prerequisites
- Node.js 20+ (or 22+)
- npm 9+

### Step-by-Step Setup
```bash
# 1. Clone the repository
git clone https://github.com/greenscape-pro/proposal-intelligence-agent.git
cd proposal-intelligence-agent

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local to supply your optional GEMINI_API_KEY, SLACK_WEBHOOK_URL, etc.

# 4. Run automated test suites
npm run test
npm run test:security

# 5. Start development server
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 4. Environment Variables Reference

| Variable | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | Number | **Yes** | `3000` | Port for Express & Vite dev server. Bound to `0.0.0.0`. |
| `NODE_ENV` | String | **Yes** | `development` | Runtime mode (`development`, `test`, `production`). |
| `GEMINI_API_KEY` | Secret | **Yes** (Prod) | `None` | Google Gemini API key. Managed server-side only. |
| `SUPABASE_URL` | URL | Optional | `None` | Hosted Supabase project URL (e.g. `https://xyz.supabase.co`). |
| `SUPABASE_ANON_KEY` | Secret | Optional | `None` | Supabase anonymous client key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Optional | `None` | Supabase secret service role key for database operations. |
| `SLACK_WEBHOOK_URL` | URL | Optional | `None` | Incoming Webhook URL for alerting `#proposals-approved`. |
| `GHL_API_KEY` | Secret | Optional | `None` | GoHighLevel CRM OAuth Bearer Token / API Key. |
| `GHL_WEBHOOK_URL` | URL | Optional | `None` | GoHighLevel workflow webhook trigger endpoint. |

---

## 5. Database Setup & Migrations

The database layer runs immediately with an indexed in-memory store for instant developer onboarding, but includes full migration scripts for production PostgreSQL / Supabase:

1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Execute `migrations/001_initial_schema.sql` to initialize tables, relations, indexes, and RLS policies.
3. Execute `migrations/002_seed_pricing_catalog.sql` to load the 200+ Phoenix Master Item Catalog.

---

## 6. Gemini AI Setup & Guardrails

### Setup
1. Obtain an API key from [Google AI Studio](https://aistudio.google.com/).
2. Add `GEMINI_API_KEY=your_key_here` to `.env.local` or Cloud Secret Manager.

### Safety Guardrails:
- **Untrusted Input Isolation:** Field notes are scanned for jailbreak signatures and wrapped in `<untrusted_site_notes>`.
- **Zero-Dollar AI Directive:** AI prompt instructs the model to extract scope and spatial zones only.
- **Output Sanitization:** Any accidental price or dollar tokens in AI responses are stripped before reaching the pricing engine.
- **Heuristic Fallback:** If the API key is missing or encounters a timeout (25s circuit breaker), the system gracefully falls back to an internal heuristic regex parser.

---

## 7. Slack & GoHighLevel (GHL) Integrations

### Slack Webhook Setup:
1. In Slack, create an Incoming Webhook for your `#proposals-approved` channel.
2. Set `SLACK_WEBHOOK_URL` in your environment.
3. When a proposal is approved (by Estimator or Senior Estimator), an interactive message with contract total, margin %, client name, and spatial zone breakdown is dispatched asynchronously.

### GoHighLevel (GHL) Adapter Explanation:
- The GHL adapter connects proposal lifecycle events with your CRM sales pipeline.
- Upon proposal approval, the adapter updates the contact record and advances the CRM Opportunity stage to `Proposal Approved` with the exact contract value.
- Utilizes the **Outbox Pattern**: if the CRM webhook fails or is unconfigured, the proposal approval succeeds immediately and records the error in the audit log for retry.

---

## 8. Testing & Verification

Run all test suites locally:
```bash
# Deterministic Pricing Engine Unit Tests
npm run test

# Security & Threat Model Audit Suite
npm run test:security

# TypeScript Compilation Check
npm run lint

# Production Bundle Build
npm run build
```

---

## 9. Deployment Guide (Google Cloud Run)

### Multi-Stage Container Build & Deploy:
```bash
# Build & submit container
gcloud builds submit --tag gcr.io/YOUR_GCP_PROJECT_ID/greenscape-pro-agent:latest

# Deploy to Cloud Run
gcloud run deploy greenscape-pro-agent \
  --image gcr.io/YOUR_GCP_PROJECT_ID/greenscape-pro-agent:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars NODE_ENV=production \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest,SLACK_WEBHOOK_URL=SLACK_WEBHOOK_URL:latest
```

---

## 10. Troubleshooting & FAQ

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| `500 Internal Error` on AI Extract | Missing or invalid Gemini API key | Check `GEMINI_API_KEY`. System automatically falls back to heuristic parser if unconfigured. |
| AI Extraction timeout (25s) | Upstream network latency | 25-second circuit breaker aborts gracefully and switches to heuristic parser. |
| `400 Bad Request: Margin below floor` | Margin is under 38.0% | Adjust line item prices or obtain Senior Estimator / Owner override authorization. |
| Slack notification not posting | Webhook URL misconfigured | Check `GET /api/status` -> `subsystems.integrations`. Webhook dispatch is non-blocking. |

---

## 11. Known Limitations & Future Work

### Limitations:
- **2D Boundary Scopes:** Currently models 2D square footage, linear feet, and item counts; does not yet ingest 3D topographic point clouds.
- **Regional Catalog Focus:** Pre-configured with Phoenix Metro materials (Belgard, Belgard Lafitt, travertine, desert xeriscape, Maricopa sales tax). Adapting to other states requires updating the Master Catalog.

### Future Work:
- **Agent #2 (Permitting & HOA):** Automated Maricopa County setback and HOA CC&R submittal packet generation.
- **Agent #3 (LiDAR CAD Extractor):** Direct iPhone LiDAR and drone photogrammetry boundary segmentation.
- **Mobile Offline Mode:** Progressive Web App (PWA) offline client cache for remote job sites with poor cellular coverage.
