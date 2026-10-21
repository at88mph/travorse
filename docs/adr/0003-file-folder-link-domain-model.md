# ADR 0003: File, folder, and link domain model

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Related** | [SPECIFICATION.md §1.7, §6](../SPECIFICATION.md) |

## Context

IVOA VOSpace uses terms such as container, data, and link **nodes**. The legacy UI mixed filesystem language with VOSpace jargon. The replacement should feel like a storage browser, not a protocol debugger.

## Decision

Expose a **storage abstraction** to users and public APIs:

- **Folder**, **file**, and **link** with `kind: "folder" | "file" | "link"`
- Public routes use `/folders/…`, `/files/…`, `/entries/…`, `/links/…` — never `node`
- BFF maps to VOSpace internally only (implementer appendix spec §8)

## Consequences

- **Positive:** Clear product language; JSON API matches user mental model; intentional departure from legacy CSV/listing shape.
- **Negative:** No drop-in compatibility with old `/storage/*` connector names; historical mapping remains in spec §9 for reference only.
- **Follow-up:** Internal TypeScript may use `vospaceNode` in private modules; lint/review to prevent leakage into client props or session JSON.
