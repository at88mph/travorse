import { withBasePath } from '@/lib/env-client';
import { childFolderPath, validateNewFolderName } from '@/lib/storage/folder-name';
import type { FolderEntry } from '@/lib/storage/types';

/** PUT target URL for a new folder under `parentFolderPath` with the given segment name. */
export function createFolderRequestUrl(parentFolderPath: string, segmentName: string): string {
  const validated = validateNewFolderName(segmentName);
  if (!validated.ok) {
    throw new Error(validated.message);
  }
  const folderPath = childFolderPath(parentFolderPath, validated.name);
  const segments = folderPath.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  return withBasePath(`/api/v1/folders/${segments}`);
}

export async function createFolder(
  parentFolderPath: string,
  name: string,
): Promise<FolderEntry> {
  const validated = validateNewFolderName(name);
  if (!validated.ok) {
    throw new Error(validated.message);
  }
  const url = createFolderRequestUrl(parentFolderPath, validated.name);
  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const body = (await response.json().catch(() => ({}))) as FolderEntry & { message?: string };
  if (!response.ok) {
    throw new Error(body.message || response.statusText || `HTTP ${response.status}`);
  }
  return body;
}
