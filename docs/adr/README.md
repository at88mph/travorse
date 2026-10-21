# Architecture Decision Records (ADR)

Architecture Decision Records for **Travorse** (`travorse`).

The normative **what to build** lives in [../SPECIFICATION.md](../SPECIFICATION.md). ADRs record **why** major choices were made, alternatives considered, and consequences.

## Format

Each ADR includes:

- **Status** — Proposed, Accepted, Deprecated, Superseded
- **Context** — Problem or situation
- **Decision** — What we chose and why
- **Consequences** — Trade-offs and follow-up

Optional: **Related** (spec sections §N, other ADRs, Science Portal docs).

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](./0001-nextjs-bff-direct-vospace.md) | Next.js BFF with direct VOSpace integration | Accepted |
| [0002](./0002-single-vospace-per-deployment.md) | Single VOSpace per deployment | Accepted |
| [0003](./0003-file-folder-link-domain-model.md) | File, folder, and link domain model | Accepted |
| [0004](./0004-oidc-keycloak-only.md) | OIDC via Keycloak only | Accepted |
| [0005](./0005-authjs-session-no-client-tokens.md) | Auth.js session cookie; no client-side tokens | Accepted |
| [0006](./0006-registry-cache-memory-and-redis.md) | Registry endpoint cache (memory default; optional Redis) | Accepted |
| [0007](./0007-multi-group-access-control.md) | Multi-group access control on entries | Accepted |
| [0008](./0008-align-stack-with-science-portal.md) | Align stack with Science Portal | Accepted |

## Related documentation

- [Product and technical specification](../SPECIFICATION.md)
- [Science Portal ADRs](https://github.com/canfar/science-portal/tree/main/docs/adr) — sibling UI patterns (auth, state)

## Contributing

1. Copy the next sequential number (`0009`, `0010`, …).
2. Set status to **Proposed** and open a PR for review.
3. After approval, set status to **Accepted** and update this index.
4. If a decision is reversed, mark the old ADR **Superseded** and link to the replacement.
5. Link to relevant spec sections; avoid duplicating API tables from the spec.

Write an ADR when choosing between viable architectures or changing an Accepted decision. Skip ADRs for routine implementation detail already covered in the spec (§6–§7).
