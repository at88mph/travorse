/** Server-only environment helpers. */

export function getEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export function requireEnv(name: string, allowBuildDummy = false): string {
  const value = getEnv(name);
  if (value) return value;

  if (allowBuildDummy && process.env.NEXT_PHASE === 'phase-production-build') {
    return 'build-placeholder';
  }

  throw new Error(`Missing required environment variable: ${name}`);
}

export function normalizedBasePath(): string {
  const raw = getEnv('NEXT_PUBLIC_BASE_PATH') ?? '';
  if (!raw || raw === '/') return '';
  return raw.startsWith('/') ? raw.replace(/\/$/, '') : `/${raw.replace(/\/$/, '')}`;
}

export function authApiBasePath(): string {
  const base = normalizedBasePath();
  return base ? `${base}/api/auth` : '/api/auth';
}
