'use client';

import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Box from '@mui/material/Box';
import { useBrowseUploads } from '@/components/browse/browse-context';

export function UploadProgressChip() {
  const { jobs } = useBrowseUploads();
  const active = jobs.filter((job) => job.status === 'uploading');
  const errors = jobs.filter((job) => job.status === 'error');

  if (active.length === 0 && errors.length === 0) return null;

  const label =
    active.length > 0
      ? active.length === 1
        ? `Uploading ${active[0].fileName}${active[0].percent != null ? ` (${active[0].percent}%)` : '…'}`
        : `Uploading ${active.length} files…`
      : `${errors.length} upload(s) failed`;

  const percent =
    active.length === 1 && active[0].percent != null ? active[0].percent : null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, maxWidth: { xs: 160, sm: 280 } }}>
      {percent != null ? (
        <LinearProgress
          variant="determinate"
          value={percent}
          sx={{ width: 72, height: 6, borderRadius: 1 }}
          aria-hidden
        />
      ) : null}
      <Chip
        size="small"
        label={label}
        color={errors.length > 0 && active.length === 0 ? 'error' : 'default'}
        variant="outlined"
        role="status"
      />
    </Box>
  );
}
