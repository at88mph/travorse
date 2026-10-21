# ADR 0002: Single VOSpace per deployment

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Related** | [SPECIFICATION.md §1.6, §4.6](../SPECIFICATION.md) |

## Context

Legacy `storage-ui` supports **multiple** VOSpace backends (for example Cavern and Vault) in one WAR via a service dropdown and `/{svc}/…` URL prefixes.

The new platform model co-locates one Storage UI instance with **one** VOSpace service. Users reach another backend by visiting another deployment URL (hostname or path prefix — operator choice).

## Decision

Each deployment binds to **exactly one** VOSpace `resourceID` and feature set. Remove:

- In-app service selector
- `service=` query parameter on APIs
- Multi-entry `services` config in a single instance

Deploy **separate Helm releases** (or containers) per backend, each with its own public URL and OIDC redirect URIs.

## Consequences

- **Positive:** Simpler config, UI, and mental model; matches co-located VOSpace deployments.
- **Negative:** More deployments to operate when many backends exist; Science Portal and docs must link to the correct URL per environment.
- **Follow-up:** Document hostname vs path-prefix routing in operator runbooks when the platform standard is fixed (spec §4.6).
