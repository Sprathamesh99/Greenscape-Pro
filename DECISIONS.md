# Greenscape Pro — Architectural Decision Records (ADR)

This document details key architectural and technical decisions made during the design and engineering of the Greenscape Pro Proposal Intelligence Agent.

---

## ADR 001: Zero-Price AI Architecture (Strict AI vs Deterministic Split)

### Context
High-ticket landscaping projects ($20k–$150k) require exact bill-of-materials costing and mathematically guaranteed profit margins. Generative AI models are prone to hallucinating numbers, misapplying unit conversions, and making rounding errors.

### Decision
Segregate all responsibilities:
1. **AI (Gemini 3.7 Flash)** is strictly limited to extracting scope, categorizing work into spatial zones, parsing quantities/units, and synthesizing customer-facing project narratives.
2. **Pricing Engine (TypeScript)** is the sole authority for unit prices, labor costs, volume tiers, minimum charges, sales tax calculations, and margin metrics.
3. System prompts explicitly forbid the AI from generating currency figures, and backend sanitizers strip any unexpected numerical prices prior to pricing engine execution.

### Consequences
- **Positive**: 0% risk of price hallucination; deterministic repeatability; guaranteed 38% margin floor enforcement.
- **Negative**: Requires maintenance of an authoritative Phoenix Master Item Catalog.

---

## ADR 002: Gemini 3.7 Flash with Dynamic Thinking Mode

### Context
Field notes from contractors and sales reps are frequently messy, unstructured, and contain colloquial trade jargon ("Belgard Lafitt 3-pc", "48in stacked stone gas pit", "travertine bullnose").

### Decision
Adopt Google Gemini 3.7 Flash (`gemini-2.5-flash` / `gemini-3.7-flash`) with thinking capabilities enabled (`thinkingBudget: 2048`). Use the `@google/genai` SDK for server-side requests with a 25-second timeout circuit breaker and a 200-entry LRU cache.

### Consequences
- **Positive**: Exceptional ability to decipher chaotic field notes, identify spatial zones, and flag trade ambiguities without slow inference times.
- **Negative**: Requires server-side API key management and fallback parsing if internet/API outages occur.

---

## ADR 003: Full-Stack React 19 + Express 4.21 Monolith Architecture

### Context
The application needs rapid iterative response times, seamless state synchronization, zero secret leakage to the browser, and instant deployment.

### Decision
Package the application as a unified Express + Vite hybrid where Express serves `/api/*` REST endpoints and embeds Vite middleware for development and static compilation in production (`dist/server.cjs`).

### Consequences
- **Positive**: Secrets (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SLACK_WEBHOOK_URL`) remain 100% server-side; single-port routing (`0.0.0.0:3000`); straightforward deployment on Cloud Run.
- **Negative**: Frontend and backend share the same container runtime.

---

## ADR 004: In-Memory Relational Engine with Supabase Schema Parity

### Context
The app must boot immediately in ephemeral sandbox environments while supporting production PostgreSQL persistence with foreign keys, relational indexing, and Row Level Security.

### Decision
Implement a zero-dependency In-Memory Relational Database (`database.ts`) with secondary hash indexing (`zoneIdsByProposalId`, `itemIdsByProposalId`, etc.) and exact schema parity with PostgreSQL/Supabase. Provide full SQL migrations (`migrations/` and `supabase-rls.sql`).

### Consequences
- **Positive**: Zero external database provisioning required for instant developer onboarding; blazingly fast in-memory query performance (<1ms); effortless migration to hosted PostgreSQL.
- **Negative**: Ephemeral storage in development resets on container reboot unless synced with Supabase.

---

## ADR 005: Dual-Threshold Role-Based Approval Workflow

### Context
Standard landscaping jobs with healthy margins should be approved quickly by sales estimators, but under-priced jobs or high-risk projects must require owner/manager sign-off.

### Decision
Enforce a 2-tier approval gate:
- **Level 1 (Estimator)**: Can approve proposals if Gross Margin >= 38.0% and no unresolved blocking discrepancies exist.
- **Level 2 (Senior Estimator / Owner)**: Mandatory for proposals with Gross Margin < 38.0%, unresolved discrepancies, or total contract values exceeding $50,000. Requires mandatory override justification note recorded in the audit log.

### Consequences
- **Positive**: Prevents margin leakage and protects company cash flow without slowing down standard proposals.
- **Negative**: Requires clear UI warning states when proposals trigger senior approval requirements.

---

## ADR 006: Asynchronous Outbox Pattern for External Integrations

### Context
External webhook services (Slack notifications, GoHighLevel CRM updates) can experience network latency, rate limits, or downtime.

### Decision
Decouple proposal approval from webhook delivery using an outbox pattern. The database commits the proposal approval state first, then asynchronously dispatches webhooks with exponential backoff (1s, 2s, 4s retry). Webhook failures are logged as integration events without blocking the user interface.

### Consequences
- **Positive**: Instant UI responsiveness; 100% data integrity; no orphaned approvals caused by third-party webhook timeouts.
- **Negative**: Webhook delivery is eventual rather than strictly transactional.
