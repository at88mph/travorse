/**
 * VOSpace URI (`vos://`), aligned with OpenCADC
 * {@link https://github.com/opencadc/vos/blob/main/cadc-vos/src/main/java/org/opencadc/vospace/VOSURI.java VOSURI}.
 *
 * A service prefix such as `vos://cadc.nrc.ca~arc` converts to the Registry
 * resource identifier `ivo://cadc.nrc.ca/arc` (`~` and `!` in the authority
 * become `/`).
 */

const SCHEME = 'vos';

export class VosUri {
  readonly authority: string;
  /** Decoded node path. Empty string is the service root. No trailing slash. */
  readonly path: string;
  readonly query: string | null;
  readonly fragment: string | null;

  constructor(uri: string) {
    const parsed = parseVosReference(uri);
    this.authority = parsed.authority;
    this.path = parsed.path;
    this.query = parsed.query;
    this.fragment = parsed.fragment;
  }

  /**
   * Build a vos URI from an `ivo://` resource id and an optional node path.
   * `ivo://cadc.nrc.ca/arc` + `/home/jdoe` → `vos://cadc.nrc.ca~arc/home/jdoe`.
   */
  static fromResourceId(resourceId: string, path = ''): VosUri {
    let parsed: URL;
    try {
      parsed = new URL(resourceId);
    } catch {
      throw new Error(`Invalid resource ID: ${resourceId}`);
    }
    if (parsed.protocol !== 'ivo:') {
      throw new Error(`Resource ID scheme must be ivo: ${resourceId}`);
    }
    if (!parsed.host) {
      throw new Error(`Resource ID is missing an authority: ${resourceId}`);
    }
    const servicePath = parsed.pathname === '/' ? '' : parsed.pathname;
    const authority = `${parsed.host}${servicePath.replace(/\//g, '~')}`;
    return new VosUri(formatVosUri(authority, normalizeNodePath(path), null, null));
  }

  static fromParts(
    authority: string,
    path: string,
    query: string | null,
    fragment: string | null,
  ): VosUri {
    return new VosUri(formatVosUri(authority, path, query, fragment));
  }

  get scheme(): string {
    return SCHEME;
  }

  isRoot(): boolean {
    return this.path.length === 0;
  }

  getName(): string {
    if (this.isRoot()) return '';
    const segments = this.path.split('/');
    return segments[segments.length - 1] ?? '';
  }

  /** Parent path, or null at the service root. The parent of `/home` is `""`. */
  getParent(): string | null {
    if (this.isRoot()) return null;
    return this.path.slice(0, this.path.lastIndexOf('/'));
  }

  getParentURI(): VosUri | null {
    const parent = this.getParent();
    if (parent === null) return null;
    return VosUri.fromParts(this.authority, parent, null, null);
  }

  getPrefix(): string {
    return `${SCHEME}://${this.authority}`;
  }

  /**
   * Registry resource identifier.
   * `vos://cadc.nrc.ca!vospace/path` and `vos://cadc.nrc.ca~vospace/path`
   * both yield `ivo://cadc.nrc.ca/vospace`.
   */
  getServiceURI(): string {
    const resourceAuthority = this.authority.replace(/!/g, '/').replace(/~/g, '/');
    return `ivo://${resourceAuthority}`;
  }

  /** CADC common form uses `~` rather than `!` in the authority. */
  toCommonForm(): VosUri {
    if (!this.authority.includes('!')) return this;
    return VosUri.fromParts(
      this.authority.replace(/!/g, '~'),
      this.path,
      this.query,
      this.fragment,
    );
  }

  /** Append a node path onto this URI. `path` may be absolute or relative. */
  resolve(path: string): VosUri {
    const extra = normalizeNodePath(path);
    const combined = this.path && extra ? `${this.path}${extra}` : this.path || extra;
    return VosUri.fromParts(this.authority, combined, null, null);
  }

  equals(other: VosUri | null | undefined): boolean {
    if (!other) return false;
    if (this === other) return true;
    if (this.authority === other.authority) return this.toString() === other.toString();
    const left = this.authority.replace(/~/g, '!');
    const right = other.authority.replace(/~/g, '!');
    if (left !== right) return false;
    return this.path === other.path && this.query === other.query && this.fragment === other.fragment;
  }

  toString(): string {
    return formatVosUri(this.authority, this.path, this.query, this.fragment);
  }
}

/**
 * Deployment prefix: a `vos://` URI whose authority contains `~` or `!`,
 * so {@link VosUri.getServiceURI} yields an `ivo://` id with a service path.
 */
export function parseVospacePrefix(value: string): VosUri {
  const vos = new VosUri(value);
  if (!/[~!]/.test(vos.authority)) {
    throw new Error(
      "VOS URI authority must contain '~' or '!' so it can be converted to an ivo:// resource ID (for example vos://cadc.nrc.ca~arc)",
    );
  }
  let service: URL;
  try {
    service = new URL(vos.getServiceURI());
  } catch {
    throw new Error(`VOS URI did not yield a valid ivo:// resource ID: ${vos.getServiceURI()}`);
  }
  if (service.protocol !== 'ivo:' || service.pathname === '' || service.pathname === '/') {
    throw new Error(
      `VOS URI did not yield an ivo:// resource ID with a service path: ${vos.getServiceURI()}`,
    );
  }
  return vos;
}

/** POSIX-style node path. Empty string is the root. Rejects `.` and `..`. */
export function normalizeNodePath(path: string): string {
  if (path.includes('\0') || path.includes('\\')) {
    throw new Error(`Invalid VOSpace path: ${path}`);
  }
  const trimmed = path.trim();
  if (trimmed === '' || trimmed === '/') return '';
  const absolute = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const withoutTrailing = absolute.endsWith('/') ? absolute.slice(0, -1) : absolute;
  const segments = withoutTrailing.split('/');
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (i === 0) continue;
    if (segment === '' || segment === '.' || segment === '..') {
      throw new Error(`Invalid VOSpace path: ${path}`);
    }
  }
  return withoutTrailing;
}

function formatVosUri(
  authority: string,
  path: string,
  query: string | null,
  fragment: string | null,
): string {
  let uri = `${SCHEME}://${authority}${encodeNodePath(path)}`;
  if (query) uri += `?${query}`;
  if (fragment) uri += `#${fragment}`;
  return uri;
}

function encodeNodePath(path: string): string {
  if (!path) return '';
  return path
    .split('/')
    .map((segment, index) => (index === 0 ? segment : encodeURIComponent(segment)))
    .join('/');
}

function decodeNodePath(pathname: string): string {
  if (!pathname || pathname === '/') return '';
  const trimmed = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return trimmed
    .split('/')
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join('/');
}

function parseVosReference(uri: string): {
  authority: string;
  path: string;
  query: string | null;
  fragment: string | null;
} {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error(`Invalid VOS URI: ${uri}`);
  }
  if (parsed.protocol.toLowerCase() !== `${SCHEME}:`) {
    throw new Error(`URI scheme must be vos: ${uri}`);
  }
  if (!parsed.host) {
    throw new Error(`VOS URI is missing an authority: ${uri}`);
  }
  return {
    authority: parsed.host,
    path: decodeNodePath(parsed.pathname),
    query: parsed.search ? parsed.search.slice(1) : null,
    fragment: parsed.hash ? parsed.hash.slice(1) : null,
  };
}
