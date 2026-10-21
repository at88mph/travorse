# ADR 0005: Auth.js session cookie; no client-side tokens

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Related** | [SPECIFICATION.md §5.1.1](../SPECIFICATION.md), Science Portal `auth.ts`, ADR-0008 |

## Context

Legacy `storage-ui` stored OIDC access tokens in **Redis**, with the browser holding only an opaque cookie lookup key — to keep tokens out of JavaScript.

Science Portal OIDC mode uses **NextAuth** with tokens in an **httpOnly session cookie** (JWT strategy); the BFF calls `auth()` server-side. Science Portal currently exposes `accessToken` on the client session object; Storage UI should be stricter.

Options: (a) Redis token store like legacy Java; (b) Auth.js JWT session cookie, BFF-only Bearer; (c) localStorage Bearer (Science Portal CANFAR mode — not applicable).

## Decision

Align with **Science Portal OIDC BFF pattern**:

- Store access and refresh tokens in the **Auth.js encrypted/signed session cookie** (httpOnly)
- Route Handlers obtain Bearer tokens via **`await auth()`** only; browser **must not** send `Authorization` from JavaScript
- **Do not** expose `accessToken` or `refreshToken` in `/api/auth/session` JSON or client-visible session state
- **Do not** use Redis for OIDC tokens in v1 (legacy `tokenCache.url` pattern is out of scope)

## Consequences

- **Positive:** No tokens in `localStorage`; consistent with suite BFF practice; no Redis required for auth by default.
- **Negative:** Multi-replica deployments need sticky sessions or serialized refresh (Science Portal documented pattern); cookie size limits apply to JWT payload.
- **Follow-up:** Document ingress stickiness in Helm when `replicaCount > 1` (spec §5.1.1).
