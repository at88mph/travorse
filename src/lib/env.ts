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

export { authApiBasePath, normalizedBasePath, withBasePath } from '@/lib/base-path';
