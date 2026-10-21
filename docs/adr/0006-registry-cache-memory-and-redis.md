# ADR 0006: Registry endpoint cache (memory default; optional Redis)

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Related** | [SPECIFICATION.md §3, §3.8](../SPECIFICATION.md) |

## Context

Every VOSpace operation requires HTTPS base URLs from the IVOA Registry (`RegistryClient.getServiceURL`). Browser traffic must not trigger a Registry HTTP call on every list, upload, or download.

Legacy deployments did not centralize this requirement in product docs; the new spec makes TTL caching normative.

## Decision

Implement a **Registry endpoint cache** with:

1. **Required:** process-local LRU keyed by `(resourceID, standardURI, authMethod)`
2. **Optional (deployer):** Redis via `REGISTRY_CACHE_REDIS_URL` for shared cache when `replicaCount > 1`
3. **Default:** Redis **disabled** — memory only
4. Configurable TTL (`REGISTRY_CACHE_TTL_SECONDS`, suggested 30 minutes)
5. Optional ops refresh: `POST /api/admin/registry/refresh` (spec §3.5)

**Redis is for Registry URL entries only** — not OIDC tokens (ADR-0005).

## Consequences

- **Positive:** Predictable Registry load; deployer can enable Redis without changing auth.
- **Negative:** Stale URLs until TTL or manual invalidation; multi-tier cache (memory + Redis) needs clear invalidation on admin refresh.
- **Follow-up:** Unit tests assert no Registry HTTP on repeated handler calls within TTL (spec §3.6).
