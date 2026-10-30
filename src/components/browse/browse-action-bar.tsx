'use client';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { NewFolderDialog } from '@/components/browse/new-folder-dialog';
import {
  isDownloadableEntry,
  useBrowseCapabilities,
  useBrowseFolderPath,
  useBrowseSelection,
  useBrowseUploads,
} from '@/components/browse/browse-context';
import { triggerBrowserDownloads } from '@/lib/storage/files-client';
import { useQueryClient } from '@tanstack/react-query';
import { folderEntriesQueryKey } from '@/lib/storage/entries-client';
import type { StorageEntry } from '@/lib/storage/types';

export function BrowseActionBar() {
  const folderPath = useBrowseFolderPath();
  const { capabilities } = useBrowseCapabilities();
  const { selectedPaths, clearSelection } = useBrowseSelection();
  const { startUploads, jobs } = useBrowseUploads();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [newFolderOpen, setNewFolderOpen] = useState(false);

  const canWrite = capabilities?.canWrite ?? false;
  const uploading = jobs.some((job) => job.status === 'uploading');

  const selectedEntries = useMemo(() => {
    const matches = queryClient.getQueriesData<{ pages: { entries: StorageEntry[] }[] }>({
      queryKey: folderEntriesQueryKey.infinitePrefix(folderPath),
    });
    const data = matches[0]?.[1];
    if (!data?.pages) return [];
    const all = data.pages.flatMap((page) => page.entries);
    return all.filter((entry) => selectedPaths.has(entry.path));
  }, [queryClient, folderPath, selectedPaths]);

  const downloadableItems = useMemo(
    () =>
      selectedEntries.filter(isDownloadableEntry).map((entry) => ({
        path: entry.path,
        name: entry.name,
      })),
    [selectedEntries],
  );

  const downloadEnabled = downloadableItems.length > 0;
  const downloadHint =
    downloadableItems.length === 0
      ? 'Select files to download'
      : `Download ${downloadableItems.length} selected item(s)`;

  const onUploadClick = () => fileInputRef.current?.click();

  const onFilesChosen = (event: ChangeEvent<HTMLInputElement>) => {
    const list = event.target.files;
    if (!list?.length) return;
    void startUploads(folderPath, Array.from(list));
    event.target.value = '';
  };

  const onDownload = () => {
    if (!downloadEnabled) return;
    triggerBrowserDownloads(downloadableItems);
  };

  return (
    <Box
      component="section"
      aria-label="Folder actions"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1,
        mb: 2,
        position: { md: 'sticky' },
        top: { md: 72 },
        zIndex: 1,
        py: 1,
        bgcolor: 'background.default',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={onFilesChosen}
        aria-hidden
      />
      <Tooltip title={canWrite ? 'Upload files into this folder' : 'You cannot upload to this folder'}>
        <span>
          <Button
            variant="contained"
            size="small"
            startIcon={<CloudUploadIcon />}
            onClick={onUploadClick}
            disabled={!canWrite || uploading}
          >
            Upload
          </Button>
        </span>
      </Tooltip>
      <Tooltip title={downloadHint}>
        <span>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={onDownload}
            disabled={!downloadEnabled}
            aria-label={downloadHint}
          >
            Download
          </Button>
        </span>
      </Tooltip>
      <Button
        variant="outlined"
        size="small"
        startIcon={<CreateNewFolderIcon />}
        disabled={!canWrite}
        aria-label="New folder"
        onClick={() => setNewFolderOpen(true)}
      >
        New folder
      </Button>
      <NewFolderDialog open={newFolderOpen} onClose={() => setNewFolderOpen(false)} />
      <Button
        variant="outlined"
        size="small"
        startIcon={<DriveFileMoveIcon />}
        disabled={selectedPaths.size === 0 || !canWrite}
        aria-label="Move selected items (coming soon)"
      >
        Move
      </Button>
      <Button
        variant="outlined"
        size="small"
        color="error"
        startIcon={<DeleteIcon />}
        disabled={selectedPaths.size === 0 || !canWrite}
        aria-label="Delete selected items (coming soon)"
      >
        Delete
      </Button>
      {selectedPaths.size > 0 ? (
        <Button size="small" onClick={clearSelection}>
          Clear selection ({selectedPaths.size})
        </Button>
      ) : null}
    </Box>
  );
}
