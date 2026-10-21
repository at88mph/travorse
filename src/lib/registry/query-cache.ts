interface CacheEntry {
  body: string;
  fetchedAt: number;
}

const store = new Map<string, CacheEntry>();

export async function fetchCachedText(
  cacheKey: string,
  url: string,
  ttlMs: number,
  timeoutMs: number,
  maxRetries: number,
): Promise<string> {
  const now = Date.now();
  const hit = store.get(cacheKey);
  if (hit && now - hit.fetchedAt < ttlMs) {
    return hit.body;
  }

  let lastError: unknown;
  const attempts = Math.max(1, maxRetries + 1);
  for (let i = 0; i < attempts; i++) {
    try {
      const body = await fetchText(url, timeoutMs);
      store.set(cacheKey, { body, fetchedAt: Date.now() });
      return body;
    } catch (err) {
      lastError = err;
    }
  }

  if (hit) return hit.body;
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export function clearRegistryQueryCache(): void {
  store.clear();
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'text/plain,*/*' },
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}
