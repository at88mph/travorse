'use client';

import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  useBrowseFolderPath,
  useBrowseListingPageSize,
  useMainListingSettled,
} from '@/components/browse/browse-context';
import { publicConfigQueryKey, fetchPublicConfig } from '@/lib/config-client';
import { browseHref } from '@/lib/storage/folder-path';
import { folderEntriesInfiniteQueryOptions } from '@/lib/storage/folder-entries-infinite';
import type { PublicConfig } from '@/lib/public-config';
import type { StorageEntry } from '@/lib/storage/types';

function ancestorPaths(folderPath: string): string[] {
  if (folderPath === '/') return [];
  const parts = folderPath.split('/').filter(Boolean);
  const paths: string[] = [];
  let acc = '';
  for (const part of parts) {
    acc += `/${part}`;
    paths.push(acc);
  }
  return paths;
}

export function AllocationTree() {
  const currentPath = useBrowseFolderPath();
  const { settled: mainListingSettled } = useMainListingSettled();
  const { pageSize: listingPageSize } = useBrowseListingPageSize();

  const { data: publicConfig } = useQuery({
    queryKey: publicConfigQueryKey,
    queryFn: ({ signal }) => fetchPublicConfig(signal),
    staleTime: 5 * 60_000,
  });

  const rootOptions = useMemo(
    () => folderEntriesInfiniteQueryOptions('/', publicConfig, listingPageSize),
    [publicConfig, listingPageSize],
  );

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
  } = useInfiniteQuery({
    ...rootOptions,
    enabled: publicConfig !== undefined && mainListingSettled,
    select: (result) =>
      result.pages.flatMap((page) =>
        page.entries.filter((entry): entry is StorageEntry => entry.kind === 'folder'),
      ),
  });

  const allocations = data;

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const path of ancestorPaths(currentPath)) next.add(path);
      return next;
    });
  }, [currentPath]);

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  if (!mainListingSettled || (isLoading && !allocations?.length)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} aria-label="Loading allocations" />
      </Box>
    );
  }

  if (isError) {
    return (
      <Typography variant="body2" color="error">
        {error instanceof Error ? error.message : 'Failed to load allocations'}
      </Typography>
    );
  }

  if (!allocations?.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No top-level folders visible at Root.
      </Typography>
    );
  }

  return (
    <nav aria-label="Allocations and folders" aria-busy={isFetching}>
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        Allocations
      </Typography>
      <List dense disablePadding>
        {allocations.map((allocation) => (
          <FolderBranch
            key={allocation.path}
            entry={allocation}
            depth={0}
            currentPath={currentPath}
            expanded={expanded}
            onToggle={toggle}
            publicConfig={publicConfig}
          />
        ))}
      </List>
    </nav>
  );
}

function FolderBranch({
  entry,
  depth,
  currentPath,
  expanded,
  onToggle,
  publicConfig,
}: {
  entry: StorageEntry;
  depth: number;
  currentPath: string;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  publicConfig: PublicConfig | undefined;
}) {
  const isOpen = expanded.has(entry.path);
  const selected = currentPath === entry.path;
  const under = currentPath.startsWith(`${entry.path}/`);

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', pl: 1 + depth * 1.5 }}>
        <IconButton
          size="small"
          aria-label={isOpen ? `Collapse ${entry.name}` : `Expand ${entry.name}`}
          onClick={() => onToggle(entry.path)}
          sx={{ mr: 0.25 }}
        >
          {isOpen ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        </IconButton>
        <ListItemButton
          component={Link}
          href={browseHref(entry.path)}
          selected={selected}
          sx={{ flex: 1, py: 0.35, borderRadius: 1 }}
        >
          <ListItemText
            primary={entry.name}
            slotProps={{ primary: { variant: 'body2', sx: { fontWeight: under ? 600 : 400 } } }}
          />
        </ListItemButton>
      </Box>
      {isOpen ? (
        <FolderChildren
          folderPath={entry.path}
          depth={depth + 1}
          currentPath={currentPath}
          expanded={expanded}
          onToggle={onToggle}
          publicConfig={publicConfig}
        />
      ) : null}
    </>
  );
}

function FolderChildren({
  folderPath,
  depth,
  currentPath,
  expanded,
  onToggle,
  publicConfig,
}: {
  folderPath: string;
  depth: number;
  currentPath: string;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  publicConfig: PublicConfig | undefined;
}) {
  const { pageSize: listingPageSize } = useBrowseListingPageSize();

  const childOptions = useMemo(
    () => folderEntriesInfiniteQueryOptions(folderPath, publicConfig, listingPageSize),
    [folderPath, publicConfig, listingPageSize],
  );

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isError,
    error,
  } = useInfiniteQuery({
    ...childOptions,
    enabled: publicConfig !== undefined,
    select: (result) => {
      const folders = result.pages.flatMap((page) =>
        page.entries.filter((entry): entry is StorageEntry => entry.kind === 'folder'),
      );
      const lastPage = result.pages[result.pages.length - 1];
      return {
        folders,
        hasMore: Boolean(lastPage?.nextStartUri),
        loadedFolderCount: folders.length,
      };
    },
  });

  const folders = useMemo(() => data?.folders ?? [], [data?.folders]);
  const hasMore = data?.hasMore ?? false;

  if (isLoading) {
    return (
      <Box sx={{ pl: 2 + depth * 1.5, py: 0.5 }}>
        <CircularProgress size={18} aria-label={`Loading ${folderPath}`} />
      </Box>
    );
  }

  if (isError) {
    return (
      <Typography variant="caption" color="error" sx={{ pl: 2 + depth * 1.5, display: 'block' }}>
        {error instanceof Error ? error.message : 'Load failed'}
      </Typography>
    );
  }

  return (
    <>
      {folders.map((child) => (
        <FolderBranch
          key={child.path}
          entry={child}
          depth={depth}
          currentPath={currentPath}
          expanded={expanded}
          onToggle={onToggle}
          publicConfig={publicConfig}
        />
      ))}
      {hasNextPage ? (
        <Box sx={{ pl: 2 + depth * 1.5, py: 0.5 }}>
          <Button size="small" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Loading…' : 'Load more folders'}
          </Button>
          {hasMore ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
              Showing {data?.loadedFolderCount ?? folders.length} folders loaded
            </Typography>
          ) : null}
        </Box>
      ) : null}
    </>
  );
}
