import { getEnv } from '@/lib/env';

/** ParamHTTP interface type (Java `Standards.INTERFACE_PARAM_HTTP`). */
export const INTERFACE_PARAM_HTTP =
  'ivo://ivoa.net/vospace/core#paramhttp';

export function normalizeRegistryBaseUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
}

/** Registry base URLs (Java `RegistryClient` `baseURL` list). */
export function getRegistryBaseUrls(): string[] {
  const raw = getEnv('REGISTRY_URLS');
  if (!raw) return [];
  return raw
    .split(',')
    .map(normalizeRegistryBaseUrl)
    .filter(Boolean);
}

/** Max wait for the Registry HTTP response to start (TCP/TLS + headers). */
export function registryConnectionTimeoutMs(): number {
  return parsePositiveInt(getEnv('REGISTRY_CONNECTION_TIMEOUT_MS'), 3000);
}

/** Max wait to read the full response body after the response has started. */
export function registryReadTimeoutMs(): number {
  return parsePositiveInt(getEnv('REGISTRY_READ_TIMEOUT_MS'), 6000);
}

export function registryCapabilitiesReadTimeoutMs(): number {
  return registryReadTimeoutMs() * 5;
}

export function registryMaxRetries(): number {
  return parsePositiveInt(getEnv('REGISTRY_MAX_RETRIES'), 1);
}

export function registryQueryCacheTtlMs(): number {
  const seconds = parsePositiveInt(getEnv('REGISTRY_CACHE_TTL_SECONDS'), 1800);
  return seconds * 1000;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) || n < 0 ? fallback : n;
}
