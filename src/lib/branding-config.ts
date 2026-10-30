import { getEnv } from '@/lib/env';

/** Optional HTTPS/HTTP logo URL for header branding. Invalid values are omitted. */
export function getBrandingLogoUrl(): string | undefined {
  const raw = getEnv('BRANDING_LOGO_URL');
  if (!raw) return undefined;
  return validateHttpLogoUrl(raw);
}

export function getDeploymentLabel(): string | undefined {
  return getEnv('DEPLOYMENT_LABEL');
}

/** @throws when URL scheme is not http(s) */
export function validateHttpLogoUrl(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid BRANDING_LOGO_URL: not a URL (${trimmed})`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Invalid BRANDING_LOGO_URL: scheme must be http or https (${parsed.protocol})`);
  }
  return parsed.href;
}
