import type { VospaceNode } from '../vospace/node';
import { propertyValue } from '../vospace/node';
import {
  GROUP_PROPERTY_DELIMITER,
  PROPERTY_CREATOR,
  PROPERTY_DATE,
  PROPERTY_GROUP_READ,
  PROPERTY_GROUP_WRITE,
  PROPERTY_IS_LOCKED,
  PROPERTY_IS_PUBLIC,
  PROPERTY_LENGTH,
  PROPERTY_READABLE,
  PROPERTY_WRITABLE,
} from '../vospace/standards';
import { VosUri } from '../vospace/vos-uri';
import { parentFolderPath } from './folder-path';
import type { FileEntry, FolderListing, LinkEntry, StorageEntry } from './types';

export class NotAFolderError extends Error {
  constructor() {
    super('That path is not a folder');
    this.name = 'NotAFolderError';
  }
}

export interface NodeReader {
  uriPrefix: VosUri;
  getNode(path: string, query?: string): Promise<VospaceNode>;
}

const LISTING_DETAIL = 'detail=max';

export interface ListFolderOptions {
  pageSize?: number;
  /** Opaque VOS URI cursor from a prior `nextStartUri`. */
  startUri?: string;
}

/** List the direct contents of a folder. `folderPath` `/` is the configured VOSpace root. */
export async function listFolderEntries(
  reader: NodeReader,
  folderPath: string,
  options?: ListFolderOptions,
): Promise<FolderListing> {
  const canonical = folderPath === '/' ? '/' : folderPath;
  const node = await reader.getNode(canonical, buildListingQuery(options));
  return toFolderListing(node, reader.uriPrefix, canonical);
}

function buildListingQuery(options?: ListFolderOptions): string {
  const parts = [LISTING_DETAIL];
  if (options?.pageSize != null && options.pageSize > 0) {
    parts.push(`limit=${Math.floor(options.pageSize)}`);
  }
  if (options?.startUri) {
    parts.push(`startURI=${encodeURIComponent(options.startUri)}`);
  }
  return parts.join('&');
}

export function toFolderListing(node: VospaceNode, prefix: VosUri, folderPath: string): FolderListing {
  if (node.type !== 'ContainerNode') throw new NotAFolderError();
  const entries = (node.children ?? [])
    .map((child) => toStorageEntry(child, prefix))
    .filter((entry): entry is StorageEntry => entry !== null);
  entries.sort(compareEntries);
  return {
    folderPath,
    parentPath: parentFolderPath(folderPath),
    canRead: flag(node, PROPERTY_READABLE, true),
    canWrite: flag(node, PROPERTY_WRITABLE, false),
    entries,
    ...(node.childrenNextUri ? { nextStartUri: node.childrenNextUri } : {}),
  };
}

export function toStorageEntry(node: VospaceNode, prefix: VosUri): StorageEntry | null {
  const located = locate(node.uri, prefix);
  if (!located || !located.name || located.path === '/') return null;
  const base = {
    name: located.name,
    path: located.path,
    uri: node.uri,
    ...modifiedFields(propertyValue(node, PROPERTY_DATE)),
    owner: propertyValue(node, PROPERTY_CREATOR) ?? '',
    canRead: flag(node, PROPERTY_READABLE, true),
    canWrite: flag(node, PROPERTY_WRITABLE, false),
    locked: flag(node, PROPERTY_IS_LOCKED, false),
    isPublic: flag(node, PROPERTY_IS_PUBLIC, false),
    readGroups: groupNames(propertyValue(node, PROPERTY_GROUP_READ)),
    writeGroups: groupNames(propertyValue(node, PROPERTY_GROUP_WRITE)),
  };

  if (node.type === 'ContainerNode') {
    return { ...base, kind: 'folder', icon: 'folder' };
  }
  if (node.type === 'DataNode') {
    const sizeBytes = readLength(node);
    const file: FileEntry = {
      ...base,
      kind: 'file',
      icon: 'file',
      sizeBytes: sizeBytes ?? 0,
      sizeDisplay: sizeBytes === null ? '' : formatBytes(sizeBytes),
    };
    return file;
  }
  if (node.type === 'LinkNode') {
    const target = node.target ?? '';
    const link: LinkEntry = {
      ...base,
      kind: 'link',
      icon: 'link',
      target,
    };
    const navigatePath = target ? navigatePathFor(target, prefix) : undefined;
    if (navigatePath) link.navigatePath = navigatePath;
    return link;
  }
  return null;
}

function locate(uri: string, prefix: VosUri): { path: string; name: string } | null {
  if (!uri) return null;
  let vos: VosUri;
  try {
    vos = new VosUri(uri).toCommonForm();
  } catch {
    return null;
  }
  if (vos.authority !== prefix.authority) return null;
  const path = publicPath(vos.path, prefix.path);
  const name = path === '/' ? '' : path.slice(path.lastIndexOf('/') + 1);
  return { path, name };
}

/** Path shown to the UI, relative to the configured vos:// prefix. */
function publicPath(vosPath: string, prefixPath: string): string {
  if (!prefixPath) return vosPath || '/';
  if (vosPath === prefixPath) return '/';
  if (vosPath.startsWith(`${prefixPath}/`)) {
    const rest = vosPath.slice(prefixPath.length);
    return rest || '/';
  }
  return vosPath || '/';
}

function navigatePathFor(target: string, prefix: VosUri): string | undefined {
  if (!target.startsWith('vos://')) return undefined;
  return locate(target, prefix)?.path;
}

function flag(node: VospaceNode, uri: string, fallback: boolean): boolean {
  const value = propertyValue(node, uri);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function groupNames(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(GROUP_PROPERTY_DELIMITER)
    .map((token) => token.trim())
    .filter(Boolean)
    .map(displayGroupName);
}

function displayGroupName(token: string): string {
  try {
    const url = new URL(token);
    if (url.search.length > 1) return decodeURIComponent(url.search.slice(1));
  } catch {
    // Already a display name.
  }
  return token;
}

function readLength(node: VospaceNode): number | null {
  const raw = propertyValue(node, PROPERTY_LENGTH);
  if (raw == null || raw === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function modifiedFields(raw: string | null | undefined): { modified: string; modifiedDisplay: string } {
  if (!raw) return { modified: '', modifiedDisplay: '' };
  const date = parseUtcDate(raw);
  if (!date) return { modified: raw, modifiedDisplay: raw };
  const modified = date.toISOString();
  const modifiedDisplay = `${new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date)} UTC`;
  return { modified, modifiedDisplay };
}

function parseUtcDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(trimmed) ? trimmed : `${trimmed}Z`;
  const date = new Date(withZone);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB', 'PB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 10 || Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
  return `${rounded} ${units[unit]}`;
}

function compareEntries(a: StorageEntry, b: StorageEntry): number {
  const order = { folder: 0, file: 1, link: 2 };
  const byKind = order[a.kind] - order[b.kind];
  if (byKind !== 0) return byKind;
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
}
