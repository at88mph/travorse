import { getEnv } from '@/lib/env';
import { normalizeIssuer } from '@/lib/oidc-config';
import { getRegistryBaseUrls } from '@/lib/registry/registry-config';

export type CheckStatus = 'ok' | 'failed' | 'skipped';

export interface ReadinessResult {
  ready: boolean;
  message?: string;
  checks: {
    authSecret: CheckStatus;
    oidcConfig: CheckStatus;
    vospaceConfig: CheckStatus;
    registryConfig: CheckStatus;
  };
}

function checkOidcConfig(): { status: CheckStatus; message?: string } {
  const issuer = getEnv('OIDC_ISSUER');
  const clientId = getEnv('OIDC_CLIENT_ID');
  if (!issuer || !clientId) {
    return { status: 'failed', message: 'OIDC_ISSUER and OIDC_CLIENT_ID are required' };
  }
  try {
    normalizeIssuer(issuer);
  } catch {
    return { status: 'failed', message: 'OIDC_ISSUER is not a valid URL' };
  }
  return { status: 'ok' };
}

function checkVospaceConfig(): CheckStatus {
  const resourceId = getEnv('VOSPACE_RESOURCE_ID');
  if (!resourceId) return 'skipped';
  return resourceId.length > 0 ? 'ok' : 'failed';
}

function checkRegistryConfig(vospaceConfigured: boolean): { status: CheckStatus; message?: string } {
  const urls = getRegistryBaseUrls();
  if (urls.length === 0) {
    if (vospaceConfigured) {
      return {
        status: 'failed',
        message: 'REGISTRY_URLS must list at least one Registry base URL when VOSPACE_RESOURCE_ID is set',
      };
    }
    return { status: 'skipped' };
  }
  for (const url of urls) {
    try {
      new URL(url);
    } catch {
      return { status: 'failed', message: `Invalid Registry URL: ${url}` };
    }
  }
  return { status: 'ok' };
}

export function evaluateReadiness(): ReadinessResult {
  const vospaceResourceId = getEnv('VOSPACE_RESOURCE_ID');
  const registry = checkRegistryConfig(Boolean(vospaceResourceId));
  const checks: ReadinessResult['checks'] = {
    authSecret: getEnv('AUTH_SECRET') ? 'ok' : 'failed',
    oidcConfig: 'failed',
    vospaceConfig: checkVospaceConfig(),
    registryConfig: registry.status,
  };

  const oidc = checkOidcConfig();
  checks.oidcConfig = oidc.status;

  const failedMessages: string[] = [];
  if (checks.authSecret === 'failed') failedMessages.push('AUTH_SECRET not configured');
  if (oidc.status === 'failed' && oidc.message) failedMessages.push(oidc.message);
  if (checks.vospaceConfig === 'failed') {
    failedMessages.push('VOSPACE_RESOURCE_ID is empty');
  }
  if (registry.status === 'failed' && registry.message) {
    failedMessages.push(registry.message);
  }

  const ready =
    checks.authSecret === 'ok' &&
    checks.oidcConfig === 'ok' &&
    checks.vospaceConfig !== 'failed' &&
    checks.registryConfig !== 'failed';

  return {
    ready,
    ...(failedMessages.length ? { message: failedMessages.join('; ') } : {}),
    checks,
  };
}
