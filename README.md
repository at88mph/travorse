# Travorse

IVOA VOSpace browser for the CANFAR Science Platform — replacement for the sunset Java [`storage-ui`](https://github.com/opencadc/storage-ui).

**Repository root:** this directory (`travorse`). The former working name and path `user-storage-app` under `opencadc/` is **retired**; do not reference it in docs, CI, or deployment config.

### Cursor / VS Code workspace

Open **`travorse` as the workspace root** (not the parent `at88mph` folder):

- **File → Open Folder…** → select this `travorse` directory, or  
- **File → Open Workspace from File…** → `travorse.code-workspace` in this repo.

The file tree should show `src/`, `helm/`, and `docs/` at the top level.

## Status

Next.js scaffold with Keycloak/OIDC sign-in. Storage browse API and UI are in progress; see [docs/SPECIFICATION.md](./docs/SPECIFICATION.md).

### Local development

```bash
cp .env.example .env.local
# Set AUTH_SECRET (openssl rand -base64 32) and OIDC_* for your Keycloak client
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Register redirect URI in Keycloak:

`http://localhost:3000/api/auth/callback/oidc` (prepend `NEXT_PUBLIC_BASE_PATH` if set).

### Helm

Deploy-time settings use top-level **`application`** in [`helm/values.yaml`](./helm/values.yaml): **`application.auth`**, **`application.publicUrl`**, **`application.basePath`** (context path / `NEXT_PUBLIC_BASE_PATH`), **`application.registry.urls`**, and **`application.vospace.uri`** (`vos://` prefix). See spec §4.3 and §4.6.

When using a path prefix, build the container image with the same `NEXT_PUBLIC_BASE_PATH` as Helm `application.basePath`, and register OIDC redirect URIs under that prefix (for example `{origin}{basePath}/api/auth/callback/oidc`).

## Documentation

- **[Specification](./docs/SPECIFICATION.md)** — architecture, API, configuration, phased delivery
- **[ADRs](./docs/adr/README.md)** — architecture decision records (0001–0008)

## Related services

| Service | Role |
|---------|------|
| VOSpace (one per deployment) | Node storage, transfers, permissions |
| IVOA Registry | Resolve service resource IDs to HTTPS endpoints |
| Group Management (GMS) | Group names for permission editing |
| Keycloak (OIDC) | Authentication via NextAuth |

## License

See [LICENSE](./LICENSE).
