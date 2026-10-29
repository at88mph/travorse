'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { folderEntriesQueryKey } from '@/lib/storage/entries-client';
import type { StorageEntry } from '@/lib/storage/types';

export interface FolderCapabilities {
  canRead: boolean;
  canWrite: boolean;
}

export interface UploadJob {
  id: string;
  fileName: string;
  status: 'uploading' | 'done' | 'error';
  percent: number | null;
  message?: string;
}

const BrowseFolderPathContext = createContext<string>('/');
const BrowseNameFilterContext = createContext<{
  filter: string;
  setFilter: (value: string) => void;
}>({ filter: '', setFilter: () => {} });

const BrowseCapabilitiesContext = createContext<{
  capabilities: FolderCapabilities | null;
  setCapabilities: (value: FolderCapabilities | null) => void;
}>({ capabilities: null, setCapabilities: () => {} });

const BrowseSelectionContext = createContext<{
  selectedPaths: ReadonlySet<string>;
  togglePath: (path: string) => void;
  clearSelection: () => void;
  isSelected: (path: string) => boolean;
}>({
  selectedPaths: new Set(),
  togglePath: () => {},
  clearSelection: () => {},
  isSelected: () => false,
});

const BrowseUploadContext = createContext<{
  jobs: UploadJob[];
  startUploads: (folderPath: string, files: File[]) => Promise<void>;
}>({ jobs: [], startUploads: async () => {} });

export function BrowseFolderPathProvider({
  folderPath,
  children,
}: {
  folderPath: string;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [capabilities, setCapabilities] = useState<FolderCapabilities | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(() => new Set());
  const [jobs, setJobs] = useState<UploadJob[]>([]);

  const filterValue = useMemo(() => ({ filter, setFilter }), [filter]);
  const capabilitiesValue = useMemo(
    () => ({ capabilities, setCapabilities }),
    [capabilities],
  );

  const togglePath = useCallback((path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedPaths(new Set()), []);

  const isSelected = useCallback((path: string) => selectedPaths.has(path), [selectedPaths]);

  const selectionValue = useMemo(
    () => ({ selectedPaths, togglePath, clearSelection, isSelected }),
    [selectedPaths, togglePath, clearSelection, isSelected],
  );

  const startUploads = useCallback(
    async (targetFolder: string, files: File[]) => {
      if (files.length === 0) return;
      const { uploadFilesToFolder } = await import('@/lib/storage/files-client');
      for (const file of files) {
        const id = `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2)}`;
        setJobs((prev) => [
          ...prev,
          { id, fileName: file.name, status: 'uploading', percent: null },
        ]);
        try {
          await uploadFilesToFolder(targetFolder, [file], (event) => {
            setJobs((prev) =>
              prev.map((job) =>
                job.id === id ? { ...job, percent: event.percent, status: 'uploading' } : job,
              ),
            );
          });
          setJobs((prev) =>
            prev.map((job) => (job.id === id ? { ...job, status: 'done', percent: 100 } : job)),
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setJobs((prev) =>
            prev.map((job) =>
              job.id === id ? { ...job, status: 'error', message, percent: null } : job,
            ),
          );
        }
      }
      await queryClient.invalidateQueries({ queryKey: folderEntriesQueryKey.path(targetFolder) });
      await queryClient.invalidateQueries({
        queryKey: folderEntriesQueryKey.infinite(targetFolder, 500),
      });
      window.setTimeout(() => {
        setJobs((prev) => prev.filter((job) => job.status === 'uploading'));
      }, 4000);
    },
    [queryClient],
  );

  const uploadValue = useMemo(() => ({ jobs, startUploads }), [jobs, startUploads]);

  useEffect(() => {
    setSelectedPaths(new Set());
  }, [folderPath]);

  return (
    <BrowseFolderPathContext.Provider value={folderPath}>
      <BrowseNameFilterContext.Provider value={filterValue}>
        <BrowseCapabilitiesContext.Provider value={capabilitiesValue}>
          <BrowseSelectionContext.Provider value={selectionValue}>
            <BrowseUploadContext.Provider value={uploadValue}>{children}</BrowseUploadContext.Provider>
          </BrowseSelectionContext.Provider>
        </BrowseCapabilitiesContext.Provider>
      </BrowseNameFilterContext.Provider>
    </BrowseFolderPathContext.Provider>
  );
}

export function useBrowseFolderPath(): string {
  return useContext(BrowseFolderPathContext);
}

export function useBrowseNameFilter() {
  return useContext(BrowseNameFilterContext);
}

export function useBrowseCapabilities() {
  return useContext(BrowseCapabilitiesContext);
}

export function useBrowseSelection() {
  return useContext(BrowseSelectionContext);
}

export function useBrowseUploads() {
  return useContext(BrowseUploadContext);
}

export function isDownloadableEntry(entry: StorageEntry): boolean {
  return entry.kind === 'file' || entry.kind === 'link';
}
