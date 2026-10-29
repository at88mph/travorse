import { normalizeNodePath } from '../vospace/vos-uri';
import { InvalidFolderPathError } from './folder-path';

/** Path segments after `/api/v1/folders/files/` (upload target folder). */
export function folderPathFromUploadSegments(segments: string[]): string {
  if (segments.length === 0) return '/';
  try {
    const normalized = normalizeNodePath(`/${segments.join('/')}`);
    return normalized === '' ? '/' : normalized;
  } catch {
    throw new InvalidFolderPathError();
  }
}

/** Path segments for `PUT /api/v1/folders/{path...}` (create folder at path). */
export function folderPathFromPutSegments(segments: string[]): string {
  if (segments.length === 0) {
    throw new InvalidFolderPathError();
  }
  const reserved = new Set(['entries']);
  if (segments.some((segment) => reserved.has(segment))) {
    throw new InvalidFolderPathError();
  }
  try {
    const normalized = normalizeNodePath(`/${segments.join('/')}`);
    if (!normalized || normalized === '/') throw new InvalidFolderPathError();
    return normalized;
  } catch {
    throw new InvalidFolderPathError();
  }
}

/** Path segments after `/api/v1/files/` (file to download). */
export function filePathFromDownloadSegments(segments: string[]): string {
  if (segments.length === 0) throw new InvalidFolderPathError();
  try {
    const normalized = normalizeNodePath(`/${segments.join('/')}`);
    if (!normalized || normalized === '/') throw new InvalidFolderPathError();
    return normalized;
  } catch (err) {
    if (err instanceof InvalidFolderPathError) throw err;
    throw new InvalidFolderPathError();
  }
}
