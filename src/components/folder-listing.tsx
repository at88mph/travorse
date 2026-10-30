'use client';

import DownloadIcon from '@mui/icons-material/Download';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import {
  isDownloadableEntry,
  useBrowseCapabilities,
  useBrowseFolderPath,
  useBrowseNameFilter,
  useBrowseSelection,
  useBrowseListingPageSize,
  useMainListingSettled,
} from '@/components/browse/browse-context';
import { UploadProgressChip } from '@/components/browse/upload-progress-chip';
import { publicConfigQueryKey, fetchPublicConfig } from '@/lib/config-client';
import { triggerBrowserDownload } from '@/lib/storage/files-client';
import { browseHref, folderBreadcrumbs } from '@/lib/storage/folder-path';
import { FolderEntriesError } from '@/lib/storage/entries-client';
import { folderEntriesInfiniteQueryOptions } from '@/lib/storage/folder-entries-infinite';
import { LISTING_PAGE_SIZE_OPTIONS } from '@/lib/storage/listing-page-size';
import type { FolderListing, StorageEntry } from '@/lib/storage/types';

const SLOW_LOAD_MS = 2000;

function useSlowLoadNotice(active: boolean): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    const timer = window.setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => window.clearTimeout(timer);
  }, [active]);
  return slow;
}

export function FolderListingView() {
  const folderPath = useBrowseFolderPath();
  const { filter } = useBrowseNameFilter();
  const { setCapabilities } = useBrowseCapabilities();
  const { markSettled } = useMainListingSettled();
  const { pageSize: listingPageSize, setPageSize: setListingPageSize } = useBrowseListingPageSize();
  const { status: sessionStatus } = useSession();

  const { data: publicConfig } = useQuery({
    queryKey: publicConfigQueryKey,
    queryFn: ({ signal }) => fetchPublicConfig(signal),
    staleTime: 5 * 60_000,
  });

  const pagingEnabled = publicConfig?.features.paging ?? false;

  const infiniteOptions = useMemo(
    () => folderEntriesInfiniteQueryOptions(folderPath, publicConfig, listingPageSize),
    [folderPath, publicConfig, listingPageSize],
  );

  const {
    data,
    error,
    isPending,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
    isError,
    isFetched,
  } = useInfiniteQuery({
    ...infiniteOptions,
    enabled: publicConfig !== undefined,
    placeholderData: keepPreviousData,
  });

  const listing = useMemo((): FolderListing | null => {
    if (!data?.pages.length) return null;
    const first = data.pages[0];
    const entries = data.pages.flatMap((page) => page.entries);
    const lastPage = data.pages[data.pages.length - 1];
    return {
      folderPath: first.folderPath,
      parentPath: first.parentPath,
      canRead: first.canRead,
      canWrite: first.canWrite,
      entries,
      ...(lastPage.nextStartUri ? { nextStartUri: lastPage.nextStartUri } : {}),
    };
  }, [data]);

  const filteredEntries = useMemo(() => {
    if (!listing) return [];
    const needle = filter.trim().toLowerCase();
    if (!needle) return listing.entries;
    return listing.entries.filter((entry) => entry.name.toLowerCase().includes(needle));
  }, [listing, filter]);

  useEffect(() => {
    if (listing) {
      setCapabilities({ canRead: listing.canRead, canWrite: listing.canWrite });
    } else if (!isPending && isError) {
      setCapabilities(null);
    }
  }, [listing, isPending, isError, setCapabilities]);

  useEffect(() => {
    if (isFetched && !isPending) markSettled();
  }, [isFetched, isPending, markSettled]);

  const initialLoadActive = isPending || (isFetching && !data?.pages.length);
  const showSlowNotice = useSlowLoadNotice(initialLoadActive);

  return (
    <Box
      component="section"
      className="card"
      aria-busy={isFetching}
      aria-labelledby="folder-heading"
      sx={{ bgcolor: 'background.paper' }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
          mb: 0.35,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <FolderPath folderPath={folderPath} />
        </Box>
        <UploadProgressChip />
      </Box>
      {publicConfig && !pagingEnabled ? (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          This deployment loads full folder listings. Very large folders may take several minutes.
        </Alert>
      ) : null}
      {pagingEnabled ? (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="folder-listing-page-size">Items per page</InputLabel>
            <Select
              labelId="folder-listing-page-size"
              id="folder-listing-page-size-select"
              label="Items per page"
              value={listingPageSize}
              onChange={(event) => setListingPageSize(Number(event.target.value))}
            >
              {LISTING_PAGE_SIZE_OPTIONS.map((size) => (
                <MenuItem key={size} value={size}>
                  {size}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      ) : null}
      <p className="muted folder-summary" aria-live="polite">
        <FolderSummary
          folderPath={folderPath}
          listing={listing}
          filteredCount={filteredEntries.length}
          filter={filter}
          hasMore={Boolean(hasNextPage || listing?.nextStartUri)}
          isFetchingNextPage={isFetchingNextPage}
        />
      </p>
      {filter.trim() && listing?.nextStartUri ? (
        <p className="muted" style={{ fontSize: '0.875rem', marginTop: 0 }}>
          Filter applies to loaded items only. Load more to search further in this folder.
        </p>
      ) : null}
      {isPending ? <LoadingNotice slow={showSlowNotice} /> : null}
      {isError ? (
        <ErrorBanner
          error={error}
          sessionStatus={sessionStatus}
          onRetry={() => void refetch()}
        />
      ) : null}
      {listing && !isPending ? (
        <>
          <ListingTable entries={filteredEntries} folderPath={listing.folderPath} />
          {hasNextPage ? (
            <Box sx={{ mt: 2 }}>
              {isFetchingNextPage ? (
                <LinearProgress sx={{ mb: 1 }} aria-label="Loading more folder items" />
              ) : null}
              <Button variant="outlined" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? 'Loading more…' : 'Load more'}
              </Button>
            </Box>
          ) : null}
        </>
      ) : null}
    </Box>
  );
}

function LoadingNotice({ slow }: { slow: boolean }) {
  return (
    <div role="status" aria-live="polite">
      <p>Loading folder contents…</p>
      {slow ? <p className="muted">This folder may be large; still loading…</p> : null}
      <div className="skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function ErrorBanner({
  error,
  sessionStatus,
  onRetry,
}: {
  error: unknown;
  sessionStatus: string;
  onRetry: () => void;
}) {
  const httpStatus = error instanceof FolderEntriesError ? error.httpStatus : undefined;
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="banner-error" role="alert">
      <p>{message}</p>
      <div className="banner-actions">
        {(httpStatus === 401 || httpStatus === 403) && sessionStatus !== 'authenticated' ? (
          <button type="button" className="btn btn-primary" onClick={() => signIn('oidc')}>
            Sign in
          </button>
        ) : null}
        <button type="button" className="btn" onClick={onRetry}>
          Retry
        </button>
      </div>
    </div>
  );
}

function FolderPath({ folderPath }: { folderPath: string }) {
  const crumbs = folderBreadcrumbs(folderPath);
  return (
    <>
      {crumbs.length > 0 ? (
        <nav aria-label="Folder path">
          <ol className="breadcrumb">
            {crumbs.map((crumb, index) => (
              <li key={crumb.href}>
                {index > 0 ? <PathChevron /> : null}
                <Link href={crumb.href}>{crumb.label}</Link>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <h1 id="folder-heading" className="sr-only">
        {folderPath === '/' ? 'Root' : folderPath}
      </h1>
    </>
  );
}

function PathChevron() {
  return (
    <svg className="breadcrumb-chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function FolderSummary({
  folderPath,
  listing,
  filteredCount,
  filter,
  hasMore,
  isFetchingNextPage,
}: {
  folderPath: string;
  listing: FolderListing | null;
  filteredCount: number;
  filter: string;
  hasMore: boolean;
  isFetchingNextPage: boolean;
}) {
  if (!listing) return <strong>{folderPath}</strong>;
  const count = filter.trim() ? filteredCount : listing.entries.length;
  const noun = count === 1 ? 'item' : 'items';
  const moreHint = hasMore ? ' (more in this folder)' : '';
  const loadingHint = isFetchingNextPage ? ' — loading next page…' : '';
  return (
    <>
      Showing <strong>{count}</strong> {noun} in <strong>{listing.folderPath}</strong>
      {moreHint}
      {filter.trim() ? <> (filtered)</> : null}
      {loadingHint}
    </>
  );
}

function ListingTable({ entries, folderPath }: { entries: StorageEntry[]; folderPath: string }) {
  const { isSelected, togglePath } = useBrowseSelection();

  if (entries.length === 0) {
    return <p className="empty-state">This folder is empty.</p>;
  }
  return (
    <div className="table-scroll">
      <table className="listing-table">
        <caption className="sr-only">Contents of {folderPath}</caption>
        <thead>
          <tr>
            <th scope="col" className="sr-only">
              Select
            </th>
            <th scope="col">Name</th>
            <th scope="col">Size</th>
            <th scope="col">Modified (UTC)</th>
            <th scope="col">Read groups</th>
            <th scope="col">Write groups</th>
            <th scope="col">Owner</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <EntryRow
              key={entry.path}
              entry={entry}
              selected={isSelected(entry.path)}
              onToggleSelect={() => togglePath(entry.path)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EntryRow({
  entry,
  selected,
  onToggleSelect,
}: {
  entry: StorageEntry;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  return (
    <tr>
      <td>
        <Checkbox
          size="small"
          checked={selected}
          onChange={onToggleSelect}
          slotProps={{ input: { 'aria-label': `Select ${entry.name}` } }}
        />
      </td>
      <th scope="row">
        <span className="entry-name">
          <EntryIcon kind={entry.kind} />
          {entry.kind === 'folder' ? <Link href={browseHref(entry.path)}>{entry.name}</Link> : entry.name}
          {isDownloadableEntry(entry) ? (
            <Tooltip title={`Download ${entry.name}`}>
              <IconButton
                size="small"
                aria-label={`Download ${entry.name}`}
                onClick={() =>
                  triggerBrowserDownload(entry.path)
                }
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
        </span>
      </th>
      <td>{entry.kind === 'file' ? entry.sizeDisplay : ''}</td>
      <td title={entry.modified}>{entry.modifiedDisplay}</td>
      <td>{entry.readGroups.join(', ')}</td>
      <td>{entry.writeGroups.join(', ')}</td>
      <td>{entry.owner}</td>
    </tr>
  );
}

function EntryIcon({ kind }: { kind: StorageEntry['kind'] }) {
  const label = kind === 'folder' ? 'Folder' : kind === 'file' ? 'File' : 'Link';
  return (
    <span className={`entry-icon entry-icon-${kind}`} role="img" aria-label={label}>
      {kind === 'folder' ? <FolderGlyph /> : kind === 'file' ? <FileGlyph /> : <LinkGlyph />}
    </span>
  );
}

function FolderGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3.5 7.25A2.25 2.25 0 0 1 5.75 5h3.1l1.7 1.75h7.7a2.25 2.25 0 0 1 2.25 2.25v8A2.25 2.25 0 0 1 18.25 19.5H5.75A2.25 2.25 0 0 1 3.5 17.25v-10z" />
    </svg>
  );
}

function FileGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M14 3.5H7.75A2.25 2.25 0 0 0 5.5 5.75v12.5A2.25 2.25 0 0 0 7.75 20.5h8.5a2.25 2.25 0 0 0 2.25-2.25V8.5L14 3.5z" />
      <path d="M14 3.5V8.5h6" />
    </svg>
  );
}

function LinkGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M10.2 13.2a4.25 4.25 0 0 0 6.01.15l1.55-1.55a4.25 4.25 0 0 0-6.01-6.01L10.4 7.14" />
      <path d="M13.8 10.8a4.25 4.25 0 0 0-6.01-.15l-1.55 1.55a4.25 4.25 0 0 0 6.01 6.01l1.35-1.35" />
    </svg>
  );
}
