import { getEnv } from '@/lib/env';

/** VOSpace capability flags for this deployment (spec §4.1). */
export interface VospaceFeatures {
  externalLinks: boolean;
  paging: boolean;
}

function parseBoolEnv(name: string, fallback: boolean): boolean {
  const raw = getEnv(name);
  if (raw === undefined) return fallback;
  const lower = raw.toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return true;
  if (lower === 'false' || lower === '0' || lower === 'no') return false;
  return fallback;
}

/** Server-side feature flags from env / Helm. */
export function getVospaceFeatures(): VospaceFeatures {
  return {
    externalLinks: parseBoolEnv('VOSPACE_FEATURE_EXTERNAL_LINKS', false),
    paging: parseBoolEnv('VOSPACE_FEATURE_PAGING', false),
  };
}
