# ADR 0008: Align stack with Science Portal

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Related** | [SPECIFICATION.md §2.1](../SPECIFICATION.md), [Science Portal](https://github.com/canfar/science-portal) |

## Context

The Storage UI is a CANFAR Science Platform suite application alongside **Science Portal**. Operators and developers already run Next.js, Harbor images, Helm, Keycloak OIDC, and shared UI patterns for the portal.

Alternatives included a Vite SPA + separate BFF or extending the Java WAR with a modern bundle.

## Decision

Adopt the **Science Portal technology baseline** for v1:

- Next.js 15 (App Router), React 19, TypeScript, Node 20 LTS
- MUI 7, Emotion; Tailwind optional
- TanStack Query for server/async state
- NextAuth v5 + Keycloak (OIDC)
- Vitest for unit/contract tests; E2E smoke (Playwright or equivalent)
- `NEXT_PUBLIC_BASE_PATH` for path-prefix deployments
- Docker `output: 'standalone'`

Reuse operational playbooks (OIDC env vars, ingress, multi-replica session notes) where applicable.

## Consequences

- **Positive:** Shared hiring, docs, and deployment skills; Science Portal as reference implementation for auth and API route patterns.
- **Negative:** Storage-specific needs (large uploads, long folder listings) must be implemented within Next constraints or trigger sidecar ADR later.
- **Follow-up:** Optional shared npm packages (`registry-resolver`, etc.) — spec §2.4, not v1 blocker.
