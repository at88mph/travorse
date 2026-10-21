import { getEnv, requireEnv } from '@/lib/env';

export interface OidcConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  scope: string;
}

export function normalizeIssuer(issuer: string): string {
  const url = new URL(issuer.trim());
  url.pathname = url.pathname.replace(/\/+/g, '/') || '/';
  return url.href;
}

export function tokenEndpoint(issuer: string): string {
  return new URL('protocol/openid-connect/token', normalizeIssuer(issuer)).href;
}

/**
 * OIDC settings for Keycloak or any OIDC-compliant IdP.
 * @param allowBuildDummy - use placeholders during `next build` when secrets are not injected
 */
export function getOidcConfig(allowBuildDummy = false): OidcConfig {
  const issuer = getEnv('OIDC_ISSUER');
  const clientId = getEnv('OIDC_CLIENT_ID');
  const clientSecret = getEnv('OIDC_CLIENT_SECRET') ?? '';
  const scope = getEnv('OIDC_SCOPE') ?? 'openid profile email offline_access';

  if (issuer && clientId) {
    return {
      issuer: normalizeIssuer(issuer),
      clientId,
      clientSecret,
      scope,
    };
  }

  if (allowBuildDummy) {
    return {
      issuer: normalizeIssuer(issuer ?? 'https://example.com/realms/demo'),
      clientId: clientId ?? 'build-client',
      clientSecret: clientSecret || 'build-secret',
      scope,
    };
  }

  return {
    issuer: normalizeIssuer(requireEnv('OIDC_ISSUER')),
    clientId: requireEnv('OIDC_CLIENT_ID'),
    clientSecret,
    scope,
  };
}

export function accessTokenRefreshMarginMs(): number {
  const raw = getEnv('OIDC_ACCESS_TOKEN_REFRESH_MARGIN_MS');
  if (!raw) return 5 * 60 * 1000;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) || n < 0 ? 5 * 60 * 1000 : n;
}
