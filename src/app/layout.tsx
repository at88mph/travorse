import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import type { Metadata } from 'next';
import { auth } from '@/auth';
import { Providers } from '@/components/providers';
import { VersionFooter } from '@/components/version-footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'Travorse',
  description: 'CANFAR VOSpace storage browser',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppRouterCacheProvider>
          <Providers session={session}>
            {children}
            <VersionFooter />
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
