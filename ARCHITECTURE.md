# Greenscape Pro — System Architecture Document
### Proposal Intelligence & Deterministic Pricing System

---

## 1. System Overview & Core Philosophy

Greenscape Pro is an enterprise proposal synthesis and estimating platform purpose-built for high-ticket residential landscape and hardscape design-build firms ($20k–$150k+ project budgets in the Phoenix Metro region).

### The Inviolable Core Architecture Rule
> **"AI extracts and structures scope; the Deterministic Pricing Engine calculates all money."**

Under no circumstances is an LLM allowed to generate dollar amounts, apply math formulas, or dictate pricing logic. This strict segregation guarantees 100% mathematical precision, eliminates hallucination risks, and preserves business margin floors.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                       React 19 + Vite Frontend SPA                         │
│  - Step-by-step Proposal Workflow (Project -> Notes -> AI -> Price -> Edit)│
│  - Margin Health Visualizers (Subtotal, Cost, Margin %, Floor Guardrail)   │
│  - Discrepancy Flagging & Resolution Banners                               │
│  - Dual-Threshold Approval Action Bar (Estimator vs Owner/Manager)         │
│  - Print & PDF Export View with Phoenix Landscape Branding                 │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │ REST API / JSON
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    Express 4.21 Backend API Gateway                        │
│  - Strict Route Scoping (/api/*) & In-Flight Concurrency Mutex Locks       │
│  - PII-Safe Audit Logging & Security Sanitization Middleware               │
│  - Outbox Integration Pattern with Resilience & Exponential Backoff        │
└───────────────────────┬────────────────────────────┬───────────────────────┘
                        │                            │
                        ▼                            ▼
┌───────────────────────────────────┐    ┌───────────────────────────────────┐
│     Google Gemini 3.7 Flash       │    │   Deterministic Pricing Engine    │
│  - Thinking Mode Enabled          │    │  - Master Phoenix Catalog (200+)  │
│  - Prompt-Injection Delimiters    │    │  - Fuzzy & Exact SKU Matching     │
│  - Zero-Dollar Instruction Set    │    │  - Enforced 38% Gross Margin Floor│
│  - LRU Extraction Cache           │    │  - Half-Cent Rounding Invariants  │
└───────────────────────────────────┘    └─────────────────┬─────────────────┘
                                                           │
                                                           ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                 Relational Data Store (Supabase / Postgres)                │
│  - Projects, Proposals, Zones, LineItems, Discrepancies, Versions          │
│  - Immutable Audit Logs & Integration Outbox Event Store                   │
│  - Relational Foreign Keys & Cascading Deletes                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. End-to-End Workflow Pipeline

```
1. Project Creation & CRM Sync
   └─ User creates project or selects existing customer record
      └─ Generates unique UUID and proposal sequence number (GP-YYYY-####)

2. Site Note Ingestion & Security Scan
   └─ Untrusted contractor field notes / voice transcript entered
   └─ Server-side AISecurityEngine scans for prompt injections / overrides
   └─ Strips malicious delimiter tags and encapsulates inside <untrusted_site_notes>

3. AI Scope Extraction (Gemini 3.7 Flash)
   └─ Structured JSON extraction of physical scope (Zones, Dimensions, Materials)
   └─ Flags ambiguities as discrepancies (e.g. missing measurements, gas line routes)
   └─ Output sanitizer strips any accidental price or cost tokens

4. Deterministic Pricing Match & Calculation
   └─ Matches raw items against authoritative Phoenix Master Catalog
   └─ Exact SKU match -> Confident Fuzzy match (Levenshtein >= 0.70) -> Review Required
   └─ Evaluates volume tiers, minimum charges, subtotal cost, margin %, and tax (8.6%)
   └─ Flags margin violations if gross margin < 38%

5. Proposal Review & Interactive Editing
   └─ Estimator adjusts quantities, swaps catalog items, or adds optional add-ons
   └─ Recalculates all pricing deterministically on every keystroke
   └─ Resolves discrepancies with audit justifications

6. Multi-Tier Role-Based Approval
   └─ Standard Proposals (>= 38% margin): Estimator one-click approval
   └─ Flagged Proposals (< 38% margin OR unresolved discrepancies OR > $50k): 
      Requires Senior Estimator / Owner authorization with override note

7. Outbox Dispatch & Downstream Synchronization
   └─ Version snapshot recorded in immutable store
   └─ PII-safe audit log committed with IP, user role, and timestamp
   └─ Asynchronous Slack webhook alert posted to installation channel
   └─ Asynchronous GoHighLevel CRM opportunity stage updated
```

---

## 3. Data Model & Schema Relationships

```
┌─────────────────┐       1:N       ┌──────────────────┐
│     Project     ├────────────────►│     Proposal     │
└─────────────────┘                 └────────┬─────────┘
                                             │
                       ┌─────────────────────┼────────────────────┐
                       │ 1:N                 │ 1:N                │ 1:N
                       ▼                     ▼                    ▼
              ┌─────────────────┐   ┌─────────────────┐  ┌──────────────────┐
              │  ProposalZone   │   │  Discrepancy    │  │ ProposalVersion  │
              └────────┬────────┘   └─────────────────┘  └──────────────────┘
                       │ 1:N
                       ▼
              ┌─────────────────┐
              │  ProposalItem   │
              └─────────────────┘
```

### Table Definitions
1. **`projects`**: Top-level customer record, address, contact info, GHL identifiers.
2. **`proposals`**: Proposal record tracking version, status, financial aggregates (subtotal, cost, margin, tax, grand total).
3. **`proposal_zones`**: Spatial grouping of work (e.g., "Front Yard Xeriscape", "Backyard Paver Patio & Fire Pit").
4. **`proposal_items`**: Atomic bill of materials and labor item linked to Master Catalog SKU with unit cost, unit price, quantity, and status.
5. **`proposal_discrepancies`**: Unresolved field note ambiguities, access limitations, or missing measurements.
6. **`proposal_versions`**: Immutable JSON snapshot of entire proposal hierarchy saved upon each major state change or approval.
7. **`audit_logs`**: Append-only log recording actor, action, proposal ID, previous state, new state, and metadata.
8. **`integration_events`**: Outbox pattern table recording webhook dispatches, status, retry counts, and payloads.

---

## 4. Integration Outbox & Resilience

External integrations (Slack, GoHighLevel) utilize an **Outbox Pattern**:
- **Non-blocking Execution**: Approval transactions succeed immediately in the primary database. Webhook failures do not block the user interface or roll back approved proposals.
- **Circuit Breakers & Exponential Backoff**: Webhook dispatchers retry transient HTTP failures up to 3 times with exponential backoff (1s, 2s, 4s).
- **Graceful Degradation**: If webhooks are unconfigured or fail permanently, events are recorded with `FAILED` status in the integration event log for manual retry.

---

## 5. Security & Threat Model

| Threat | Mitigation Architecture |
| :--- | :--- |
| **Prompt Injection / Instruction Override** | Dual-delimiter boundary (`<untrusted_site_notes>`), server-side regex threat scanner, zero-dollar system prompt instructions. |
| **Price Tampering via AI** | Output sanitization stripping all dollar tokens; pricing engine derives 100% of figures from database catalog. |
| **Unauthorized Low-Margin Approvals** | Server-side role validation checking `UserRole` and `MARGIN_FLOOR_PERCENT` threshold before status mutation. |
| **Concurrent Edit Overwrites** | In-flight proposal mutex locks and optimistic version sequencing. |
| **Database Injection & Data Leakage** | Parameterized queries, schema sanitization, and PII masking in logs. |
