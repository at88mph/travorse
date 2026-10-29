'use client';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import Fab from '@mui/material/Fab';
import Tooltip from '@mui/material/Tooltip';
import { useRef } from 'react';
import {
  useBrowseCapabilities,
  useBrowseFolderPath,
  useBrowseUploads,
} from '@/components/browse/browse-context';

/** Mobile-only mirror of the action bar Upload control. */
export function UploadFab() {
  const folderPath = useBrowseFolderPath();
  const { capabilities } = useBrowseCapabilities();
  const { startUploads, jobs } = useBrowseUploads();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canWrite = capabilities?.canWrite ?? false;
  const uploading = jobs.some((job) => job.status === 'uploading');

  if (!canWrite) return null;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          const list = event.target.files;
          if (!list?.length) return;
          void startUploads(folderPath, Array.from(list));
          event.target.value = '';
        }}
        aria-hidden
      />
      <Tooltip title="Upload files">
        <Fab
          color="primary"
          aria-label="Upload files"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          sx={{
            display: { xs: 'flex', md: 'none' },
            position: 'fixed',
            right: 16,
            bottom: 48,
            zIndex: (theme) => theme.zIndex.drawer + 2,
          }}
        >
          <CloudUploadIcon />
        </Fab>
      </Tooltip>
    </>
  );
}
