/** Client-safe base path (NEXT_PUBLIC_* only). */

export function normalizedBasePath(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  if (!raw || raw === '/') return '';
  return raw.startsWith('/') ? raw.replace(/\/$/, '') : `/${raw.replace(/\/$/, '')}`;
}

export function authApiBasePath(): string {
  const base = normalizedBasePath();
  return base ? `${base}/api/auth` : '/api/auth';
}
