'use client';

import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { ThemeProvider } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AllocationTree } from '@/components/browse/allocation-tree';
import { BrowseFolderPathProvider } from '@/components/browse/browse-context';
import { BrowseActionBar } from '@/components/browse/browse-action-bar';
import { BrowseNavBar } from '@/components/browse/browse-nav-bar';
import { UploadFab } from '@/components/browse/upload-fab';
import { QuotaStrip } from '@/components/browse/quota-strip';
import { SignInOut } from '@/components/sign-in-out';
import { normalizedBasePath } from '@/lib/env-client';
import { folderPathFromBrowsePathname } from '@/lib/storage/folder-path';
import { createAppTheme } from '@/lib/theme';

const DRAWER_WIDTH = 280;

export function BrowseShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const basePath = normalizedBasePath();
  const folderPath = useMemo(
    () => folderPathFromBrowsePathname(pathname ?? '/browse', basePath),
    [pathname, basePath],
  );

  /** Defer viewport/theme media queries until after mount so SSR matches the first client render. */
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);

  const prefersDarkMedia = useMediaQuery('(prefers-color-scheme: dark)', { defaultMatches: false });
  const prefersDark = hasMounted && prefersDarkMedia;
  const theme = useMemo(() => createAppTheme(prefersDark ? 'dark' : 'light'), [prefersDark]);
  const isDesktopMedia = useMediaQuery(theme.breakpoints.up('md'), { defaultMatches: false });
  const isDesktop = hasMounted && isDesktopMedia;
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        px: 1.5,
        py: 2,
        overflow: 'auto',
      }}
    >
      <AllocationTree />
      <QuotaStrip />
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowseFolderPathProvider folderPath={folderPath}>
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
          <AppBar
            position="fixed"
            color="default"
            elevation={0}
            sx={{
              zIndex: (t) => t.zIndex.drawer + 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Toolbar>
              {!isDesktop ? (
                <IconButton
                  edge="start"
                  aria-label="Open navigation"
                  onClick={() => setMobileOpen(true)}
                  sx={{ mr: 1 }}
                >
                  <MenuIcon />
                </IconButton>
              ) : null}
              <Box
                component={Link}
                href="/browse"
                sx={{
                  textDecoration: 'none',
                  color: 'inherit',
                  fontWeight: 650,
                  flexGrow: 1,
                  fontSize: '1.25rem',
                  lineHeight: 1.2,
                }}
              >
                Tra<span style={{ color: theme.palette.error.main }}>vo</span>rse
                <Typography component="span" variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                  CANFAR storage browser
                </Typography>
              </Box>
              <SignInOut />
            </Toolbar>
          </AppBar>

          <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }} aria-label="Folder navigation">
            {isDesktop ? (
              <Drawer
                variant="permanent"
                open
                sx={{
                  '& .MuiDrawer-paper': {
                    width: DRAWER_WIDTH,
                    boxSizing: 'border-box',
                    mt: '64px',
                    height: 'calc(100% - 64px)',
                  },
                }}
              >
                {drawer}
              </Drawer>
            ) : (
              <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                ModalProps={{ keepMounted: true }}
                sx={{
                  '& .MuiDrawer-paper': {
                    width: DRAWER_WIDTH,
                    boxSizing: 'border-box',
                    mt: '56px',
                    height: 'calc(100% - 56px)',
                  },
                }}
              >
                {drawer}
              </Drawer>
            )}
          </Box>

          <Box
            component="main"
            sx={{
              flexGrow: 1,
              width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
              px: { xs: 2, sm: 3 },
              py: 3,
              mt: { xs: 7, sm: 8 },
              pb: 6,
            }}
          >
            <BrowseNavBar />
            <BrowseActionBar />
            {children}
            <UploadFab />
          </Box>
        </Box>
      </BrowseFolderPathProvider>
    </ThemeProvider>
  );
}
