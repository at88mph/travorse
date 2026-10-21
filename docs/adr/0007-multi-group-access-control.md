# ADR 0007: Multi-group access control on entries

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Related** | [SPECIFICATION.md §6.10](../SPECIFICATION.md) |

## Context

VOSpace supports **multiple** read-only and read-write groups on a resource. Legacy `storage-ui` JSON for permission updates used single `readGroup` / `writeGroup` strings in the API, which under-represented backend capabilities even when the data model held arrays internally.

## Decision

The public API and UI treat access control as **lists**:

- `readGroups[]` and `writeGroups[]` on every `StorageEntry`
- `PATCH /api/v1/entries/{path}/access` replaces full group lists per category (Phase 2)
- UI: multi-select or chips for read and read/write groups

Map to VOSpace group collections on the underlying resource (full replace on write — spec §8.3).

## Consequences

- **Positive:** Product improvement over legacy UI; matches VOSpace semantics.
- **Negative:** Not backward-compatible with old single-group POST bodies; migration is greenfield (sunset Java app).
- **Follow-up:** Truncate long group lists in table columns with expand/tooltip (spec §6.10).
