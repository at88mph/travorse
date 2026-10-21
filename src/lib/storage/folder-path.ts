import { normalizeNodePath } from '../vospace/vos-uri';

export class InvalidFolderPathError extends Error {
  constructor() {
    super('Invalid folder path');
    this.name = 'InvalidFolderPathError';
  }
}

/**
 * `GET /api/v1/folders/{path...}/entries`.
 * The trailing segment is the action, so `/api/v1/folders/entries` is the root
 * and `/api/v1/folders/home/docs/entries` is `/home/docs`.
 * Returns null when this catch-all request is not an entries listing.
 */
export function folderPathFromSegments(segments: string[]): string | null {
  if (segments.length === 0 || segments[segments.length - 1] !== 'entries') return null;
  const parts = segments.slice(0, -1);
  if (parts.length === 0) return '/';
  try {
    return normalizeNodePath(`/${parts.join('/')}`) || '/';
  } catch {
    throw new InvalidFolderPathError();
  }
}

export function parentFolderPath(folderPath: string): string | null {
  if (folderPath === '/') return null;
  const index = folderPath.lastIndexOf('/');
  if (index <= 0) return '/';
  return folderPath.slice(0, index);
}
