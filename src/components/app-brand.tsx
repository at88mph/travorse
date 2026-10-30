'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import type { Theme } from '@mui/material/styles';
import { withBasePath } from '@/lib/env-client';
import { browseHref } from '@/lib/storage/folder-path';

export function AppBrand({
  logoUrl,
  deploymentLabel,
  theme,
}: {
  logoUrl?: string;
  deploymentLabel?: string;
  theme: Theme;
}) {
  const homeHref = withBasePath(browseHref('/'));
  const homeLabel = deploymentLabel ? `${deploymentLabel} home` : 'Travorse home';

  return (
    <Box
      component={Link}
      href={homeHref}
      aria-label={homeLabel}
      sx={{
        textDecoration: 'none',
        color: 'inherit',
        fontWeight: 650,
        flexGrow: 1,
        fontSize: '1.25rem',
        lineHeight: 1.2,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minWidth: 0,
      }}
    >
      {logoUrl ? (
        <>
          <Box
            component="img"
            src={logoUrl}
            alt=""
            sx={{ maxHeight: 40, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
          />
          {deploymentLabel ? (
            <Typography component="span" variant="caption" sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>
              {deploymentLabel}
            </Typography>
          ) : null}
        </>
      ) : (
        <>
          Tra<span style={{ color: theme.palette.error.main }}>vo</span>rse
          <Typography component="span" variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
            {deploymentLabel ?? 'CANFAR storage browser'}
          </Typography>
        </>
      )}
    </Box>
  );
}
