# ADR 0001: Next.js BFF with direct VOSpace integration

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-10-21 |
| **Related** | [SPECIFICATION.md §2.2, §8](../SPECIFICATION.md) |

## Context

The sunset Java [`storage-ui`](https://github.com/opencadc/storage-ui) proxies VOSpace through a Tomcat WAR and Restlet resources. A replacement must serve a modern browser UI, handle OIDC, and avoid exposing Registry and VOSpace credentials to the client.

Options included: (a) Next.js UI only, reusing Java `/storage/*` APIs; (b) Next.js with a separate Node BFF service; (c) Next.js Route Handlers as an in-process BFF calling VOSpace and Registry directly.

## Decision

Implement a **Backend-for-Frontend (BFF)** as **Next.js Route Handlers** (`/api/v1/…`) that:

- Resolves service URLs via the IVOA Registry (with caching — see ADR-0006)
- Performs VOSpace node, transfer, and GMS operations server-side
- Exposes a JSON-first API and streaming upload/download to the React UI

The browser talks **only** to the same origin; it never calls VOSpace or Registry directly.

## Consequences

- **Positive:** Aligns with Science Portal deployment (Node container, single app); no Java WAR dependency; CORS and token handling stay on the server.
- **Negative:** VOSpace XML/transfer logic must be implemented in TypeScript (reference Java `VOSpaceClient` behavior, not embed the JAR).
- **Follow-up:** Optional transfer sidecar if in-process proxy limits are hit (spec §2.3 escape hatch) — document in a future ADR if needed.
