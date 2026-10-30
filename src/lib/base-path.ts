/**
 * Application context path (Next.js `basePath`), from `NEXT_PUBLIC_BASE_PATH`.
 * Set at build time for client bundles; Helm / `.env.local` must match the image build.
 */

export function normalizedBasePath(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  if (!raw || raw === '/') return '';
  return raw.startsWith('/') ? raw.replace(/\/$/, '') : `/${raw.replace(/\/$/, '')}`;
}

/** Auth.js route prefix, including context path when configured. */
export function authApiBasePath(): string {
  const base = normalizedBasePath();
  return base ? `${base}/api/auth` : '/api/auth';
}

/** Prefix an app-relative path (`/browse`, `/api/…`) with the context path. */
export function withBasePath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = normalizedBasePath();
  return base ? `${base}${normalized}` : normalized;
}
