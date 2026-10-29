'use client';

import RefreshIcon from '@mui/icons-material/Refresh';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import {
  fetchFolderStatistics,
  fetchSessionNavigation,
  sessionNavigationQueryKey,
  storageStatisticsQueryKey,
} from '@/lib/storage/entries-client';
import { useBrowseFolderPath } from '@/components/browse/browse-context';

export function QuotaStrip() {
  const folderPath = useBrowseFolderPath();
  const { data: navigation } = useQuery({
    queryKey: sessionNavigationQueryKey,
    queryFn: ({ signal }) => fetchSessionNavigation(signal),
    staleTime: 5 * 60_000,
  });
  const statisticsPath = navigation?.homePath ?? folderPath;
  const { data, isFetching, refetch } = useQuery({
    queryKey: storageStatisticsQueryKey(statisticsPath),
    queryFn: ({ signal }) => fetchFolderStatistics(statisticsPath, signal),
    staleTime: 60_000,
  });

  return (
    <Box sx={{ mt: 'auto', pt: 2, borderTop: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          Storage
        </Typography>
        <IconButton
          size="small"
          aria-label="Refresh storage statistics"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Box>
      {data?.kind === 'quota' ? (
        <Box sx={{ mt: 0.75 }}>
          <Typography variant="body2">
            {data.usedDisplay} / {data.quotaDisplay}
          </Typography>
          {typeof data.usedPercent === 'number' ? (
            <LinearProgress
              variant="determinate"
              value={Math.min(100, data.usedPercent)}
              sx={{ mt: 1, height: 6, borderRadius: 1 }}
            />
          ) : null}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {data?.message ?? 'Quota not available'}
        </Typography>
      )}
    </Box>
  );
}
