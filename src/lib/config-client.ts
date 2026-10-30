import { withBasePath } from '@/lib/env-client';
import type { PublicConfig } from '@/lib/public-config';

export const publicConfigQueryKey = ['public-config'] as const;

export async function fetchPublicConfig(signal?: AbortSignal): Promise<PublicConfig> {
  const response = await fetch(withBasePath('/api/v1/config'), {
    credentials: 'same-origin',
    signal,
    cache: 'no-store',
  });
  const body = (await response.json().catch(() => ({}))) as PublicConfig & { message?: string };
  if (!response.ok) {
    throw new Error(body.message || response.statusText || `HTTP ${response.status}`);
  }
  return body;
}
