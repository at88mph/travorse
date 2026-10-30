import {
  NodeAlreadyExistsError,
  NodeNotFoundError,
  NodeNotSupportedError,
  NodeParsingError,
  NotAuthenticatedError,
  PermissionDeniedError,
  ServiceNotFoundError,
  VospaceError,
} from './errors';
import type { VospaceNode } from './node';
import { parseNodeXml, writeNodeXml } from './node-xml';
import { parseTransferEndpoint, writePullTransferXml } from './transfer-xml';
import {
  VOSPACE_FILES,
  VOSPACE_FILES_20,
  VOSPACE_NODES_20,
  VOSPACE_SYNC_21,
} from './standards';
import { parseVospacePrefix, VosUri } from './vos-uri';

/**
 * Resolves a capability access URL. Satisfied by `RegistryClient.getServiceURL`.
 * Current Java `RegistryClient.getServiceURL(resourceID, standardID)` does not
 * filter by auth method (that overload is deprecated); the bearer token is
 * sent on the VOSpace request itself.
 */
export interface ServiceDirectory {
  getServiceURL(
    resourceId: string,
    standardId: string,
    interfaceType?: string,
  ): Promise<string | null>;
}

export interface VOSpaceClientOptions {
  /** `vos://` prefix, for example `vos://cadc.nrc.ca~arc`. */
  uriPrefix: string;
  services: ServiceDirectory;
  /** Bearer token attached to VOSpace HTTP calls. Registry lookup stays anonymous. */
  accessToken?: string;
  fetchImpl?: typeof fetch;
  /** Default 120s. Folder listings can be slow. */
  requestTimeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Client for one VOSpace service.
 *
 * Configured with a `vos://` prefix. The Registry resource id is
 * {@link VosUri.getServiceURI} of that prefix, and the HTTPS server URL comes
 * from the nodes capability (`getBaseURL` removes a trailing `/nodes`).
 *
 * Aligned with OpenCADC
 * {@link https://github.com/opencadc/vos/blob/main/cadc-vos-client/src/main/java/org/opencadc/vospace/client/VOSpaceClient.java VOSpaceClient},
 * without the deprecated sync-2.0 fallback or auth-method URL selection.
 */
export class VOSpaceClient {
  readonly uriPrefix: VosUri;
  /** `ivo://` resource identifier derived from {@link uriPrefix}. */
  readonly resourceId: string;

  private accessToken?: string;
  private readonly services: ServiceDirectory;
  private readonly fetchImpl: typeof fetch;
  private readonly requestTimeoutMs: number;

  constructor(options: VOSpaceClientOptions) {
    this.uriPrefix = parseVospacePrefix(options.uriPrefix).toCommonForm();
    this.resourceId = this.uriPrefix.getServiceURI();
    this.services = options.services;
    this.accessToken = options.accessToken;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  setAccessToken(token: string | undefined): void {
    this.accessToken = token;
  }

  /**
   * Capability access URL for this service. Trailing slashes are removed.
   * Throws when the Registry has no matching interface.
   */
  async getServiceURL(standardId: string): Promise<string> {
    const url = await this.lookup(standardId);
    if (!url) {
      throw new ServiceNotFoundError(
        `No VOSpace service URL for ${this.resourceId} (${standardId})`,
      );
    }
    return stripTrailingSlashes(url);
  }

  /**
   * Server base URL: the nodes capability access URL with a trailing `/nodes`
   * removed. `https://example/vault/nodes` → `https://example/vault`.
   */
  async getBaseURL(): Promise<string> {
    const nodes = await this.getServiceURL(VOSPACE_NODES_20);
    return nodes.replace(/\/nodes$/, '');
  }

  /** Files endpoint. Tries the current standard, then the deprecated 2.x id. */
  async getFilesServiceURL(): Promise<string> {
    const current = await this.lookup(VOSPACE_FILES);
    if (current) return stripTrailingSlashes(current);
    const legacy = await this.lookup(VOSPACE_FILES_20);
    if (legacy) return stripTrailingSlashes(legacy);
    throw new ServiceNotFoundError(
      `No VOSpace service URL for ${this.resourceId} (${VOSPACE_FILES})`,
    );
  }

  async getSyncServiceURL(): Promise<string> {
    return this.getServiceURL(VOSPACE_SYNC_21);
  }

  /** GET a node. `path` is relative to the configured prefix; `""` is that prefix. */
  async getNode(path: string, query?: string): Promise<VospaceNode> {
    const response = await this.nodesRequest(path, 'GET', undefined, query);
    return readNodeBody(response.body);
  }

  /** PUT a node (create). */
  async createNode(path: string, node: VospaceNode): Promise<VospaceNode> {
    const target = this.resolveTarget(path);
    const response = await this.nodesRequest(path, 'PUT', writeNodeXml({ ...node, uri: target.toString() }));
    if (!response.body.trim()) return { ...node, uri: target.toString() };
    return readNodeBody(response.body);
  }

  /** POST node properties / metadata. */
  async setNode(path: string, node: VospaceNode): Promise<VospaceNode> {
    const target = this.resolveTarget(path);
    const response = await this.nodesRequest(path, 'POST', writeNodeXml({ ...node, uri: target.toString() }));
    if (!response.body.trim()) return { ...node, uri: target.toString() };
    return readNodeBody(response.body);
  }

  /** DELETE a node. Non-empty containers need the recursive-delete job, not this call. */
  async deleteNode(path: string): Promise<void> {
    await this.nodesRequest(path, 'DELETE');
  }

  /** Registry Files base URL + node path (anonymous redirect only; no bearer on browser follow). */
  async getFileDownloadURL(relativePath: string): Promise<string> {
    const target = this.resolveTarget(relativePath);
    const filesUrl = await this.getFilesServiceURL();
    return buildServiceEndpoint(filesUrl, target.path);
  }

  /**
   * Negotiate a pre-authenticated HTTPS GET URL via sync-2.1 (storage-ui
   * `FileItemServerResource.toEndpoint` for token auth).
   */
  async negotiatePullDownloadEndpoint(relativePath: string): Promise<string> {
    const target = this.resolveTarget(relativePath);
    const syncUrl = await this.getSyncServiceURL();
    const transferXml = writePullTransferXml(target.toString());
    const jobUrl = await this.postSyncTransferForJobUrl(syncUrl, transferXml);
    return this.resolvePullEndpointFromJobUrl(jobUrl, syncUrl);
  }

  /** Resolve redirect URL for browser download (pre-auth when bearer present). */
  async resolveBrowserDownloadURL(relativePath: string): Promise<string> {
    if (this.accessToken) {
      return this.negotiatePullDownloadEndpoint(relativePath);
    }
    return this.getFileDownloadURL(relativePath);
  }

  /** PUT file bytes to the Files capability after the data node exists. */
  async putFileStream(relativePath: string, body: BodyInit, contentType?: string): Promise<void> {
    const target = this.resolveTarget(relativePath);
    const filesUrl = await this.getFilesServiceURL();
    const url = buildServiceEndpoint(filesUrl, target.path);
    const headers: Record<string, string> = { Accept: '*/*' };
    if (contentType) headers['Content-Type'] = contentType;
    if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        method: 'PUT',
        headers,
        body,
        cache: 'no-store',
        redirect: 'manual',
        signal: controller.signal,
      });
      if (response.status >= 200 && response.status < 300) return;
      const text = await response.text();
      throw vospaceHttpError(response.status, text);
    } catch (err) {
      if (err instanceof VospaceError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new VospaceError(`PUT ${url} timed out after ${this.requestTimeoutMs}ms`, { cause: err });
      }
      throw new VospaceError(`PUT ${url} failed`, { cause: err });
    } finally {
      clearTimeout(timer);
    }
  }

  private async lookup(standardId: string): Promise<string | null> {
    return this.services.getServiceURL(this.resourceId, standardId);
  }

  private resolveTarget(pathOrUri: string): VosUri {
    if (pathOrUri.startsWith('vos://')) {
      const vos = new VosUri(pathOrUri).toCommonForm();
      if (vos.authority !== this.uriPrefix.authority) {
        throw new VospaceError(
          `VOS URI ${pathOrUri} is not in ${this.uriPrefix.getPrefix()}`,
        );
      }
      if (this.uriPrefix.path && vos.path !== this.uriPrefix.path && !vos.path.startsWith(`${this.uriPrefix.path}/`)) {
        throw new VospaceError(
          `VOS URI ${pathOrUri} is outside the configured prefix ${this.uriPrefix.toString()}`,
        );
      }
      return vos;
    }
    return this.uriPrefix.resolve(pathOrUri);
  }

  private async nodesRequest(
    path: string,
    method: string,
    body?: string,
    query?: string,
  ): Promise<{ status: number; body: string }> {
    const target = this.resolveTarget(path);
    const nodesUrl = await this.getServiceURL(VOSPACE_NODES_20);
    const url = buildServiceEndpoint(nodesUrl, target.path, query);
    return this.send(url, method, body);
  }

  private authHeaders(accept: string): Record<string, string> {
    const headers: Record<string, string> = { Accept: accept };
    if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;
    return headers;
  }

  private async postSyncTransferForJobUrl(syncUrl: string, transferXml: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const response = await this.fetchImpl(syncUrl, {
        method: 'POST',
        headers: {
          ...this.authHeaders('text/xml, application/xml;q=0.9'),
          'Content-Type': 'text/xml; charset=UTF-8',
        },
        body: transferXml,
        cache: 'no-store',
        redirect: 'manual',
        signal: controller.signal,
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          throw new VospaceError(`Sync transfer POST returned ${response.status} without Location`);
        }
        return new URL(location, syncUrl).toString();
      }
      const text = await response.text();
      throw vospaceHttpError(response.status, text);
    } catch (err) {
      if (err instanceof VospaceError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new VospaceError(`POST ${syncUrl} timed out after ${this.requestTimeoutMs}ms`, { cause: err });
      }
      throw new VospaceError(`POST ${syncUrl} failed`, { cause: err });
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * After sync POST, GET the job URL with the bearer token and follow sync/UWS
   * redirects on the server (Java {@code HttpGet} with followRedirects). Only
   * hand a URL to the browser when it is not another negotiation/job resource.
   */
  private async resolvePullEndpointFromJobUrl(jobUrl: string, syncUrl: string): Promise<string> {
    let url = jobUrl;
    for (let hop = 0; hop < 8; hop++) {
      const response = await this.getSyncTransferJobResponse(url);
      if (response.status >= 300 && response.status < 400) {
        const next = locationFromRedirect(response, url);
        if (!isTransferNegotiationUrl(next, syncUrl)) {
          return next;
        }
        url = next;
        continue;
      }
      const text = await response.text();
      if (response.status >= 200 && response.status < 300) {
        const endpoint = parseTransferEndpoint(text);
        if (!endpoint) {
          throw new VospaceError('VOSpace sync transfer did not return a download endpoint');
        }
        if (!isTransferNegotiationUrl(endpoint, syncUrl)) {
          return endpoint;
        }
        url = endpoint;
        continue;
      }
      throw vospaceHttpError(response.status, text);
    }
    throw new VospaceError('Sync transfer negotiation exceeded redirect limit');
  }

  private async getSyncTransferJobResponse(url: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      return await this.fetchImpl(url, {
        method: 'GET',
        headers: this.authHeaders('text/xml, application/xml;q=0.9'),
        cache: 'no-store',
        redirect: 'manual',
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof VospaceError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new VospaceError(`GET ${url} timed out after ${this.requestTimeoutMs}ms`, { cause: err });
      }
      throw new VospaceError(`GET ${url} failed`, { cause: err });
    } finally {
      clearTimeout(timer);
    }
  }

  private async send(
    url: string,
    method: string,
    body?: string,
  ): Promise<{ status: number; body: string }> {
    const headers: Record<string, string> = {
      Accept: 'text/xml, application/xml;q=0.9, */*;q=0.1',
    };
    if (body !== undefined) headers['Content-Type'] = 'text/xml; charset=UTF-8';
    if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        method,
        headers,
        body,
        cache: 'no-store',
        signal: controller.signal,
        redirect: 'manual',
      });
      const text = await response.text();
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        throw new VospaceError(
          `Unexpected redirect from VOSpace${location ? ` to ${location}` : ''} (HTTP ${response.status})`,
          { status: response.status },
        );
      }
      if (response.status >= 200 && response.status < 300) {
        return { status: response.status, body: text };
      }
      throw vospaceHttpError(response.status, text);
    } catch (err) {
      if (err instanceof VospaceError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new VospaceError(`${method} ${url} timed out after ${this.requestTimeoutMs}ms`, {
          cause: err,
        });
      }
      throw new VospaceError(`${method} ${url} failed`, { cause: err });
    } finally {
      clearTimeout(timer);
    }
  }
}

export function buildServiceEndpoint(serviceUrl: string, decodedPath: string, query?: string): string {
  const base = stripTrailingSlashes(serviceUrl);
  const encoded = decodedPath
    .split('/')
    .map((segment, index) => (index === 0 ? segment : encodeURIComponent(segment)))
    .join('/');
  let url = `${base}${encoded}`;
  if (query) {
    const q = query.replace(/^\?/, '');
    if (q) url += `?${q}`;
  }
  return url;
}

function locationFromRedirect(response: Response, baseUrl: string): string {
  const location = response.headers.get('location');
  if (!location) {
    throw new VospaceError(`Sync transfer job returned ${response.status} without Location`);
  }
  return new URL(location, baseUrl).toString();
}

/** URLs that must be fetched with the bearer token, not opened in the browser. */
function isTransferNegotiationUrl(candidate: string, syncUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return true;
  }
  const path = url.pathname.toLowerCase();
  if (path.includes('/synctrans') || path.endsWith('/sync') || path.includes('/sync/')) return true;
  if (path.includes('/transfers')) return true;
  if (path.includes('/jobs/')) return true;
  if (/[?&](jobid|runid)=/i.test(url.search)) return true;

  try {
    const sync = new URL(syncUrl);
    if (url.origin === sync.origin) {
      const syncPath = sync.pathname.replace(/\/$/, '');
      if (path === syncPath || path.startsWith(`${syncPath}/`)) return true;
    }
  } catch {
    return true;
  }
  return false;
}

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

function readNodeBody(body: string): VospaceNode {
  try {
    return parseNodeXml(body);
  } catch (err) {
    if (err instanceof NodeParsingError) throw err;
    throw new NodeParsingError('Failed to read VOSpace node XML', { cause: err });
  }
}

function vospaceHttpError(status: number, body: string): VospaceError {
  const code = /<(?:[\w.-]+:)?code>\s*([^<]+?)\s*<\/(?:[\w.-]+:)?code>/i.exec(body)?.[1];
  const message = /<(?:[\w.-]+:)?message>\s*([^<]+?)\s*<\/(?:[\w.-]+:)?message>/i.exec(body)?.[1];
  const detail = message || code || excerpt(body) || `HTTP ${status}`;
  const text = `${detail} (HTTP ${status})`;
  const fault = code ?? '';
  const options = { status };
  if (status === 401 || fault === 'NotAuthenticated' || fault === 'InvalidToken') {
    return new NotAuthenticatedError(text, options);
  }
  if (status === 403 || fault === 'PermissionDenied') {
    return new PermissionDeniedError(text, options);
  }
  if (status === 404 || fault === 'NodeNotFound' || fault === 'ContainerNotFound') {
    return new NodeNotFoundError(text, options);
  }
  if (status === 409 || fault === 'DuplicateNode') {
    return new NodeAlreadyExistsError(text, options);
  }
  if (fault === 'TypeNotSupported') {
    return new NodeNotSupportedError(text, options);
  }
  return new VospaceError(text, options);
}

function excerpt(body: string): string {
  const compact = body.replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  return compact.length > 240 ? `${compact.slice(0, 240)}...` : compact;
}
