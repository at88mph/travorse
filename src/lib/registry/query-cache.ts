interface CacheEntry {
  body: string;
  fetchedAt: number;
}

const store = new Map<string, CacheEntry>();

/** Aligns with Java RegistryClient connection vs read timeouts. */
export interface RegistryFetchTimeouts {
  connectionMs: number;
  readMs: number;
}

export async function fetchCachedText(
  cacheKey: string,
  url: string,
  ttlMs: number,
  timeouts: RegistryFetchTimeouts,
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
      const body = await fetchText(url, timeouts);
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

/**
 * Fetch URL text with separate limits: fail if the response has not started within
 * `connectionMs`, then fail if the body is not fully read within `readMs`.
 */
async function fetchText(url: string, timeouts: RegistryFetchTimeouts): Promise<string> {
  const controller = new AbortController();
  const connectionMs = Math.max(0, timeouts.connectionMs);
  const readMs = Math.max(0, timeouts.readMs);

  let connectionTimer: ReturnType<typeof setTimeout> | undefined;
  let readTimer: ReturnType<typeof setTimeout> | undefined;
  let timedOutPhase: 'connection' | 'read' | null = null;

  try {
    connectionTimer = setTimeout(() => {
      timedOutPhase = 'connection';
      controller.abort();
    }, connectionMs);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'text/plain,*/*' },
      cache: 'no-store',
    });
    clearTimeout(connectionTimer);
    connectionTimer = undefined;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`);
    }

    readTimer = setTimeout(() => {
      timedOutPhase = 'read';
      controller.abort();
    }, readMs);
    const text = await response.text();
    clearTimeout(readTimer);
    readTimer = undefined;
    return text;
  } catch (err) {
    if (timedOutPhase) {
      const limit = timedOutPhase === 'connection' ? connectionMs : readMs;
      throw new Error(
        `Registry ${timedOutPhase} timed out after ${limit}ms fetching ${url}`,
        { cause: err },
      );
    }
    throw err;
  } finally {
    if (connectionTimer !== undefined) clearTimeout(connectionTimer);
    if (readTimer !== undefined) clearTimeout(readTimer);
  }
}
