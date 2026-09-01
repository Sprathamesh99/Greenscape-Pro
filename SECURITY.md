# Greenscape Pro — Security Policy & Threat Model

This document outlines the security architecture, threat model, vulnerability mitigations, and compliance safeguards implemented in the Greenscape Pro Proposal Intelligence Agent.

---

## 1. Threat Model & Defense-in-Depth

```
  [ Untrusted User Input ]
             │
             ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ 1. Express Security Headers (nosniff, XSS-Protection, CSP)  │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ 2. Scoped Middleware & Payload Size Limits (5MB cap)        │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ 3. Input Sanitization & Anti-XSS Filter (DOM & script strip)│
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ 4. Prompt Injection Scanner & Delimiter Isolation (<notes>) │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ 5. Zero-Dollar AI Directive & Output Price Stripper         │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ 6. Deterministic Pricing Engine (Database Catalog Only)    │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ 7. Role-Based Approval Gates (38% Margin Floor Check)       │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ 8. Immutable Audit Trail (PII-Safe Logging & User Context)  │
  └─────────────────────────────────────────────────────────────┘
```

---

## 2. Security Dimensions & Mitigations

### 1. Prompt Injection & Jailbreak Defense
- **Boundary Tagging**: All untrusted field notes and audio transcripts are enclosed inside `<untrusted_site_notes> ... </untrusted_site_notes>` tags.
- **Delimiter Stripping**: The input scanner removes any attempts by malicious users to inject synthetic closing tags (e.g. `</untrusted_site_notes>`).
- **Signature Threat Detection**: Automated regex detection flags instruction overrides (`ignore all previous instructions`), secret extraction (`reveal system prompt`), role switches (`you are now in developer mode`), and approval bypasses (`bypass approval`).

### 2. Price Manipulation & Math Integrity Defense
- **Zero-Dollar System Instruction**: The LLM prompt explicitly forbids generating currency figures, hourly labor rates, or margin numbers.
- **Output Sanitizer**: Server-side post-processing strips dollar signs, unit prices, and unit costs from the AI response before handing the structured payload to the pricing engine.
- **Authoritative Catalog**: Unit prices and unit costs are derived exclusively from the Master Catalog in the database.

### 3. Role-Based Access Control (RBAC) & Approval Gates
- **Estimator Role**: Allowed to create projects, generate proposals, edit line items, and approve proposals that satisfy the 38.0% gross margin floor with zero blocking discrepancies.
- **Senior Estimator / Owner Role**: Required for proposals with margins below 38.0%, unpriced items, unresolved discrepancies, or contract totals exceeding $50,000.
- **Audit Logging**: Every approval action records the user's role, IP address, timestamp, override justifications, and previous vs. new proposal state.

### 4. API & Infrastructure Security
- **Strict Server-Side Key Management**: `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and webhook secrets are kept strictly server-side. No API keys are exposed to the client or prefixed with `VITE_`.
- **CORS Configuration**: Restricts origin requests, headers, and methods.
- **Security Headers**: Injects `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
- **Payload Limits**: Limits JSON and URL-encoded body payloads to 5MB to prevent buffer overflow attacks.

### 5. Auditability & PII Protection
- **PII-Safe Logging**: Server logs mask sensitive client emails, phone numbers, and credentials before recording.
- **Immutable Versioning**: Every proposal modification generates an immutable snapshot record in `proposal_versions`.

---

## 3. Security Verification & Automated Audit Suite

Greenscape Pro includes an automated security audit suite executed via:
```bash
npm run test:security
```

### Verified Test Categories:
1. **Prompt Injection & Delimiter Isolation**: Verifies neutralization of instruction overrides, secret extraction attempts, and delimiter escapes.
2. **AI Output Sanitization & Pricing Isolation**: Verifies that AI outputs cannot inject currency amounts or override catalog rates.
3. **Role-Based Access Control Simulation**: Verifies that low-margin proposals (<38%) cannot be approved without senior estimator authorization.
4. **Audit Trail Immutability**: Verifies append-only logging of user context, timestamp, and field diffs.
