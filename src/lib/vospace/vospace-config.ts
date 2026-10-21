import { getEnv } from '@/lib/env';
import { RegistryClient } from '@/lib/registry';
import {
  VOSpaceClient,
  type VOSpaceClientOptions,
} from './vospace-client';

/** Configured `vos://` prefix (`VOSPACE_URI`), if set. */
export function getVospaceUri(): string | undefined {
  return getEnv('VOSPACE_URI');
}

/**
 * Client for this deployment's VOSpace.
 * `VOSPACE_URI` is the only service binding; the `ivo://` resource id is derived from it.
 */
export function createVospaceClient(
  accessToken?: string,
  overrides?: Partial<Pick<VOSpaceClientOptions, 'fetchImpl' | 'requestTimeoutMs' | 'services'>>,
): VOSpaceClient {
  const uriPrefix = getVospaceUri();
  if (!uriPrefix) {
    throw new Error('Missing required environment variable: VOSPACE_URI');
  }
  return new VOSpaceClient({
    uriPrefix,
    services: overrides?.services ?? new RegistryClient(),
    accessToken,
    fetchImpl: overrides?.fetchImpl,
    requestTimeoutMs: overrides?.requestTimeoutMs,
  });
}
