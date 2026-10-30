import { withBasePath } from '@/lib/env-client';
import type { FolderListing } from '@/lib/storage/types';

export interface FetchFolderEntriesParams {
  folderPath: string;
  pageSize?: number;
  startUri?: string;
  signal?: AbortSignal;
}

export class FolderEntriesError extends Error {
  constructor(
    message: string,
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'FolderEntriesError';
  }
}

export function folderEntriesUrl(folderPath: string, params?: { pageSize?: number; startUri?: string }): string {
  const pathPart =
    folderPath === '/' || folderPath === ''
      ? withBasePath('/api/v1/folders/entries')
      : withBasePath(
          `/api/v1/folders/${folderPath
            .split('/')
            .filter(Boolean)
            .map(encodeURIComponent)
            .join('/')}/entries`,
        );
  const search = new URLSearchParams();
  if (params?.pageSize != null) search.set('pageSize', String(params.pageSize));
  if (params?.startUri) search.set('startUri', params.startUri);
  const qs = search.toString();
  return qs ? `${pathPart}?${qs}` : pathPart;
}

export async function fetchFolderEntries(params: FetchFolderEntriesParams): Promise<FolderListing> {
  const url = folderEntriesUrl(params.folderPath, {
    pageSize: params.pageSize,
    startUri: params.startUri,
  });
  const response = await fetch(url, {
    credentials: 'same-origin',
    signal: params.signal,
    cache: 'no-store',
  });
  const body = (await response.json().catch(() => ({}))) as FolderListing & { message?: string };
  if (!response.ok) {
    throw new FolderEntriesError(body.message || response.statusText || `HTTP ${response.status}`, response.status);
  }
  return body;
}

export const folderEntriesQueryKey = {
  root: ['folder-entries'] as const,
  path: (folderPath: string) => ['folder-entries', folderPath] as const,
  infinite: (folderPath: string, pageSize: number) => ['folder-entries', folderPath, { pageSize }] as const,
};

export const allocationsQueryKey = ['allocations'] as const;

export const sessionNavigationQueryKey = ['session-navigation'] as const;

export interface SessionNavigation {
  homePath: string | null;
  projectsPath: string;
}

export async function fetchSessionNavigation(signal?: AbortSignal): Promise<SessionNavigation> {
  const response = await fetch(withBasePath('/api/v1/session/navigation'), {
    credentials: 'same-origin',
    signal,
    cache: 'no-store',
  });
  const body = (await response.json().catch(() => ({}))) as SessionNavigation & { message?: string };
  if (!response.ok) {
    throw new Error(body.message || response.statusText || `HTTP ${response.status}`);
  }
  return body;
}

export interface StorageStatisticsResponse {
  kind: 'quota' | 'none';
  message?: string;
  resolvedAgainstPath?: string;
  quotaBytes?: number | null;
  usedBytes?: number | null;
  remainingBytes?: number | null;
  usedDisplay?: string;
  quotaDisplay?: string;
  remainingDisplay?: string;
  usedPercent?: number | null;
}

export function folderStatisticsUrl(folderPath: string): string {
  if (folderPath === '/' || folderPath === '') {
    return withBasePath('/api/v1/folders/statistics');
  }
  const segments = folderPath.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  return withBasePath(`/api/v1/folders/statistics/${segments}`);
}

export async function fetchFolderStatistics(
  folderPath: string,
  signal?: AbortSignal,
): Promise<StorageStatisticsResponse> {
  const response = await fetch(folderStatisticsUrl(folderPath), {
    credentials: 'same-origin',
    signal,
    cache: 'no-store',
  });
  return (await response.json()) as StorageStatisticsResponse;
}

export const storageStatisticsQueryKey = (folderPath: string) => ['storage-statistics', folderPath] as const;
