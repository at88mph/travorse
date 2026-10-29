'use client';

import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import HomeIcon from '@mui/icons-material/Home';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import StorageIcon from '@mui/icons-material/Storage';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo } from 'react';
import { useBrowseFolderPath, useBrowseNameFilter } from '@/components/browse/browse-context';
import { browseHref, parentFolderPath } from '@/lib/storage/folder-path';
import {
  fetchSessionNavigation,
  sessionNavigationQueryKey,
} from '@/lib/storage/entries-client';

function pathIsUnder(basePath: string, currentPath: string): boolean {
  if (basePath === '/') return true;
  return currentPath === basePath || currentPath.startsWith(`${basePath}/`);
}

export function BrowseNavBar() {
  const folderPath = useBrowseFolderPath();
  const { filter, setFilter } = useBrowseNameFilter();
  const { data: navigation } = useQuery({
    queryKey: sessionNavigationQueryKey,
    queryFn: ({ signal }) => fetchSessionNavigation(signal),
    staleTime: 5 * 60_000,
  });

  const parentPath = parentFolderPath(folderPath);
  const homeActive = navigation?.homePath ? pathIsUnder(navigation.homePath, folderPath) : false;
  const projectsActive = navigation?.projectsPath
    ? pathIsUnder(navigation.projectsPath, folderPath)
    : false;

  const filterHint = useMemo(
    () => (filter.trim() ? `Filtering “${filter.trim()}” (table only)` : undefined),
    [filter],
  );

  return (
    <Box
      component="section"
      aria-label="Browse navigation"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1,
        mb: 1,
      }}
    >
      {parentPath !== null ? (
        <Button
          component={Link}
          href={browseHref(parentPath)}
          size="small"
          startIcon={<ArrowUpwardIcon />}
          variant="outlined"
        >
          Up
        </Button>
      ) : null}
      <Button component={Link} href="/browse" size="small" startIcon={<StorageIcon />} variant="outlined">
        Root
      </Button>
      {navigation?.homePath ? (
        <Button
          component={Link}
          href={browseHref(navigation.homePath)}
          size="small"
          startIcon={<HomeIcon />}
          variant={homeActive ? 'contained' : 'outlined'}
        >
          Home
        </Button>
      ) : null}
      <Button
        component={Link}
        href={browseHref(navigation?.projectsPath ?? '/projects')}
        size="small"
        startIcon={<FolderSharedIcon />}
        variant={projectsActive ? 'contained' : 'outlined'}
      >
        Projects
      </Button>
      <TextField
        size="small"
        label="Filter by name"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        sx={{ ml: { sm: 'auto' }, minWidth: { xs: '100%', sm: 220 } }}
        slotProps={{
          htmlInput: { 'aria-describedby': filterHint ? 'browse-filter-hint' : undefined },
        }}
      />
      {filterHint ? (
        <span id="browse-filter-hint" className="sr-only">
          {filterHint}
        </span>
      ) : null}
    </Box>
  );
}
