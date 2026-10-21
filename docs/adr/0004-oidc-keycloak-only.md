# ADR 0004: OIDC via Keycloak only

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Related** | [SPECIFICATION.md §5.1](../SPECIFICATION.md) |

## Context

CANFAR is transitioning from **legacy SSO cookies** to **Keycloak** with OpenID Connect. The new Storage UI is not expected to ship until after that transition. Legacy `storage-ui` supports both SSO cookie re-targeting and OIDC with a Redis token cache.

## Decision

Support **OIDC only** (Keycloak as IdP). **Do not** implement:

- CADC SSO domain cookie authentication
- Cookie re-targeting to VOSpace hosts (`SSOCookieCredential` pattern)
- Dual auth modes or certificate-only browser login in v1

Use NextAuth v5 against the deployment’s Keycloak realm (Science Portal OIDC mode).

## Consequences

- **Positive:** One auth path for operators and developers; matches platform direction.
- **Negative:** Cannot deploy this UI against environments that have not migrated off SSO cookies.
- **Follow-up:** Register redirect URIs per deployment URL pattern (spec §4.6).
