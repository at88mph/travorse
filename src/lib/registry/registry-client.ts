import {
  getRegistryBaseUrls,
  INTERFACE_PARAM_HTTP,
  registryCapabilitiesReadTimeoutMs,
  registryConnectionTimeoutMs,
  registryMaxRetries,
  registryQueryCacheTtlMs,
  registryReadTimeoutMs,
} from '@/lib/registry/registry-config';
import { getSingleProperty, parseJavaProperties } from '@/lib/registry/properties';
import { fetchCachedText } from '@/lib/registry/query-cache';

/** Canned Registry queries (Java `RegistryClient.Query`). */
export enum RegistryQuery {
  APPLICATIONS = 'applications',
  CAPABILITIES = 'resource-caps',
}

export class ResourceNotFoundError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ResourceNotFoundError';
  }
}

/**
 * TypeScript Registry client aligned with OpenCADC
 * {@link https://github.com/opencadc/reg/blob/main/cadc-registry/src/main/java/ca/nrc/cadc/reg/client/RegistryClient.java RegistryClient}.
 */
export class RegistryClient {
  private readonly regBaseUrls: string[];

  constructor(baseUrls: string[] = getRegistryBaseUrls()) {
    this.regBaseUrls = baseUrls.map((u) => u.replace(/\/+$/, ''));
  }

  /** Backwards-compatible alias for {@link getAccessURL} with CAPABILITIES. */
  async getAccessURLForResource(resourceId: string): Promise<string> {
    return this.getAccessURL(RegistryQuery.CAPABILITIES, resourceId);
  }

  /**
   * Resolve an access URL from a Registry canned query map (`resource-caps` or `applications`).
   */
  async getAccessURL(query: RegistryQuery, uri: string): Promise<string> {
    if (this.regBaseUrls.length === 0) {
      throw new Error('Registry base URL list is empty');
    }

    const errors: unknown[] = [];
    for (const regBaseURL of this.regBaseUrls) {
      try {
        const queryURL = `${regBaseURL}/${query}`;
        const cacheKey = `${regBaseURL}:${query}`;
        const mapText = await fetchCachedText(
          cacheKey,
          queryURL,
          registryQueryCacheTtlMs(),
          {
            connectionMs: registryConnectionTimeoutMs(),
            readMs: registryReadTimeoutMs(),
          },
          registryMaxRetries(),
        );
        const map = parseJavaProperties(mapText);
        const accessUrl = getSingleProperty(map, uri);
        new URL(accessUrl);
        return accessUrl;
      } catch (err) {
        errors.push(err);
      }
    }

    throw new ResourceNotFoundError(
      `Failed to find registry resource for [${query}][${uri}]`,
      { cause: errors[0] },
    );
  }

  async getCapabilitiesXml(resourceId: string): Promise<string> {
    const serviceCapsURL = await this.getAccessURL(RegistryQuery.CAPABILITIES, resourceId);
    const cacheKey = `caps:${serviceCapsURL}`;
    return fetchCachedText(
      cacheKey,
      serviceCapsURL,
      registryQueryCacheTtlMs(),
      {
        connectionMs: registryConnectionTimeoutMs(),
        readMs: registryCapabilitiesReadTimeoutMs(),
      },
      registryMaxRetries(),
    );
  }

  /**
   * Resolve a service access URL for a capability standard on a resource
   * (Java `getServiceURL(resourceID, standardID, interfaceType)`).
   */
  async getServiceURL(
    resourceId: string,
    standardId: string,
    interfaceType: string = INTERFACE_PARAM_HTTP,
  ): Promise<string | null> {
    try {
      const xml = await this.getCapabilitiesXml(resourceId);
      return findInterfaceAccessUrl(xml, standardId, interfaceType);
    } catch (err) {
      if (err instanceof ResourceNotFoundError) return null;
      throw err;
    }
  }
}

function findInterfaceAccessUrl(
  capabilitiesXml: string,
  standardId: string,
  interfaceType: string,
): string | null {
  const capabilityBlocks = capabilitiesXml.match(/<capability\b[\s\S]*?<\/capability>/gi) ?? [];
  for (const block of capabilityBlocks) {
    const standardMatch = block.match(/\bstandardID\s*=\s*["']([^"']+)["']/i);
    if (!standardMatch || standardMatch[1] !== standardId) continue;

    const interfaces = block.match(/<interface\b[\s\S]*?<\/interface>/gi) ?? [];
    for (const iface of interfaces) {
      if (!interfaceBlockMatchesType(iface, interfaceType)) continue;
      const urlMatch = iface.match(/<accessURL[^>]*>([^<]+)<\/accessURL>/i);
      if (urlMatch?.[1]) return urlMatch[1].trim();
    }
  }
  return null;
}

function interfaceBlockMatchesType(block: string, interfaceType: string): boolean {
  if (block.includes(interfaceType)) return true;
  const xsiType = block.match(/\bxsi:type\s*=\s*["']([^"']+)["']/i)?.[1];
  if (xsiType && (interfaceType.endsWith('ParamHTTP') || interfaceType.includes('paramhttp'))) {
    return xsiType.includes('ParamHTTP');
  }
  return false;
}
