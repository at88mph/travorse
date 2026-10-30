import { normalizedBasePath } from '@/lib/base-path';
import { getBrandingLogoUrl, getDeploymentLabel } from '@/lib/branding-config';
import { getProjectsFolderPath, getUserHomeDir } from '@/lib/deployment-config';
import { getEnv } from '@/lib/env';
import type { VospaceFeatures } from '@/lib/vospace-features';
import { getVospaceFeatures } from '@/lib/vospace-features';

/** Browser-safe deployment config (spec §4.4). */
export interface PublicConfig {
  deploymentLabel?: string;
  nodeUriPrefix: string;
  userHomeDir: string;
  projectsFolderPath: string;
  groupManagementUri?: string;
  features: VospaceFeatures;
  basePath: string;
  publicOrigin?: string;
  logoUrl?: string;
}

export function buildPublicConfig(): PublicConfig {
  const uriPrefix = getEnv('VOSPACE_URI') ?? '';
  const config: PublicConfig = {
    nodeUriPrefix: uriPrefix,
    userHomeDir: getUserHomeDir(),
    projectsFolderPath: getProjectsFolderPath(),
    features: getVospaceFeatures(),
    basePath: normalizedBasePath(),
  };

  const label = getDeploymentLabel();
  if (label) config.deploymentLabel = label;

  const groupUri = getEnv('GROUP_MANAGEMENT_URI');
  if (groupUri) config.groupManagementUri = groupUri;

  const publicOrigin = getEnv('AUTH_URL');
  if (publicOrigin) config.publicOrigin = publicOrigin;

  try {
    const logo = getBrandingLogoUrl();
    if (logo) config.logoUrl = logo;
  } catch {
    // Omit invalid logo from public config.
  }

  return config;
}
